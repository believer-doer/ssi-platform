# Veridity — SSI Platform

Veridity is a **multi-tenant verifiable credentials platform** built on open identity standards. It combines a governed control plane, a public OIDC4VCI / OIDC4VP protocol server, a holder wallet, and public-facing web surfaces — all in a single monorepo.

---

## Repository layout

```
ssi-platform/
├── veridity-backend/   Fastify API server, worker, SSI drivers, protocol engine
├── veridity-portal/    Next.js operator portal (control plane UI)
├── ssi-website/        Next.js public marketing / product website
└── ssi-wallet/         Expo (React Native) holder wallet — iOS & Android
```

---

## What Veridity does

Veridity lets organizations **issue**, **verify**, **trust**, and **govern** digital identity flows across tenants.

| Plane | Surface | Purpose |
|---|---|---|
| **Control plane** | `veridity-portal` + REST API | Tenant and issuer management, governance, trust, audit |
| **Protocol plane** | `veridity-backend` public endpoints | OIDC4VCI / OIDC4VP runtime for wallets and relying parties |
| **Holder surface** | `ssi-wallet` | Receive, store, and present credentials on mobile |
| **Public surface** | `ssi-website` | Product website, docs, and wallet download links |

---

## Sub-projects

### `veridity-backend` — Core backend

> **Stack:** Node.js · TypeScript · Fastify · MongoDB · Redis · pnpm workspaces

The heart of the platform. A pnpm monorepo split into `apps/` and `packages/`.

```
apps/
  api-server/     Fastify HTTP API (control plane + protocol plane)
  worker/         Background job executor for protocol flows and chain anchoring

packages/
  core/           Shared SSI contracts, DID, crypto, format helpers
  drivers/        internal · ethereum · bitcoin drivers
  modules/        HTTP route modules per business domain
  protocols/      OIDC4VCI / OIDC4VP flow helpers
  utils/          Queue, Redis, validation, encryption helpers
```

**Supported drivers:**

| Driver | Description |
|---|---|
| `internal` | Reference runtime — strongest coverage |
| `ethereum` | Hybrid chain-backed path with Hardhat local support |
| `bitcoin` | Confirmation-aware anchor path with `regtest` support |

**Supported credential formats:** `vc-jwt` · `sd-jwt-vc` · `vc-ldp` · `bbs-vc`

**Key public protocol endpoints** (all under `/v1/:driver/protocols/`):

```
OIDC4VCI
  GET  .well-known/openid-credential-issuer
  GET  .well-known/openid-configuration
  GET  jwks
  POST authorize
  POST token
  POST credential
  POST credential/deferred

OIDC4VP
  GET  .well-known/openid-configuration
  GET  jwks
  POST authorize
  GET  requests/:id
  POST callback
```

**Quick start:**

```bash
cd veridity-backend
cp .env.example .env        # fill in your values
pnpm install
pnpm -r build
pnpm --filter api-server dev   # API server on :4000
pnpm --filter @ssi/worker dev  # background worker
```

Or use Docker Compose:

```bash
docker compose -f docker-compose.dev.yml up
```

See [`veridity-backend/docs/`](./veridity-backend/docs/) for the full platform guide, protocol server guide, runtime setup, and testing guide.

---

### `veridity-portal` — Operator portal

> **Stack:** Next.js 15 · TypeScript · Tailwind CSS · pnpm

The control plane UI. Operators use it to manage tenants, issuers, verifiers, schemas, governance proposals, trust entries, revocation lists, and audit logs.

**Quick start:**

```bash
cd veridity-portal
cp .env.example .env        # set BACKEND_API_BASE_URL etc.
pnpm install
pnpm dev                    # runs on :3001
```

Key environment variables:

```env
BACKEND_API_BASE_URL=http://localhost:4000/v1
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/v1
CONTROL_PLANE_JWT_SECRET=change-me
AUTH_MODE=mock              # set to jwt for real auth
```

---

### `ssi-website` — Public website

> **Stack:** Next.js 15 · TypeScript · Tailwind CSS · pnpm

The public product website for Veridity. Covers platform overview, how it works, use cases, and wallet download links.

**Quick start:**

```bash
cd ssi-website
pnpm install
pnpm dev                    # runs on :3000
```

---

### `ssi-wallet` — Mobile holder wallet

> **Stack:** Expo 55 · React Native 0.83 · TypeScript · expo-router

A React Native holder wallet for iOS and Android. Covers the full holder-side SSI flow.

**Capabilities:**

