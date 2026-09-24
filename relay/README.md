# Sentinel7702 Relay Server

This relay server handles EIP-7702 delegation for Sentinel agents. It allows seamless "Make Agent Unbypassable" functionality without requiring users to have wallets that support EIP-7702 natively.

## Quick Start

```bash
# Start the relay server
./start-relay.bat

# Or manually:
npm install
node server.cjs
```

The server runs on `http://localhost:3001` by default.

## API Endpoints

### POST /api/delegate

Add or remove EIP-7702 delegation for an agent.

**Request Body:**
```json
{
  "agentAddress": "0x2ca51d0cfcfdce3bbf3d345b45ffa056d55b2f96",
  "remove": false  // Set to true to remove delegation
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0xf04ea66ad78146a50fff03f55f4595dbd2866a3309c5239fcf8f0e649820007a",
  "explorer": "https://testnet.monadexplorer.com/tx/0xf04ea...",
  "message": "Agent is now unbypassable via EIP-7702"
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "sentinelAccount": "0xe506D4ad79358b09e7892eb0126dA6EB0608dF6c"
}
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `RELAYER_KEY` - Private key for the relayer account
- `SENTINEL_ACCOUNT` - SentinelAccount contract address

## How It Works

1. User clicks "Make Agent Unbypassable" in the Sentinel frontend
2. Frontend calls `/api/delegate` with the agent's address
3. Relay server signs an EIP-7702 authorization
4. Relay server submits the7702 transaction to Monad Testnet
5. Agent's EOA now delegates to SentinelAccount contract
6. All transactions go through Sentinel's guardrail checks

## Demo Usage

For hackathon demos, start the relay server before showing the7702 delegation flow:

```bash
# Terminal 1: Start relay server
cd relay && ./start-relay.bat

# Terminal 2: Start frontend
cd frontend && npm run dev
```

The frontend will automatically call `http://localhost:3001/api/delegate` when the user clicks "Make Agent Unbypassable".

## Production Deployment

For production, deploy the relay server to a hosting service (Railway, Render, etc.) and update the frontend's `VITE_RELAY_URL` environment variable to point to the production URL.

Alternatively, use the Vercel serverless function at `/api/delegate` (included in the `api/` directory).