<p align="center">
  <img src="./assets/veridity-logo.svg" alt="Veridity" width="760" />
</p>

# Veridity Platform Guide

This guide is the conceptual map for the Veridity SSI Platform after the Phase 1–4 upgrades.

## What the platform is now

Veridity is no longer just a control-plane scaffold. It now has two distinct but connected planes:

### 1. Control plane
The control plane manages governed SSI resources:

- tenants
- issuers
- verifiers
- wallets
- schemas
- templates
- trust entries
- governance proposals
- revocation and audit records

### 2. Public protocol plane
The public protocol plane exposes baseline OIDC4VCI and OIDC4VP endpoints so wallets and relying parties can interact with the system through discovery, authorization, token, credential, request, and callback flows.

## Main architectural building blocks

### API server
Fastify app that hosts both the control plane and the public protocol plane.

### Worker
Background execution for protocol jobs, deferred work, anchor processing, and future reconciliation flows.

### Drivers
Drivers allow a shared business model across multiple trust/storage backends:

- `internal`
- `ethereum`
- `bitcoin`

### Modules
Core route domains currently include:

- tenant
- issuer
- verifier
- wallet
- schema
- template
- credential
- presentation
- trust
- governance
- protocol
- audit
- revocation
- system

## Governed lifecycle model

The resource lifecycle is now explicitly governed.

### Draft creation
Resources are created first in a non-live state.

### Governance action
Governed resources can then be approved, rejected, cancelled, or executed through proposal flows.

### Activation
Activation is separate from creation. A resource becomes runtime-usable only after explicit lifecycle action.

### Hybrid lifecycle policy
The current recommended pattern is:

- low-risk operational transitions such as suspend/reactivate can be direct
- critical transitions such as revoke/delete/trust-critical changes should go through governance

## Roles and intent

The recommended role mapping is:

- `platform-admin` – full cross-tenant platform administration
- `tenant-admin` – tenant-scoped governance and operations
- `issuer` – issuance operations and issuer-side protocol flows
- `verifier` – verification operations and verifier-side protocol flows
- `wallet` – mostly public protocol interactions rather than control-plane admin operations
- `auditor` – read-only visibility into audit, lifecycle, and protocol outcomes
- `worker` – internal execution principal for async jobs and deferred operations

## Public protocol plane at a glance

### OIDC4VCI
Current baseline public support includes:

- issuer discovery
- authorization server metadata
- JWT access token issuance
- credential issuance endpoint
- deferred credential polling endpoint
- JWKS publication
- nonce and proof checks

### OIDC4VP
Current baseline public support includes:

- verifier discovery
- authorization/initiation endpoint
- request retrieval endpoint
- callback/submission endpoint
- JWKS publication
- state and nonce validation

## Security model today

### Control plane
The control plane uses bearer JWT auth with tenant enforcement when enabled.

### Public protocol plane
The public protocol plane now adds:

- session-scoped nonce handling
- replay protections
- JWT access tokens
- `kid`-aware JWKS exposure
- tenant-bound protocol sessions
- basic public rate limiting

## What is strong today

- control-plane lifecycle semantics are much better than the original build
- governance is no longer approve-only
- RBAC groundwork is in place
- public OIDC discovery and runtime endpoints exist
- JWT VC and SD-JWT VC paths are both represented in baseline flows

## What is still the main risk area

The remaining risk is less about missing top-level modules and more about correctness under real traffic:

- interop edge cases
- negative proof/nonce scenarios
- key rotation behavior
- strict tenant isolation under failure conditions
- rate limiting and abuse handling under load
- ops visibility and runbooks

## Recommended reading next

- [`runtime-setup.md`](./runtime-setup.md) for local and deployment-time configuration
- [`protocol-server-guide.md`](./protocol-server-guide.md) for the public OIDC surface
- [`testing-guide.md`](./testing-guide.md) for smoke and validation flow order
- [`implementation-backlog.md`](./implementation-backlog.md) for what remains after Phase 4
