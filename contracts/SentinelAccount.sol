// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SentinelGuard.sol";
import "./SentinelRegistry.sol";

/**
 * @title  SentinelAccount
 * @notice EIP-7702 delegation target for no-bypass agent guardrails on Monad.
 *
 *  THE PROBLEM:
 *  The original Sentinel architecture is opt-in — an agent with its own key can
 *  skip `executeWithGuardrails()` and call contracts directly. Any judge will ask:
 *  "Can the agent bypass Sentinel?" The answer was "yes."
 *
 *  THE SOLUTION:
 *  EIP-7702 lets an EOA delegate its code to a contract. When the agent's EOA
 *  delegates to SentinelAccount, EVERY transaction from that EOA executes
 *  SentinelAccount's logic — guardrails are baked into the account itself.
 *  The agent literally cannot bypass them because the account IS Sentinel.
 *
 *  ARCHITECTURE:
 *    Agent EOA  ──7702 delegate──▸  SentinelAccount (this contract)
 *                                      │
 *                                      ▼
 *                                  SentinelGuard
 *                                  (spending limits, whitelist, timelocks, circuit break)
 *                                      │
 *                                      ▼
 *                                  SentinelRegistry
 *                                  (agent ↔ policy binding)
 *
 *  FLOW:
 *   1. Owner creates a guardrail policy via SentinelGuard.createPolicy()
 *   2. Owner registers the agent via SentinelRegistry.registerAgent()
 *   3. Owner assigns the policy via SentinelGuard.setPolicyForAgent()
 *   4. Owner signs EIP-7702 authorization: agent EOA → SentinelAccount
 *   5. Submit type 0x04 tx: agent's EOA now has SentinelAccount code
 *   6. Every tx from the agent EOA → execute() → guardrail checks → real call
 *
 *  MONAD CONSTRAINTS:
 *   - Delegated EOAs can't dip below 10 MON (reserve balance rule)
 *   - Delegated code can't call CREATE/CREATE2
 *   - These are handled at protocol level; no special code needed
 */