- Receive credentials via QR code or deep link (OIDC4VCI)
- Secure on-device credential storage (`expo-secure-store`)
- Present credentials with explicit consent (OIDC4VP)
- Biometric unlock and local authentication
- Activity history
- Settings, security, and recovery

**Quick start:**

```bash
cd ssi-wallet
cp .env.example .env.local   # set backend URLs
pnpm install
pnpm start                   # Expo dev server

pnpm ios                     # run on iOS simulator
pnpm android                 # run on Android emulator
```

Default environment for local development:

```env
EXPO_PUBLIC_BACKEND_ORIGIN=http://localhost:4000
EXPO_PUBLIC_BACKEND_API_BASE_URL=http://localhost:4000/v1
EXPO_PUBLIC_BACKEND_DRIVER=internal
```

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20 or later |
| pnpm | 10 or later |
| MongoDB | 7 or later (for `veridity-backend`) |
| Redis | 7 or later (optional — falls back to in-process queue) |
| Docker + Docker Compose | Optional, for full local stack |
| Expo CLI | For running `ssi-wallet` |

---

## Running the full local stack

The fastest way to run everything locally:

```bash
# 1. Start the backend (API + worker + MongoDB + Redis + optional chain nodes)
cd veridity-backend
docker compose -f docker-compose.dev.yml up

# 2. Start the portal
cd veridity-portal
pnpm install && pnpm dev

# 3. Start the website
cd ssi-website
pnpm install && pnpm dev

# 4. Start the wallet
cd ssi-wallet
pnpm install && pnpm start
```

---

## Architecture overview

```
Wallets / Clients
    |
    |  OIDC4VCI / OIDC4VP
    v
Protocol Server  (veridity-backend — public endpoints)
    - credential issuance and deferred flows
    - presentation requests and callbacks
    - token, JWKS, nonce, proof validation
    - rate limiting and replay protection
    |
    v
Core Platform Backend  (veridity-backend — control plane)
    - multi-tenant isolation
    - credential issuance and verification engine
    - revocation and status
    - session management
    |
    v
Trust and Governance Layer
    - trust registry
    - governance proposals and approval workflows
    - lifecycle management (active / suspended / revoked)
    - tenant policies
    |
    v
Control Plane UI  (veridity-portal)
    - tenant, issuer, verifier, schema, template management
    - governance, trust, revocation
    - audit and monitoring
```

---

## Standards and interoperability

| Standard | Status |
|---|---|
| OIDC4VCI | ✅ Baseline implemented |
| OIDC4VP | ✅ Baseline implemented |
| SIOPv2 | 🔄 Partial |
| VC-JWT | ✅ Supported |
| SD-JWT VC | ✅ Supported |
| VC-LDP (JSON-LD) | ✅ Supported |
| BBS+ VC | ✅ Supported |
| DID:ethr | ✅ Supported |
| DID:btcr (hybrid) | ✅ Supported |
| DIDComm v2 | 🔄 Planned |

---

## Security notes

- All secret values must be provided via environment variables — never hardcode them.
- Copy `.env.example` to `.env` in each sub-project and fill in real values before running.
- The `CONTROL_PLANE_JWT_SECRET` and all `*_KEY` / `*_SECRET` values in the backend `.env.example` are **development placeholders only**.
- For production, set `CONTROL_PLANE_AUTH_REQUIRED=true` and `CONTROL_PLANE_TENANT_REQUIRED=true`.

---

## Documentation

| Doc | Location |
|---|---|
| Platform guide | [`veridity-backend/docs/platform-guide.md`](./veridity-backend/docs/platform-guide.md) |
| Protocol server guide | [`veridity-backend/docs/protocol-server-guide.md`](./veridity-backend/docs/protocol-server-guide.md) |
| Runtime setup | [`veridity-backend/docs/runtime-setup.md`](./veridity-backend/docs/runtime-setup.md) |
| Testing guide | [`veridity-backend/docs/testing-guide.md`](./veridity-backend/docs/testing-guide.md) |
| OpenAPI spec | [`veridity-backend/docs/openapi.yml`](./veridity-backend/docs/openapi.yml) |
| Implementation backlog | [`veridity-backend/docs/implementation-backlog.md`](./veridity-backend/docs/implementation-backlog.md) |
| Platform capabilities | [`platform-capabilities.md`](./platform-capabilities.md) |
| Wallet roadmap | [`ssi-wallet/ssi-wallet-roadmap.md`](./ssi-wallet/ssi-wallet-roadmap.md) |

---

## License

Private repository. All rights reserved.
