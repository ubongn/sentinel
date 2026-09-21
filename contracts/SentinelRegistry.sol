// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SentinelRegistry
 * @notice ERC-8004 compliant trustless agent registry for Monad.
 *         Each agent registers on-chain with its guardrail policy hash attached.
 *         Any app can verify an agent's guardrails by querying this registry.
 */
contract SentinelRegistry {
    // ──────────────────────────── Types ────────────────────────────

    struct AgentInfo {
        address owner;           // who registered the agent
        bytes32 policyHash;      // keccak256 of the agent's guardrail policy
        uint256 registeredAt;    // block.timestamp
        uint256 updatedAt;       // last policy update
        bool    active;          // soft-delete flag
        string  metadata;        // optional JSON metadata (name, description, etc.)
    }

    // ──────────────────────────── State ────────────────────────────

    /// @notice agent address → info
    mapping(address => AgentInfo) public agents;

    /// @notice owner → list of agent addresses they own
    mapping(address => address[]) public ownerAgents;

    /// @notice All registered agent addresses (enumerable)
    address[] public allAgents;

    /// @notice agent address → index in allAgents + 1 (0 means not registered)
    mapping(address => uint256) private _agentIndex;

    // ──────────────────────────── Events ───────────────────────────

    event AgentRegistered(
        address indexed agent,
        address indexed owner,
        bytes32 policyHash,
        string  metadata,
        uint256 timestamp
    );

    event AgentPolicyUpdated(
        address indexed agent,
        bytes32 oldPolicyHash,
        bytes32 newPolicyHash,
        uint256 timestamp
    );

    event AgentDeactivated(
        address indexed agent,
        uint256 timestamp
    );

    event AgentReactivated(
        address indexed agent,
        uint256 timestamp
    );

    // ──────────────────────────── Errors ───────────────────────────

    error AgentAlreadyRegistered(address agent);
    error AgentNotRegistered(address agent);
    error NotAgentOwner(address caller, address agent);
    error ZeroAddress();

    // ──────────────────────────── Modifiers ────────────────────────

    modifier onlyAgentOwner(address agent) {
        if (agents[agent].owner != msg.sender) {
            revert NotAgentOwner(msg.sender, agent);
        }
        _;
    }

    modifier agentExists(address agent) {
        if (agents[agent].owner == address(0)) {
            revert AgentNotRegistered(agent);
        }
        _;
    }

    // ──────────────────────────── External ─────────────────────────

    /**
     * @notice Register a new AI agent with its guardrail policy hash.
     * @param agent      The address of the AI agent (EOA or contract).
     * @param policyHash keccak256 of the agent's serialized guardrail policy.
     * @param metadata   Optional JSON string (name, description, capabilities).
     */
    function registerAgent(
        address agent,
        bytes32 policyHash,
        string calldata metadata
    ) external {
        if (agent == address(0)) revert ZeroAddress();
        if (agents[agent].owner != address(0)) {
            revert AgentAlreadyRegistered(agent);
        }

        agents[agent] = AgentInfo({
            owner:        msg.sender,
            policyHash:   policyHash,
            registeredAt: block.timestamp,
            updatedAt:    block.timestamp,
            active:       true,
            metadata:     metadata
        });

        ownerAgents[msg.sender].push(agent);
        _agentIndex[agent] = allAgents.length + 1; // 1-indexed
        allAgents.push(agent);

        emit AgentRegistered(agent, msg.sender, policyHash, metadata, block.timestamp);
    }

    /**
     * @notice Update an agent's guardrail policy hash.
     * @param agent         The agent address.
     * @param newPolicyHash New policy hash.
     */
    function updatePolicyHash(
        address agent,
        bytes32 newPolicyHash
    ) external onlyAgentOwner(agent) agentExists(agent) {
        bytes32 oldHash = agents[agent].policyHash;
        agents[agent].policyHash = newPolicyHash;
        agents[agent].updatedAt  = block.timestamp;

        emit AgentPolicyUpdated(agent, oldHash, newPolicyHash, block.timestamp);
    }

    /**
     * @notice Update agent metadata.
     */
    function updateMetadata(
        address agent,
        string calldata newMetadata
    ) external onlyAgentOwner(agent) agentExists(agent) {
        agents[agent].metadata  = newMetadata;
        agents[agent].updatedAt = block.timestamp;
    }

    /**
     * @notice Deactivate an agent (soft-delete).
     */
    function deactivateAgent(address agent)
        external
        onlyAgentOwner(agent)
        agentExists(agent)
    {
        agents[agent].active = false;
        emit AgentDeactivated(agent, block.timestamp);
    }

    /**
     * @notice Reactivate a previously deactivated agent.
     */
    function reactivateAgent(address agent)
        external
        onlyAgentOwner(agent)
        agentExists(agent)
    {
        agents[agent].active = true;
        emit AgentReactivated(agent, block.timestamp);
    }

    // ──────────────────────────── Views ─────────────────────────────

    /**
     * @notice Check if an address is a registered, active agent.
     */
    function isActiveAgent(address agent) external view returns (bool) {
        return agents[agent].owner != address(0) && agents[agent].active;
    }

    /**
     * @notice Get full agent info.
     */
    function getAgent(address agent) external view returns (AgentInfo memory) {
        return agents[agent];
    }

    /**
     * @notice Get all agents owned by an address.
     */
    function getOwnerAgents(address owner) external view returns (address[] memory) {
        return ownerAgents[owner];
    }

    /**
     * @notice Get total number of registered agents.
     */
    function getAgentCount() external view returns (uint256) {
        return allAgents.length;
    }

    /**
     * @notice Get a page of all agents.
     * @param offset Start index.
     * @param limit  Max agents to return.
     */
    function getAgentsPaginated(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory)
    {
        uint256 end = offset + limit;
        if (end > allAgents.length) end = allAgents.length;
        uint256 size = end - offset;
        address[] memory page = new address[](size);
        for (uint256 i = 0; i < size; i++) {
            page[i] = allAgents[offset + i];
        }
        return page;
    }
}