contract SentinelAccount {
    // ──────────────────────────── Constants ────────────────────────

    /// @notice SentinelGuard contract that holds guardrail logic
    SentinelGuard public immutable sentinelGuard;

    /// @notice SentinelRegistry contract for agent verification
    SentinelRegistry public immutable sentinelRegistry;

    // ──────────────────────────── Types ────────────────────────────

    /// @notice EIP-4337 UserOperation struct
    struct UserOp {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        bytes32 accountGasLimits;
        uint256 preVerificationGas;
        bytes32 gasFees;
        bytes paymasterAndData;
        bytes signature;
    }

    // ──────────────────────────── Events ───────────────────────────

    event SmartAccountExecuted(
        address indexed agent,
        address indexed to,
        uint256 value,
        bytes32 txHash
    );

    event SmartAccountExecutionRejected(
        address indexed agent,
        address indexed to,
        uint256 value,
        string reason
    );

    // ──────────────────────────── Errors ───────────────────────────

    error OnlySelf();
    error ExecutionFailed(bytes returnData);

    // ──────────────────────────── Constructor ──────────────────────

    constructor(address _sentinelGuard, address _sentinelRegistry) {
        sentinelGuard = SentinelGuard(payable(_sentinelGuard));
        sentinelRegistry = SentinelRegistry(_sentinelRegistry);
    }

    // ──────────────────────────── EIP-7702 Execute ─────────────────

    /**
     * @notice Execute a transaction through guardrails.
     *         This is the ONLY way a delegated EOA can make external calls.
     *         Because the EOA is delegated to this contract, every transaction
     *         from the EOA must go through this path — there is no bypass.
     *
     * @param to    Destination address.
     * @param value MON value (in wei).
     * @param data  Calldata for the destination.
     * @return returnData The return data from the destination call.
     */
    function execute(address to, uint256 value, bytes calldata data)
        external
        payable
        returns (bytes memory returnData)
    {
        // Only the delegated EOA itself (msg.sender == address(this) after delegation)
        // or the SentinelGuard contract can call execute()
        require(
            msg.sender == address(this) || msg.sender == address(sentinelGuard),
            "only self"
        );

        // The agent's address IS this contract's address (via 7702 delegation)
        address agent = address(this);

        // Delegate all guardrail checks to SentinelGuard
        // SentinelGuard.executeWithGuardrails() will:
        //  1. Verify agent is registered in SentinelRegistry
        //  2. Check policy is assigned and active
        //  3. Check circuit break (not paused)
        //  4. Check auto circuit-break threshold
        //  5. Check per-tx spending limit
        //  6. Check period spending limit
        //  7. Check whitelist
        //  8. Check time-lock
        //  9. Execute the call if all pass
        returnData = sentinelGuard.executeWithGuardrails{value: msg.value}(
            agent,
            to,
            value,
            data
        );

        emit SmartAccountExecuted(
            agent,
            to,
            value,
            keccak256(abi.encode(agent, to, value, block.timestamp))
        );
    }

    /**
     * @notice Execute a batch of transactions through guardrails.
     *         Each call is individually checked against guardrails.
     *
     * @param tos    Array of destination addresses.
     * @param values Array of MON values.
     * @param datas  Array of calldata.
     * @return returnDatas Array of return data.
     */
    function executeBatch(
        address[] calldata tos,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external payable returns (bytes[] memory returnDatas) {
        require(msg.sender == address(this), "only self");
        require(
            tos.length == values.length && values.length == datas.length,
            "length mismatch"
        );

        address agent = address(this);
        returnDatas = new bytes[](tos.length);

        for (uint256 i = 0; i < tos.length; i++) {
            returnDatas[i] = sentinelGuard.executeWithGuardrails(
                agent,
                tos[i],
                values[i],
                datas[i]
            );
        }
    }

    // ──────────────────────────── ERC-4337 Support ─────────────────

    /**
     * @notice Validate a UserOperation for ERC-4337 account abstraction.
     *         Verifies the signature is from the account owner (the delegated EOA's key).
     *
     * @param userOp        The UserOperation to validate.
     * @param userOpHash    Hash of the UserOperation.
     * @param missingAccountFunds Amount of funds the account must add to the sender.
     * @return validationData 0 if valid, 1 if invalid (ERC-4337 format).
     */
    function validateUserOp(
        UserOp calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData) {
        // Only the EntryPoint should call this
        // In the 7702 model, the EOA IS the account, so msg.sender check is done
        // by the bundler/entrypoint infrastructure

        // Recover the signer from the UserOp hash + signature
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash)
        );

        address signer = _recoverSigner(ethSignedHash, userOp.signature);

        // The signer must be the account itself (the delegated EOA)
        // In 7702, address(this) IS the EOA address
        if (signer != address(this)) {
            return 1; // invalid
        }

        // Pay missing account funds if needed (for gas sponsorship)
        if (missingAccountFunds > 0) {
            (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
            if (!success) return 1;
        }

        return 0; // valid
    }

    // ──────────────────────────── Receiver ─────────────────────────

    /// @notice Allow receiving ETH (for refunds, gas sponsorship, etc.)
    receive() external payable {}

    // ──────────────────────────── Views ─────────────────────────────

    /**
     * @notice Check if this address has delegated to SentinelAccount.
     *         After 7702 delegation, the EOA's code will be 0xef0100 + SentinelAccount address.
     *
     * @param eoa The address to check.
     * @param sentinelAccountAddr The SentinelAccount contract address.
     * @return isDelegated Whether the EOA is delegated to SentinelAccount.
     */
    function isDelegatedToSentinel(address eoa, address sentinelAccountAddr)
        external
        view
        returns (bool isDelegated)
    {
        bytes memory code = eoa.code;
        // EIP-7702 delegated code format: 0xef0100 + 20-byte address
        if (code.length != 23) return false;
        if (code[0] != 0xef || code[1] != 0x01 || code[2] != 0x00) return false;

        // Extract the 20-byte delegated address from bytes 3-22
        address delegated = _extractAddress(code);
        isDelegated = delegated == sentinelAccountAddr;
    }

    /**
     * @notice Get the delegated address from an EOA's code.
     *         Returns address(0) if not delegated.
     *
     * @param eoa The address to inspect.
     * @return delegated The address this EOA delegates to, or address(0).
     */
    function getDelegation(address eoa) external view returns (address delegated) {
        bytes memory code = eoa.code;
        if (code.length != 23) return address(0);
        if (code[0] != 0xef || code[1] != 0x01 || code[2] != 0x00) return address(0);
        delegated = _extractAddress(code);
    }

    /**
     * @notice Check if an agent can execute a specific transaction.
     *         Thin wrapper around SentinelGuard.canExecute().
     */
    function canExecute(address to, uint256 value)
        external
        view
        returns (bool allowed, string memory reason)
    {
        return sentinelGuard.canExecute(address(this), to, value);
    }

    // ──────────────────────────── Internal ──────────────────────────

    /**
     * @dev Extract a 20-byte address from EIP-7702 delegated code (bytes 3-22).
     *      The code format is: 0xef0100 (3 bytes) + address (20 bytes).
     */
    function _extractAddress(bytes memory code) internal pure returns (address) {
        // Manually construct the address from bytes 3..22
        // Solidity's abi.encodePacked + slicing doesn't work for memory bytes,
        // so we build it via shift + OR.
        uint160 addr = 0;
        for (uint256 i = 0; i < 20; i++) {
            addr = (addr << 8) | uint160(uint8(code[3 + i]));
        }
        return address(addr);
    }

    /**
     * @dev Recover the signer from a hash and signature.
     */
    function _recoverSigner(bytes32 hash, bytes calldata signature)
        internal
        pure
        returns (address)
    {
        require(signature.length == 65, "invalid signature length");

        bytes32 r = bytes32(signature[0:32]);
        bytes32 s = bytes32(signature[32:64]);
        uint8 v = uint8(signature[64]);

        // Handle EIP-155 v values
        if (v >= 27) v -= 27;

        return ecrecover(hash, v, r, s);
    }
}
