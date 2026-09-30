<p align="center">
  <img src="./assets/veridity-logo.svg" alt="Veridity" width="760" />
</p>

# Veridity Testing Guide

This guide is the testing map for the Phase 4 codebase.

## Test strategy

You should now think about testing in three layers:

### 1. Control-plane smoke
Use the driver flow scripts to verify governed resource creation, approval, activation, issuance, verification, presentation, protocol session orchestration, and audit visibility.

### 2. Public protocol smoke
Use the public smoke script to verify discovery, JWKS, authorization, token, and request retrieval for OIDC4VCI and OIDC4VP.

### 3. Negative-path and interop validation
Use your own harness or wallet integrations to test proof correctness, replay resistance, tenant isolation, and format-specific edge cases.

## Scripts

### Driver smoke flows

```bash
./flow-testing-scripts/internal-off-chain-flows.sh
./flow-testing-scripts/ethereum-hybrid-flows.sh
./flow-testing-scripts/bitcoin-hybrid-flows.sh
```

### Public protocol smoke

```bash
./flow-testing-scripts/public-protocol-smoke.sh
```

### Everything

```bash
./flow-testing-scripts/run-all.sh
```

## Recommended order

1. bring up MongoDB, Redis, API, and Worker
2. verify `GET /v1/system/health`
3. run one of the driver flow scripts
4. run `public-protocol-smoke.sh`
5. inspect audit results
6. run negative-path checks
7. run load and abuse checks if you are preparing for an external rollout

## Environment variables used by the scripts

Common defaults:

```bash
export BASE_URL=http://localhost:4000/v1
export REVOCATION_URL=http://localhost:4000/v1/revocation
export PROTOCOL_BASE_URL=http://localhost:4000/v1
export CT='content-type: application/json'
```

Optional auth headers when the control plane is protected:

```bash
export AUTH='authorization: Bearer <token>'
export TENANT_HEADER='x-tenant-id: tenant:demo'
```

Optional output capture:

```bash
export FLOW_OUTPUT_DIR=./artifacts/flow-results
```

## What the driver scripts now cover

Each driver script performs the following sequence:

1. create tenant
2. create draft issuer, verifier, wallet, trust, schema, and template
3. create and approve governance proposals
4. activate governed resources
5. create revocation list
6. issue and verify credentials across configured formats
7. create and verify a presentation
8. inspect protocol metadata and sessions
9. run public OIDC discovery and authorization/token smoke checks
10. inspect audit records

## What the public protocol smoke script covers

The dedicated public smoke script validates:

- OIDC4VCI credential issuer metadata
- OIDC4VCI authorization server metadata
- OIDC4VCI JWKS
- OIDC4VCI authorization call
- OIDC4VCI token call with plain PKCE
- OIDC4VP metadata
- OIDC4VP JWKS
- OIDC4VP authorization call
- OIDC4VP request retrieval

It intentionally stops short of a full wallet proof exchange because that usually depends on wallet-specific signing behavior and key material.

## Negative-path checks you should add before production

At minimum, try these manually or through a dedicated test harness:

- reused authorization code
- expired nonce
- wrong `code_verifier`
- wrong tenant token
- mismatched `aud`
- unknown `kid`
- malformed proof JWT
- replayed VP callback
- stale deferred transaction lookup
- malformed SD-JWT disclosures

## Interop guidance

For real deployment readiness, validate against at least one realistic wallet path for:

- JWT VC issuance
- SD-JWT VC issuance
- OIDC4VP presentation submission

## Reading map

- [`platform-guide.md`](./platform-guide.md)
- [`protocol-server-guide.md`](./protocol-server-guide.md)
- [`runtime-setup.md`](./runtime-setup.md)
- [`openapi.yml`](./openapi.yml)
