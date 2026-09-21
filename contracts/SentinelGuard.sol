// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SentinelRegistry.sol";

/**
 * @title SentinelGuard
 * @notice Core guardrail engine for AI agents on Monad.
 *
 *  Users define on-chain guardrails BEFORE the agent can execute any transaction:
 *   - Spending limits  (max MON/token per tx or per time period)
 *   - Whitelists       (approved contract addresses)
 *   - Time-locks       (delay before large txs, user can cancel)
 *   - Circuit breaks   (emergency pause all agent activity)
 *
 *  The agent MUST call `executeWithGuardrails()` — if it tries to bypass, the tx reverts.
 */
contract SentinelGuard {
    // ──────────────────────────── Types ────────────────────────────

    struct Policy {
        address owner;                // policy creator
        uint256 maxSpendPerTx;        // max wei per single transaction
        uint256 maxSpendPerPeriod;    // max wei per time period
        uint256 periodDuration;       // duration of spending period (seconds)
        uint256 timeLockDuration;     // seconds to wait before large tx executes
        uint256 timeLockThreshold;    // txs above this amount are time-locked
        uint256 circuitBreakThreshold; // auto-pause if single tx exceeds this
        address[] whitelist;          // approved contract addresses
        bool    active;
    }

    struct AgentPolicy {
        uint256 policyId;
        bool    paused;               // circuit-break: manually paused
        uint256 spentInPeriod;        // amount spent in current period
        uint256 periodStart;          // start of current spending period
    }

    struct TimeLockRequest {
        address agent;
        address to;
        uint256 value;
        bytes   data;
        uint256 executeAfter;         // block.timestamp + timeLockDuration
        bool    executed;
        bool    cancelled;
    }

    // ──────────────────────────── State ────────────────────────────

    SentinelRegistry public immutable registry;

    /// @notice policyId → Policy
    mapping(uint256 => Policy) public policies;
    uint256 public nextPolicyId = 1;

    /// @notice agent address → assigned policy info
    mapping(address => AgentPolicy) public agentPolicies;

    /// @notice timeLockId → TimeLockRequest
    mapping(uint256 => TimeLockRequest) public timeLockRequests;
    uint256 public nextTimeLockId = 1;

    /// @notice policyId → whitelisted address → bool
    mapping(uint256 => mapping(address => bool)) public isWhitelisted;

    // ──────────────────────────── Events ───────────────────────────

    event PolicyCreated(
        uint256 indexed policyId,
        address indexed owner,
        uint256 maxSpendPerTx,
        uint256 maxSpendPerPeriod,
        uint256 timeLockDuration,
        uint256 circuitBreakThreshold
    );

    event PolicyAssigned(address indexed agent, uint256 indexed policyId);
    event PolicyRevoked(address indexed agent);

    event AgentPaused(address indexed agent, string reason);
    event AgentUnpaused(address indexed agent);

    event TransactionExecuted(
        address indexed agent,
        address indexed to,
        uint256 value,
        bytes32 txHash
    );

    event TransactionRejected(
        address indexed agent,
        address indexed to,
        uint256 value,
        string  reason
    );

    event TimeLockQueued(
        uint256 indexed timeLockId,
        address indexed agent,
        address to,
        uint256 value,
        uint256 executeAfter
    );

    event TimeLockExecuted(uint256 indexed timeLockId);
    event TimeLockCancelled(uint256 indexed timeLockId);

    event CircuitBreakTriggered(address indexed agent, uint256 value, uint256 threshold);

    // ──────────────────────────── Errors ───────────────────────────

    error NotAgentOwner(address caller, address agent);
    error AgentNotRegistered(address agent);
    error AgentIsPaused(address agent);
    error AgentNotPaused(address agent);
    error NoPolicyAssigned(address agent);
    error PolicyNotActive(uint256 policyId);
    error SpendLimitExceeded(uint256 amount, uint256 limit);
    error PeriodSpendLimitExceeded(uint256 spent, uint256 limit);
    error NotWhitelisted(address target, uint256 policyId);
    error TimeLockNotReady(uint256 timeLockId, uint256 readyAt);
    error TimeLockAlreadyProcessed(uint256 timeLockId);
    error InvalidTimeLockRequest(uint256 timeLockId);
    error AgentNotOwner(address caller, address agent);
    error Reentrancy();
    error ExecutionFailed(bytes returnData);

    // ──────────────────────────── Modifiers ────────────────────────

    bool private _locked;
    modifier nonReentrant() {
        require(!_locked, "Reentrancy");
        _locked = true;
        _;
        _locked = false;
    }

    modifier onlyPolicyOwner(uint256 policyId) {
        if (policies[policyId].owner != msg.sender) {
            revert NotAgentOwner(msg.sender, address(0));
        }
        _;
    }

    // ──────────────────────────── Constructor ──────────────────────

    constructor(address _registry) {
        registry = SentinelRegistry(_registry);
    }

    /// @notice Allow the contract to receive ETH (for funding agent executions).
    receive() external payable {}

    // ──────────────────────────── Policy Management ────────────────

    /**
     * @notice Create a new guardrail policy.
     * @return policyId The ID of the newly created policy.
     */
    function createPolicy(
        uint256   maxSpendPerTx,
        uint256   maxSpendPerPeriod,
        uint256   periodDuration,
        uint256   timeLockDuration,
        uint256   timeLockThreshold,
        uint256   circuitBreakThreshold,
        address[] calldata whitelist
    ) external returns (uint256 policyId) {
        policyId = nextPolicyId++;

        Policy storage p = policies[policyId];
        p.owner                 = msg.sender;
        p.maxSpendPerTx         = maxSpendPerTx;
        p.maxSpendPerPeriod     = maxSpendPerPeriod;
        p.periodDuration        = periodDuration;
        p.timeLockDuration      = timeLockDuration;
        p.timeLockThreshold     = timeLockThreshold;
        p.circuitBreakThreshold = circuitBreakThreshold;
        p.active                = true;

        for (uint256 i = 0; i < whitelist.length; i++) {
            p.whitelist.push(whitelist[i]);
            isWhitelisted[policyId][whitelist[i]] = true;
        }

        emit PolicyCreated(
            policyId, msg.sender, maxSpendPerTx, maxSpendPerPeriod,
            timeLockDuration, circuitBreakThreshold
        );
    }

    /**
     * @notice Add an address to a policy's whitelist.
     */
    function addToWhitelist(uint256 policyId, address target)
        external
        onlyPolicyOwner(policyId)
    {
        if (!isWhitelisted[policyId][target]) {
            policies[policyId].whitelist.push(target);
            isWhitelisted[policyId][target] = true;
        }
    }

    /**
     * @notice Remove an address from a policy's whitelist.
     */
    function removeFromWhitelist(uint256 policyId, address target)
        external
        onlyPolicyOwner(policyId)
    {
        isWhitelisted[policyId][target] = false;
        // Note: we don't shrink the array to avoid gas; the bool mapping is authoritative
    }

    /**
     * @notice Deactivate a policy.
     */
    function deactivatePolicy(uint256 policyId)
        external
        onlyPolicyOwner(policyId)
    {
        policies[policyId].active = false;
    }

    // ──────────────────────────── Agent ↔ Policy Binding ───────────

    /**
     * @notice Assign a policy to an agent. Only the policy owner or agent owner can do this.
     */
    function setPolicyForAgent(address agent, uint256 policyId) external {
        Policy storage p = policies[policyId];
        if (!p.active) revert PolicyNotActive(policyId);
        // Either the policy owner or the agent's registered owner can assign
        if (msg.sender != p.owner) {
            SentinelRegistry.AgentInfo memory info = registry.getAgent(agent);
            if (info.owner != msg.sender) revert NotAgentOwner(msg.sender, agent);
        }

        agentPolicies[agent] = AgentPolicy({
            policyId:       policyId,
            paused:         false,
            spentInPeriod:  0,
            periodStart:    block.timestamp
        });

        emit PolicyAssigned(agent, policyId);
    }

    /**
     * @notice Remove policy from an agent (policy owner only).
     */
    function revokePolicyForAgent(address agent) external {
        AgentPolicy memory ap = agentPolicies[agent];
        if (ap.policyId == 0) revert NoPolicyAssigned(agent);
        if (policies[ap.policyId].owner != msg.sender) {
            revert NotAgentOwner(msg.sender, agent);
        }
        delete agentPolicies[agent];
        emit PolicyRevoked(agent);
    }

    // ──────────────────────────── Circuit Break ────────────────────

    /**
     * @notice Emergency pause an agent. Callable by the policy owner.
     */
    function pauseAgent(address agent) external {
        AgentPolicy storage ap = agentPolicies[agent];
        if (ap.policyId == 0) revert NoPolicyAssigned(agent);
        if (policies[ap.policyId].owner != msg.sender) {
            revert NotAgentOwner(msg.sender, agent);
        }
        ap.paused = true;
        emit AgentPaused(agent, "manual_pause");
    }

    /**
     * @notice Unpause an agent. Callable by the policy owner.
     */
    function unpauseAgent(address agent) external {
        AgentPolicy storage ap = agentPolicies[agent];
        if (ap.policyId == 0) revert NoPolicyAssigned(agent);
        if (!ap.paused) revert AgentNotPaused(agent);
        if (policies[ap.policyId].owner != msg.sender) {
            revert NotAgentOwner(msg.sender, agent);
        }
        ap.paused = false;
        emit AgentUnpaused(agent);
    }

    // ──────────────────────────── Execute with Guardrails ──────────

    /**
     * @notice The ONLY way an agent can execute a transaction.
     *         Checks: circuit break, spending limits, whitelist, time-lock.
     * @param agent The agent address executing.
     * @param to    Destination address.
     * @param value MON value (in wei).
     * @param data  Calldata.
     */
    function executeWithGuardrails(
        address agent,
        address to,
        uint256 value,
        bytes calldata data
    ) external payable nonReentrant returns (bytes memory) {
        // 1. Verify agent is registered
        SentinelRegistry.AgentInfo memory info = registry.getAgent(agent);
        if (info.owner == address(0)) revert AgentNotRegistered(agent);

        // 2. Check policy assigned
        AgentPolicy storage ap = agentPolicies[agent];
        if (ap.policyId == 0) revert NoPolicyAssigned(agent);
        Policy storage p = policies[ap.policyId];
        if (!p.active) revert PolicyNotActive(ap.policyId);

        // 3. Circuit break check
        if (ap.paused) revert AgentIsPaused(agent);

        // 4. Auto circuit-break: if single tx exceeds threshold, pause agent
        if (p.circuitBreakThreshold > 0 && value > p.circuitBreakThreshold) {
            ap.paused = true;
            emit CircuitBreakTriggered(agent, value, p.circuitBreakThreshold);
            emit AgentPaused(agent, "circuit_break_threshold_exceeded");
            revert SpendLimitExceeded(value, p.circuitBreakThreshold);
        }

        // 5. Per-tx spending limit
        if (p.maxSpendPerTx > 0 && value > p.maxSpendPerTx) {
            emit TransactionRejected(agent, to, value, "per_tx_limit");
            revert SpendLimitExceeded(value, p.maxSpendPerTx);
        }

        // 6. Period spending limit — reset period if expired
        if (p.periodDuration > 0) {
            if (block.timestamp >= ap.periodStart + p.periodDuration) {
                ap.spentInPeriod = 0;
                ap.periodStart   = block.timestamp;
            }
            if (p.maxSpendPerPeriod > 0) {
                uint256 newTotal = ap.spentInPeriod + value;
                if (newTotal > p.maxSpendPerPeriod) {
                    emit TransactionRejected(agent, to, value, "period_limit");
                    revert PeriodSpendLimitExceeded(newTotal, p.maxSpendPerPeriod);
                }
                ap.spentInPeriod = newTotal;
            }
        }

        // 7. Whitelist check (if whitelist is non-empty)
        if (p.whitelist.length > 0 && !isWhitelisted[ap.policyId][to]) {
            emit TransactionRejected(agent, to, value, "not_whitelisted");
            revert NotWhitelisted(to, ap.policyId);
        }

        // 8. Time-lock check
        if (p.timeLockDuration > 0 && value >= p.timeLockThreshold) {
            // Must go through time-lock queue
            revert SpendLimitExceeded(value, p.timeLockThreshold); // signal: use queueTimeLock instead
        }

        // 9. Execute
        (bool success, bytes memory returnData) = to.call{value: value}(data);
        if (!success) {
            revert ExecutionFailed(returnData);
        }

        emit TransactionExecuted(agent, to, value, keccak256(abi.encode(agent, to, value, block.timestamp)));

        return returnData;
    }

    // ──────────────────────────── Time-Lock Queue ──────────────────

    /**
     * @notice Queue a transaction that exceeds the time-lock threshold.
     *         The transaction will be executable only after `timeLockDuration` has passed.
     *         During the lock window, the policy owner can cancel.
     */
    function queueTimeLock(
        address agent,
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (uint256 timeLockId) {
        AgentPolicy storage ap = agentPolicies[agent];
        if (ap.policyId == 0) revert NoPolicyAssigned(agent);
        Policy storage p = policies[ap.policyId];
        if (!p.active) revert PolicyNotActive(ap.policyId);
        if (ap.paused) revert AgentIsPaused(agent);
        if (p.timeLockDuration == 0) revert PolicyNotActive(ap.policyId);

        timeLockId = nextTimeLockId++;
        timeLockRequests[timeLockId] = TimeLockRequest({
            agent:        agent,
            to:           to,
            value:        value,
            data:         data,
            executeAfter: block.timestamp + p.timeLockDuration,
            executed:     false,
            cancelled:    false
        });

        emit TimeLockQueued(timeLockId, agent, to, value, block.timestamp + p.timeLockDuration);
    }

    /**
     * @notice Execute a time-locked transaction after the lock period.
     */
    function executeTimeLock(uint256 timeLockId) external nonReentrant returns (bytes memory) {
        TimeLockRequest storage req = timeLockRequests[timeLockId];
        if (req.executed || req.cancelled) revert TimeLockAlreadyProcessed(timeLockId);
        if (req.agent == address(0)) revert InvalidTimeLockRequest(timeLockId);
        if (block.timestamp < req.executeAfter) {
            revert TimeLockNotReady(timeLockId, req.executeAfter);
        }

        // Re-check circuit break
        AgentPolicy storage ap = agentPolicies[req.agent];
        if (ap.paused) revert AgentIsPaused(req.agent);

        req.executed = true;

        (bool success, bytes memory returnData) = req.to.call{value: req.value}(req.data);
        if (!success) revert ExecutionFailed(returnData);

        emit TimeLockExecuted(timeLockId);
        emit TransactionExecuted(req.agent, req.to, req.value, keccak256(abi.encode(timeLockId)));

        return returnData;
    }

    /**
     * @notice Cancel a pending time-locked transaction. Only the policy owner can cancel.
     */
    function cancelTimeLock(uint256 timeLockId) external {
        TimeLockRequest storage req = timeLockRequests[timeLockId];
        if (req.executed || req.cancelled) revert TimeLockAlreadyProcessed(timeLockId);
        if (req.agent == address(0)) revert InvalidTimeLockRequest(timeLockId);

        AgentPolicy storage ap = agentPolicies[req.agent];
        if (policies[ap.policyId].owner != msg.sender) {
            revert NotAgentOwner(msg.sender, req.agent);
        }

        req.cancelled = true;
        emit TimeLockCancelled(timeLockId);
    }

    // ──────────────────────────── Views ─────────────────────────────

    /**
     * @notice Check if an agent can execute a transaction of `value` wei right now.
     * @return allowed Whether the tx would pass all guardrail checks.
     * @return reason     Empty if OK, otherwise the rejection reason.
     */
    function canExecute(address agent, address to, uint256 value)
        external
        view
        returns (bool allowed, string memory reason)
    {
        SentinelRegistry.AgentInfo memory info = registry.getAgent(agent);
        if (info.owner == address(0)) return (false, "agent_not_registered");

        AgentPolicy memory ap = agentPolicies[agent];
        if (ap.policyId == 0)          return (false, "no_policy");
        Policy memory p = policies[ap.policyId];
        if (!p.active)                 return (false, "policy_inactive");
        if (ap.paused)                 return (false, "agent_paused");

        if (p.circuitBreakThreshold > 0 && value > p.circuitBreakThreshold)
            return (false, "circuit_break_threshold");
        if (p.maxSpendPerTx > 0 && value > p.maxSpendPerTx)
            return (false, "per_tx_limit");

        if (p.periodDuration > 0 && p.maxSpendPerPeriod > 0) {
            uint256 spent = ap.spentInPeriod;
            if (block.timestamp >= ap.periodStart + p.periodDuration) spent = 0;
            if (spent + value > p.maxSpendPerPeriod)
                return (false, "period_limit");
        }

        if (p.whitelist.length > 0 && !isWhitelisted[ap.policyId][to])
            return (false, "not_whitelisted");

        return (true, "");
    }

    /**
     * @notice Get a policy by ID.
     */
    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        return policies[policyId];
    }

    /**
     * @notice Get the whitelist for a policy.
     */
    function getWhitelist(uint256 policyId) external view returns (address[] memory) {
        return policies[policyId].whitelist;
    }

    /**
     * @notice Get a time-lock request.
     */
    function getTimeLockRequest(uint256 timeLockId) external view returns (TimeLockRequest memory) {
        return timeLockRequests[timeLockId];
    }
}
