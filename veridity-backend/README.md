<p align="center">
  <img src="./docs/assets/veridity-logo.svg" alt="Veridity" width="760" />
</p>

# Veridity SSI Platform

Veridity is a multi-tenant SSI backend that now combines two planes in the same monorepo:

- a **control plane** for tenant, issuer, verifier, wallet, schema, template, trust, governance, revocation, and audit operations
- a **public protocol plane** for baseline **OIDC4VCI** and **OIDC4VP** discovery and runtime exchanges

This repo is now in a good **production-candidate baseline** state after four implementation phases, but it should still be validated with interop, abuse, and negative-path testing before being treated as fully production-ready.

## Current capabilities

### Control plane

- tenant creation and policy application
- issuer, verifier, and wallet onboarding
- schema and template creation plus activation
- governance proposals with approve/reject/cancel/execute paths
- trust registry management
- revocation list creation and mutation
- credential issuance and verification
- presentation creation and verification
- audit visibility
- route-level RBAC foundation

### Public protocol plane

Implemented baseline public endpoints live under `/v1/:driver/protocols/...` and include:

- `GET /v1/:driver/protocols/oidc4vci/.well-known/openid-credential-issuer`
- `GET /v1/:driver/protocols/oidc4vci/.well-known/openid-configuration`
- `GET /v1/:driver/protocols/oidc4vci/jwks`
- `POST /v1/:driver/protocols/oidc4vci/authorize`
- `POST /v1/:driver/protocols/oidc4vci/token`
- `POST /v1/:driver/protocols/oidc4vci/credential`
- `POST /v1/:driver/protocols/oidc4vci/credential/deferred`
- `GET /v1/:driver/protocols/oidc4vp/.well-known/openid-configuration`
- `GET /v1/:driver/protocols/oidc4vp/jwks`
- `POST /v1/:driver/protocols/oidc4vp/authorize`
- `GET /v1/:driver/protocols/oidc4vp/requests/:id`
- `POST /v1/:driver/protocols/oidc4vp/callback`

### Security and protocol hardening already added

- JWT access tokens for public issuance flows
- session-bound nonce handling
- basic proof-of-possession checks
- public JWKS exposure with `kid`
- replay protection around codes, nonces, and session state
- tenant-aware protocol session isolation
- public rate limiting hooks
- OpenAPI and runtime alignment work from earlier phases

## Supported drivers

- `internal` – strongest reference runtime today
- `ethereum` – hybrid chain-backed path with local deployment/testing support
- `bitcoin` – confirmation-aware hybrid path with local `regtest` support

## Supported formats

The codebase is structured for several formats, but the strongest exercised paths today are:

- `vc-jwt`
- `sd-jwt-vc`
- `vc-ldp`
- `bbs-vc`

For the public protocol plane, the primary target right now is:

- `vc-jwt`
- `sd-jwt-vc`

## Repo layout

```text
apps/
  api-server/   Fastify HTTP API
  worker/       Background execution for protocol and anchoring work

packages/
  config/       environment and runtime configuration
  core/         shared SSI contracts, crypto, DID, format and protocol helpers
  drivers/      internal, ethereum, bitcoin drivers
  modules/      HTTP route modules and business domains
  plugins/      driver registry and runtime helpers
  protocols/    protocol helpers and flow wrappers
  utils/        queue, redis, validation, encryption helpers

docs/
  platform-guide.md
  protocol-server-guide.md
  runtime-setup.md
  testing-guide.md
  implementation-backlog.md
  openapi.yml

flow-testing-scripts/
  internal-off-chain-flows.sh
  ethereum-hybrid-flows.sh
  bitcoin-hybrid-flows.sh
  public-protocol-smoke.sh
  run-all.sh
```

## Quick start

### Install

```bash
pnpm install
```

### Build

```bash
pnpm -r build
```

### Run locally

API server:

```bash
pnpm --filter @ssi/api-server dev
```

Worker:

```bash
pnpm --filter @ssi/worker dev
```

## Recommended docs order

1. [`docs/platform-guide.md`](./docs/platform-guide.md)
2. [`docs/protocol-server-guide.md`](./docs/protocol-server-guide.md)
3. [`docs/runtime-setup.md`](./docs/runtime-setup.md)
4. [`docs/testing-guide.md`](./docs/testing-guide.md)
5. [`docs/openapi.yml`](./docs/openapi.yml)

## Flow testing scripts

The scripts are intended to give you fast, repeatable smoke coverage across control-plane and protocol-plane flows.

### Main driver flows

```bash
./flow-testing-scripts/internal-off-chain-flows.sh
./flow-testing-scripts/ethereum-hybrid-flows.sh
./flow-testing-scripts/bitcoin-hybrid-flows.sh
```

### Public protocol smoke checks

```bash
./flow-testing-scripts/public-protocol-smoke.sh
```

### Run everything

```bash
./flow-testing-scripts/run-all.sh
```

## Important environment flags

### Control plane

```env
CONTROL_PLANE_AUTH_REQUIRED=true
CONTROL_PLANE_TENANT_REQUIRED=true
CONTROL_PLANE_JWT_SECRET=change-me
```

### Public protocol plane

```env
PROTOCOL_BASE_URL=http://localhost:4000
PROTOCOL_ACCESS_TOKEN_TTL_SECONDS=900
PROTOCOL_NONCE_TTL_SECONDS=300
PROTOCOL_PUBLIC_RATE_LIMIT_WINDOW_SECONDS=60
PROTOCOL_PUBLIC_RATE_LIMIT_MAX=120
```

The exact variable names in your deployment may differ slightly by package config, but the runtime docs below describe the expected knobs and behaviors.

## What still needs validation before real production rollout

- interop testing with at least one real wallet
- negative-path testing for nonce, replay, and tenant isolation
- load testing for `/token`, `/credential`, `/credential/deferred`, and VP callback paths
- key rotation drills and JWKS rollover validation
- operational dashboards, alerting, and runbooks

## Notes

- `internal` remains the strongest driver for functional validation.
- `ethereum` and `bitcoin` are now suitable for meaningful local hybrid-path testing.
- `PHASE1_NOTES.md`, `PHASE3_NOTES.md`, and `PHASE4_NOTES.md` summarize the staged implementation changes.
