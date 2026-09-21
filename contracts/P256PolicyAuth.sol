// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  P256PolicyAuth
 * @notice Verify WebAuthn / P256 signatures for policy changes on Monad.
 *
 *  Monad provides a native P256 precompile at address 0x0000000000000000000000000000000000000100
 *  (EIP-7212 standard). This contract lets users authorize policy updates via passkey
 *  (WebAuthn) instead of seed phrases — a better UX for non-crypto-native users.
 *
 *  Flow:
 *   1. User registers a passkey public key (x, y) with their Sentinel account.
 *   2. When updating a policy, the user signs the policy hash with their passkey.
 *   3. Frontend constructs a WebAuthn authenticator data + clientDataJSON payload.
 *   4. This contract verifies the P256 signature against the registered public key
 *      using the Monad P256 precompile.
 *   5. If valid, the policy update is authorized.
 */
contract P256PolicyAuth {
    // ──────────────────────────── Constants ────────────────────────

    /// @notice Monad P256 precompile address (EIP-7212).
    address constant P256_PRECOMPILE = address(0x100);

    // ──────────────────────────── Types ────────────────────────────

    struct PasskeyInfo {
        bytes32 x;          // P256 public key x-coordinate (big-endian, 32 bytes)
        bytes32 y;          // P256 public key y-coordinate (big-endian, 32 bytes)
        uint256 addedAt;
        bool    active;
    }

    // ──────────────────────────── State ────────────────────────────

    /// @notice User address → passkey ID → PasskeyInfo
    ///         passkeyId is keccak256(credentialId)
    mapping(address => mapping(bytes32 => PasskeyInfo)) public passkeys;

    /// @notice User address → list of active passkey IDs
    mapping(address => bytes32[]) public userPasskeyIds;

    /// @notice SentinelGuard contract address
    address public sentinelGuard;

    // ──────────────────────────── Events ───────────────────────────

    event PasskeyRegistered(
        address indexed user,
        bytes32 indexed passkeyId,
        bytes32 x,
        bytes32 y,
        uint256 timestamp
    );

    event PasskeyRemoved(
        address indexed user,
        bytes32 indexed passkeyId,
        uint256 timestamp
    );

    event PolicyChangeAuthorized(
        address indexed user,
        bytes32 indexed policyHash,
        bytes32 indexed passkeyId,
        uint256 timestamp
    );

    // ──────────────────────────── Errors ───────────────────────────

    error PasskeyAlreadyRegistered(bytes32 passkeyId);
    error PasskeyNotFound(bytes32 passkeyId);
    error SignatureVerificationFailed();
    error P256PrecompileFailed();
    error ZeroAddress();

    // ──────────────────────────── Constructor ──────────────────────

    constructor(address _sentinelGuard) {
        sentinelGuard = _sentinelGuard;
    }

    // ──────────────────────────── Passkey Management ───────────────

    /**
     * @notice Register a new passkey (WebAuthn public key) for the caller.
     * @param credentialId The WebAuthn credential ID (hashed to passkeyId).
     * @param x            P256 public key x-coordinate (32 bytes, big-endian).
     * @param y            P256 public key y-coordinate (32 bytes, big-endian).
     */
    function registerPasskey(
        bytes32 credentialId,
        bytes32 x,
        bytes32 y
    ) external {
        bytes32 passkeyId = keccak256(abi.encodePacked(credentialId));
        if (passkeys[msg.sender][passkeyId].active) {
            revert PasskeyAlreadyRegistered(passkeyId);
        }

        passkeys[msg.sender][passkeyId] = PasskeyInfo({
            x:        x,
            y:        y,
            addedAt:  block.timestamp,
            active:   true
        });

        userPasskeyIds[msg.sender].push(passkeyId);

        emit PasskeyRegistered(msg.sender, passkeyId, x, y, block.timestamp);
    }

    /**
     * @notice Remove a passkey.
     */
    function removePasskey(bytes32 credentialId) external {
        bytes32 passkeyId = keccak256(abi.encodePacked(credentialId));
        if (!passkeys[msg.sender][passkeyId].active) revert PasskeyNotFound(passkeyId);

        passkeys[msg.sender][passkeyId].active = false;
        emit PasskeyRemoved(msg.sender, passkeyId, block.timestamp);
    }

    // ──────────────────────────── Policy Authorization ─────────────

    /**
     * @notice Authorize a policy change by verifying a P256 (WebAuthn) signature.
     *
     *  The signed message is: keccak256(abi.encodePacked(user, policyHash, nonce, timestamp))
     *  where nonce and timestamp prevent replay attacks.
     *
     * @param credentialId  The WebAuthn credential ID.
     * @param policyHash    The keccak256 of the new policy being authorized.
     * @param signature     P256 signature (r, s) — 64 bytes total (r || s, each 32 bytes).
     * @param nonce         Replay-protection nonce.
     * @param timestamp     Timestamp included in the signed message.
     */
    function authorizePolicyChange(
        bytes32 credentialId,
        bytes32 policyHash,
        bytes calldata signature,
        uint256 nonce,
        uint256 timestamp
    ) external returns (bool) {
        bytes32 passkeyId = keccak256(abi.encodePacked(credentialId));
        PasskeyInfo memory pk = passkeys[msg.sender][passkeyId];
        if (!pk.active) revert PasskeyNotFound(passkeyId);

        // Reconstruct the message that was signed
        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, policyHash, nonce, timestamp)
        );

        // Verify P256 signature using Monad precompile
        bool verified = _verifyP256Signature(
            messageHash,
            signature,
            pk.x,
            pk.y
        );

        if (!verified) revert SignatureVerificationFailed();

        emit PolicyChangeAuthorized(msg.sender, policyHash, passkeyId, block.timestamp);
        return true;
    }

    /**
     * @notice Verify that a passkey holder authorized a specific policy.
     *         Callable as a view by the SentinelGuard contract.
     */
    function isAuthorized(
        address user,
        bytes32 credentialId,
        bytes32 policyHash,
        bytes calldata signature,
        uint256 nonce,
        uint256 timestamp
    ) external view returns (bool) {
        bytes32 passkeyId = keccak256(abi.encodePacked(credentialId));
        PasskeyInfo memory pk = passkeys[user][passkeyId];
        if (!pk.active) return false;

        bytes32 messageHash = keccak256(
            abi.encodePacked(user, policyHash, nonce, timestamp)
        );

        return _verifyP256Signature(messageHash, signature, pk.x, pk.y);
    }

    // ──────────────────────────── Views ─────────────────────────────

    /**
     * @notice Get all active passkey IDs for a user.
     */
    function getUserPasskeys(address user) external view returns (bytes32[] memory) {
        return userPasskeyIds[user];
    }

    /**
     * @notice Get passkey info.
     */
    function getPasskey(address user, bytes32 credentialId)
        external
        view
        returns (PasskeyInfo memory)
    {
        bytes32 passkeyId = keccak256(abi.encodePacked(credentialId));
        return passkeys[user][passkeyId];
    }

    // ──────────────────────────── Internal ──────────────────────────

    /**
     * @dev Call the Monad P256 precompile to verify a signature.
     *
     *  Precompile input:  messageHash (32 bytes) + r (32 bytes) + s (32 bytes)
     *                    + x (32 bytes) + y (32 bytes)  = 160 bytes
     *  Precompile output: 1 (valid) or 0 (invalid), or empty on failure.
     */
    function _verifyP256Signature(
        bytes32 messageHash,
        bytes calldata signature,
        bytes32 x,
        bytes32 y
    ) internal view returns (bool) {
        // Signature must be 64 bytes: r (32) || s (32)
        require(signature.length == 64, "invalid signature length");

        // Build precompile input: hash || r || s || x || y
        bytes memory input = abi.encodePacked(
            messageHash,
            signature[0:32],   // r
            signature[32:64],  // s
            x,
            y
        );

        (bool success, bytes memory output) = P256_PRECOMPILE.staticcall(input);

        // Precompile returns 1 byte: 0x01 for valid, 0x00 for invalid
        // If precompile doesn't exist or fails, output will be empty
        if (!success || output.length == 0) return false;

        // Check the result byte
        return output.length >= 1 && output[0] == 0x01;
    }
}
