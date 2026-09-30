<p align="center">
  <img src="./assets/veridity-logo.svg" alt="Veridity" width="760" />
</p>

# Veridity Protocol Server Guide

This guide describes the public OIDC4VCI and OIDC4VP surface that exists after Phase 4.

## Route shape

Public protocol routes are currently exposed under the driver-specific prefix:

```text
/v1/:driver/protocols/oidc4vci/...
/v1/:driver/protocols/oidc4vp/...
```

That keeps protocol traffic tenant-aware and driver-aware while still allowing a public-server deployment model.

## OIDC4VCI surface

### Discovery

- `GET /.well-known/openid-credential-issuer`
- `GET /.well-known/openid-configuration`
- `GET /jwks`

### Runtime

- `POST /authorize`
- `POST /token`
- `POST /credential`
- `POST /credential/deferred`
- `GET /deferred`
- `POST /callback`

## OIDC4VP surface

### Discovery

- `GET /.well-known/openid-configuration`
- `GET /jwks`

### Runtime

- `POST /authorize`
- `GET /requests/:id`
- `GET /qr`
- `POST /presentations`
- `POST /callback`

## Current security behavior

### OIDC4VCI

- authorization creates a session-bound code and nonce
- token issues a signed JWT access token
- access token is tied to the active session
- credential issuance checks the access token and proof payload
- deferred lookup enforces session ownership

### OIDC4VP

- authorization creates a session-bound request with state and nonce
- request retrieval exposes a wallet-consumable request object shape
- callback validates state and nonce freshness before verification
- verification result is written back into the session record

## Current practical limitations

This is a strong baseline, but not the end state yet.

Not fully covered yet:

- PAR / JAR
- advanced request-object signing profiles
- full client registration flows
- advanced response encryption profiles
- external KMS-backed key lifecycle
- full spec-edge conformance coverage across multiple wallet vendors

## Operational guidance

Before exposing the public protocol plane broadly, make sure you have:

- a stable external base URL
- TLS in front of the service
- monitoring on `/token`, `/credential`, `/credential/deferred`, and VP callback endpoints
- a rotation story for JWKS keys
- negative-path monitoring for replay and nonce failures

## Recommended smoke workflow

1. run one driver flow to seed live resources
2. run `./flow-testing-scripts/public-protocol-smoke.sh`
3. exercise a real wallet or harness against the OIDC4VCI flow
4. exercise a real wallet or harness against the OIDC4VP flow
