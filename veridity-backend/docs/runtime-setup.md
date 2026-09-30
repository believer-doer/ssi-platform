<p align="center">
  <img src="./assets/veridity-logo.svg" alt="Veridity" width="760" />
</p>

# Veridity Runtime Setup

This guide explains how to run the platform after the Phase 4 protocol and security upgrades.

## Runtime layers

### Base services
You will typically want:

- MongoDB
- Redis
- API server
- Worker

### Optional chain-backed services
Depending on the driver you want to exercise:

- local Ethereum node / Hardhat stack
- local Bitcoin `regtest` node

## Basic local startup

### Install dependencies

```bash
pnpm install
```

### Start the base infra

```bash
docker compose up -d mongo redis
```

### Start the app services

```bash
pnpm --filter @ssi/api-server dev
pnpm --filter @ssi/worker dev
```

## Control-plane settings

Recommended local secure mode:

```env
CONTROL_PLANE_AUTH_REQUIRED=true
CONTROL_PLANE_TENANT_REQUIRED=true
CONTROL_PLANE_JWT_SECRET=change-me
```

For fast local experimentation you can temporarily relax those flags, but keep in mind that your flow-testing results will then no longer represent production posture.

## Public protocol settings

The public protocol layer now has a few settings that matter operationally even in local runs.

Recommended baseline values:

```env
PROTOCOL_BASE_URL=http://localhost:4000
PROTOCOL_ACCESS_TOKEN_TTL_SECONDS=900
PROTOCOL_NONCE_TTL_SECONDS=300
PROTOCOL_PUBLIC_RATE_LIMIT_WINDOW_SECONDS=60
PROTOCOL_PUBLIC_RATE_LIMIT_MAX=120
```

If your concrete `.env` schema uses slightly different names, map them to the same operational intent:

- base origin used in discovery and callback URLs
- access-token TTL
- nonce TTL
- public rate-limit window
- public rate-limit burst limit

## JWT and JWKS expectations

Phase 4 assumes a JWT-based access-token model for the public issuer flow.

Operationally you should verify that the runtime has:

- a stable signing key at startup
- a `kid` exposed through JWKS
- the ability to publish more than one public key during rotation
- environment-specific secrets or private keys, not hard-coded development defaults

## Ethereum local flow

Use the Ethereum flow when you want chain-backed hybrid behavior with the smoother local setup.

Typical startup:

```bash
docker compose --profile ethereum up -d mongo redis
pnpm hardhat node
pnpm --filter @ssi/api-server dev
pnpm --filter @ssi/worker dev
```

Then run:

```bash
./flow-testing-scripts/ethereum-hybrid-flows.sh
```

## Bitcoin local flow

Use the Bitcoin flow when you want confirmation-aware hybrid testing.

### Docker profile

```bash
docker compose --profile bitcoin up -d mongo redis bitcoin-node
```

Create or load the wallet:

```bash
docker compose exec bitcoin-node bitcoin-cli -regtest -rpcuser=user -rpcpassword=password createwallet "ssi_platform_wallet"
docker compose exec bitcoin-node bitcoin-cli -regtest -rpcuser=user -rpcpassword=password loadwallet "ssi_platform_wallet"
```

Example `.env` values:

```env
ENABLE_BITCOIN=true
BTC_NODE_URL=http://user:password@bitcoin-node:18443
BTC_WALLET_NAME=ssi_platform_wallet
BTC_NETWORK=regtest
```

Then run:

```bash
./flow-testing-scripts/bitcoin-hybrid-flows.sh
```

The shared flow helper can auto-fund and auto-mine on `regtest` when configured to do so.

## Public protocol smoke checks

After the API server is live, run:

```bash
./flow-testing-scripts/public-protocol-smoke.sh
```

That script checks discovery, JWKS, authorization, token, and request retrieval paths without needing a full wallet implementation.

## Recommended validation order after startup

1. `GET /v1/system/health`
2. run one driver flow script
3. run `public-protocol-smoke.sh`
4. inspect audit output
5. try negative-path calls manually or through your own test harness

## Where to go next

- [`testing-guide.md`](./testing-guide.md) for the detailed test matrix and script order
- [`protocol-server-guide.md`](./protocol-server-guide.md) for the public OIDC routes
- [`implementation-backlog.md`](./implementation-backlog.md) for what remains after Phase 4
