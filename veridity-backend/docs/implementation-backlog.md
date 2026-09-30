<p align="center">
  <img src="./assets/veridity-logo.svg" alt="Veridity" width="760" />
</p>

# Veridity Implementation Backlog

## Current status after Phase 4

Completed across the recent phases:

- OpenAPI and route-surface cleanup
- RBAC foundation
- hybrid lifecycle and richer governance actions
- public OIDC4VCI and OIDC4VP baseline endpoints
- JWT access-token model for the public issuer flow
- nonce, replay, JWKS, and tenant-binding hardening

What still matters most next:

- interop validation with real wallets
- broader negative-path and abuse testing
- stronger operational observability and alerts
- key rotation drills and external KMS integration
- advanced OIDC features such as PAR/JAR where needed

---

<p align="center">
  <img src="./assets/veridity-logo.svg" alt="Veridity" width="760" />
</p>

# SSI Platform Implementation Backlog

## Purpose

This is the single implementation backlog for the repo. It is meant to stay small enough to maintain, while still giving us a clear sequence for driver work, governance hardening, and runtime verification improvements.

## Platform Direction

The target platform is a hybrid SSI backend with:

- a multi-tenant control plane and worker
- governed onboarding and activation for SSI resources
- trust-aware issuance and verification
- format-aware issuance and verification across modern credential profiles
- protocol-driven issuance and presentation exchanges
- driver-specific storage and anchoring backends for `internal`, `ethereum`, and `bitcoin`

## Architectural Focus Areas

### Control Plane

- authentication and authorization for platform and tenant operators
- tenant isolation
- governance and trust workflows
- auditability and observability

### Data And Trust Plane

- off-chain storage for operational records and protocol state
- on-chain or external anchors for trust, governance, audit, and status where supported
- driver-specific resolution, reconciliation, and proof paths

### Format And Protocol Plane

- format-aware issuance and verification
- durable protocol sessions
- worker-backed async execution
- capability-aware routing per driver

## Current State

### Recently Completed

- `done`: Ethereum contract-backed writes for issuer, verifier, schema, template, trust, governance, and status roots
- `done`: Ethereum deploy tooling for local and external-style networks
- `done`: Ethereum event-driven worker indexing with persistent cursor state
- `done`: richer `did:ethr` resolution using chain state, registry state, and registry event history
- `done`: governed create, approve, activate lifecycle across key resources
- `done`: Bitcoin anchoring design, RPC commit client, worker batching, confirmation-backed read model, and proof-aware verification
- `done`: Bitcoin local `regtest` test flow with built-in wallet auto-funding and auto-mining

### Immediate Next Focus

- `next`: Ethereum receipt lifecycle hardening and reorg-aware indexing
- `next`: Governance and trust hardening across all active drivers
- `next`: DID resolution interface cleanup after removing Indy support

## Delivery Priorities

Priority order:

1. Ethereum receipt lifecycle hardening
2. Governance and trust hardening across all active drivers
3. Production-style Bitcoin operations and diagnostics
4. DID resolution interface cleanup
5. Deferred Indy reintroduction planning

## Phase View

### Phase 1: Core Driver Contract

- stabilize the richer `SSIDriver` domains
- preserve capability-aware routing
- keep `internal` as the reference implementation

### Phase 2: Formats

- strengthen VC-JWT, VC-LDP, SD-JWT VC, and BBS+
- leave `anoncreds` work in backlog until Indy is intentionally reintroduced

### Phase 3: Protocols

- make protocol sessions durable
- deepen OIDC4VCI, OIDC4VP, SIOPv2, DCQL, DIDComm v2, and Aries support

### Phase 4: Trust And Governance

- move from lightweight approvals to full governed lifecycle and policy enforcement
- strengthen RBAC, trust resolution, and policy-aware runtime decisions

### Phase 5: Status And Revocation

- anchor status roots where applicable
- use authoritative status in verification decisions

### Phase 6: Driver Rollout

- stabilize Ethereum as a real contract-backed path
- operationalize Bitcoin as a real confirmation-aware anchor path
- keep Indy-specific work deferred in backlog until reactivation is approved

## Active Backlog

### Bitcoin Completed Baseline

#### Ticket 1: `bitcoin-lock-anchoring-design`

- Status: `done`
- Scope: choose and lock the Bitcoin anchoring model before implementation spreads.
- Files:
  `packages/drivers/bitcoin/src/bitcoin.driver.ts`
  `packages/drivers/bitcoin/src/design.md`
- Required decision:
  choose one of `OP_RETURN per anchor`, `batched Merkle root anchoring`, or `periodic checkpoint anchoring`
- Recommended choice:
  batched Merkle root anchoring
- Acceptance criteria:
  design defines commitment shape, tx model, batching strategy, proof model, confirmation policy, and failure handling
  trust, governance, audit, and status roots have a consistent anchoring story
- Depends on: none

#### Ticket 2: `bitcoin-build-anchor-client`

- Status: `done`
- Scope: implement Bitcoin transaction construction, broadcasting, and confirmation reads.
- Files:
  `packages/drivers/bitcoin/src/anchor/bitcoin-anchor.client.ts`
  `packages/drivers/bitcoin/src/anchor/opreturn.ts`
  `packages/drivers/bitcoin/src/anchor/merkle.ts`
- Acceptance criteria:
  driver can commit a root hash to Bitcoin
  driver can fetch tx status and confirmation depth
  returned write results include txid, block height if known, and confirmation state
- Depends on: `bitcoin-lock-anchoring-design`

#### Ticket 3: `bitcoin-batch-commitments`

- Status: `done`
- Scope: batch trust, governance, audit, and status commitments into Bitcoin anchors.
- Files:
  `packages/drivers/bitcoin/src/anchor/indexer.ts`
  `packages/drivers/bitcoin/src/bitcoin.driver.ts`
  `packages/drivers/internal/src/internal.driver.ts`
- Acceptance criteria:
  trust, governance, audit, and status events can be included in a Merkle-root batch
  txid and inclusion proof are stored with the corresponding record
  repeated batching is idempotent for already-anchored records
- Depends on: `bitcoin-build-anchor-client`

#### Ticket 4: `bitcoin-confirmation-read-model`

- Status: `done`
- Scope: reconcile Bitcoin anchor confirmation state into the local read model.
- Files:
  `packages/drivers/bitcoin/src/anchor/indexer.ts`
  `apps/worker/src/index.ts`
  `packages/drivers/internal/src/models/status.model.ts`
  `packages/drivers/internal/src/models/auditEvent.model.ts`
- Acceptance criteria:
  worker tracks pending Bitcoin anchors by txid
  local records expose pending, confirmed, failed, and stale confirmation state
  confirmation depth is visible to runtime decision code
- Depends on: `bitcoin-batch-commitments`

#### Ticket 5: `bitcoin-verify-inclusion-proofs`

- Status: `done`
- Scope: verify Bitcoin anchored commitments from API and driver layers.
- Files:
  `packages/drivers/bitcoin/src/anchor/indexer.ts`
  `packages/modules/verification/index.ts`
  `packages/drivers/internal/src/internal.driver.ts`
- Acceptance criteria:
  system can validate tx confirmation state and Merkle inclusion proof for a commitment
  verification can consume confirmed Bitcoin-backed status and trust anchors when available
- Depends on: `bitcoin-confirmation-read-model`

### Ethereum Hardening

#### Ticket 6: `eth-event-indexer-cursor-hardening`

- Status: `queued`
- Scope: strengthen the new Ethereum event-driven indexer for long-lived environments.
- Files:
  [apps/worker/src/index.ts](/home/sagar/De-Labs/SSI%20Platform/apps/worker/src/index.ts#L255)
  [packages/drivers/ethereum/src/ethereum.driver.ts](/home/sagar/De-Labs/SSI%20Platform/packages/drivers/ethereum/src/ethereum.driver.ts#L550)
  [packages/drivers/internal/src/models/chainIndexState.model.ts](/home/sagar/De-Labs/SSI%20Platform/packages/drivers/internal/src/models/chainIndexState.model.ts#L1)
- Acceptance criteria:
  indexer handles restart recovery cleanly
  indexer tolerates duplicate delivery and cursor replay
  indexer is ready for reorg-aware handling if the target network requires it
- Depends on: none

#### Ticket 7: `status-root-anchor-lifecycle`

- Status: `queued`
- Scope: model pending, confirmed, failed, and reorged lifecycle for status-root anchors.
- Files:
  `packages/core/types/credential.ts`
  `packages/drivers/internal/src/models/status.model.ts`
  `packages/drivers/ethereum/src/ethereum.driver.ts`
- Acceptance criteria:
  status roots have explicit lifecycle state
  runtime can distinguish pending anchors from confirmed anchors
  receipt metadata and confirmation depth are stored cleanly
- Depends on: `eth-event-indexer-cursor-hardening`

#### Ticket 8: `verification-use-confirmed-anchors`

- Status: `queued`
- Scope: make verification status-aware using confirmed anchored state.
- Files:
  `packages/drivers/internal/src/internal.driver.ts`
  `packages/modules/verification/index.ts`
- Acceptance criteria:
  verification consults confirmed anchored status when available
  revoked credentials fail verification based on confirmed anchored state
- Depends on: `status-root-anchor-lifecycle`

### DID Resolution

#### Ticket 9: `did-resolution-interface-upgrade`

- Status: `queued`
- Scope: formalize DID resolution interfaces and options across drivers.
- Files:
  `packages/core/interfaces/driver.interface.ts`
  `packages/core/did/index.ts`
  `packages/core/did/types.ts`
- Acceptance criteria:
  DID resolution is configured through typed options
  drivers call a consistent resolver interface
- Depends on: none

#### Ticket 10: `did-resolution-cleanup-post-indy`

- Status: `queued`
- Scope: remove Indy-specific assumptions from shared DID factories and resolution interfaces.
- Files:
  `packages/core/did/index.ts`
  `packages/core/did/did-factory.ts`
  `packages/drivers/internal/src/internal.driver.ts`
- Acceptance criteria:
  shared DID helpers only expose active methods
  no driver-agnostic resolution path assumes Indy-specific config
- Depends on: `did-resolution-interface-upgrade`

#### Ticket 11: `did-factory-stop-synthetic-chain-dids`

- Status: `queued`
- Scope: stop fabricating `did:ethr` by default outside explicit test flows.
- Files:
  `packages/core/did/did-factory.ts`
- Acceptance criteria:
  chain-backed DID methods require real onboarding inputs unless `mockMode` is enabled
  synthetic generation remains available only for explicit test flows
- Depends on: `did-resolution-cleanup-post-indy`

### Deferred Backlog: Indy Support

#### Ticket 12: `indy-add-vdr-client`

- Status: `backlog`
- Scope: reintroduce a real Indy VDR client if Indy support returns.
- Files:
  `packages/drivers/indy/src/indy.driver.ts`
  `packages/drivers/indy/src/ledger/vdr.client.ts`
- Acceptance criteria:
  Indy driver can register and resolve NYM and schema data through VDR
  Indy driver can query ledger-backed trust information
- Depends on: `did-resolution-cleanup-post-indy`

#### Ticket 13: `indy-ledger-read-model`

- Status: `backlog`
- Scope: give Indy the same governed read-model discipline using ledger reads and AnonCreds/VDR state.
- Files:
  `packages/drivers/indy/src/indy.driver.ts`
  `packages/drivers/indy/src/ledger/vdr.client.ts`
- Acceptance criteria:
  Indy driver reconciles issuer, schema, and cred-def state from ledger truth
  DID resolution and verification consume ledger-backed data
  governance and trust artifacts can be reflected into the local read model
- Depends on: `indy-add-vdr-client`

#### Ticket 14: `indy-add-anoncreds-handler`

- Status: `backlog`
- Scope: make `anoncreds` a real format path.
- Files:
  `packages/drivers/indy/src/indy.driver.ts`
  `packages/drivers/indy/src/anoncreds/format.handler.ts`
  `packages/drivers/indy/src/anoncreds/issuer.ts`
  `packages/drivers/indy/src/anoncreds/verifier.ts`
- Acceptance criteria:
  `anoncreds` issuance works end-to-end
  `anoncreds` verification works end-to-end
  format selection routes into Indy-native logic
- Depends on: `indy-add-vdr-client`

#### Ticket 15: `indy-add-revocation-registry`

- Status: `backlog`
- Scope: implement Indy revocation registry support.
- Files:
  `packages/drivers/indy/src/indy.driver.ts`
  `packages/drivers/indy/src/anoncreds/revocation.ts`
- Acceptance criteria:
  revocation registry create and update flows work
  Indy verification checks revocation state through ledger-backed data
- Depends on: `indy-add-anoncreds-handler`

#### Ticket 16: `indy-wire-aries-didcomm-proof-flows`

- Status: `backlog`
- Scope: connect Indy and AnonCreds into worker-backed protocol flows.
- Files:
  `packages/drivers/indy/src/indy.driver.ts`
  `apps/worker/src/index.ts`
- Acceptance criteria:
  worker can process Indy and Aries proof sessions
  Indy verification sessions can use AnonCreds-native proof verification
- Depends on: `indy-add-revocation-registry`

### Governance And Trust Hardening

#### Ticket 17: `governance-resource-lifecycle-endpoints`

- Status: `queued`
- Scope: finish the governed lifecycle around activation, suspension, revocation, and deactivation.
- Files:
  `packages/core/interfaces/driver.interface.ts`
  `packages/modules/issuer/index.ts`
  `packages/modules/verifier/index.ts`
  `packages/modules/schema/index.ts`
  `packages/modules/template/index.ts`
  `packages/modules/trust/index.ts`
- Acceptance criteria:
  issuer, verifier, trust, schema, and template lifecycle changes have explicit endpoints
  runtime issuance and verification consume active state rather than implicit creation state
- Depends on: none

#### Ticket 18: `governance-bind-approvals-to-snapshots`

- Status: `queued`
- Scope: bind approvals to concrete resource snapshots rather than loose subject IDs alone.
- Files:
  `packages/core/types/governance.ts`
  `packages/drivers/internal/src/internal.driver.ts`
  `packages/drivers/internal/src/models/governance.model.ts`
- Acceptance criteria:
  governance proposals can point to a concrete schema, template, policy, or trust snapshot
  activation fails if the approved snapshot no longer matches the stored resource
- Depends on: `governance-resource-lifecycle-endpoints`

#### Ticket 19: `trust-and-policy-runtime-enforcement`

- Status: `queued`
- Scope: deepen runtime trust and tenant-policy enforcement beyond issuer issuance checks.
- Files:
  `packages/drivers/internal/src/internal.driver.ts`
  `packages/modules/verification/index.ts`
  `packages/modules/presentation/index.ts`
  `packages/core/types/tenant.ts`
- Acceptance criteria:
  verifier-controlled flows can consult trust state
  tenant policies affect runtime authorization or validation decisions
  trust and policy failures surface as clear validation errors
- Depends on: `governance-resource-lifecycle-endpoints`

#### Ticket 20: `governance-type-specific-execution`

- Status: `queued`
- Scope: make `multisig`, `policy`, and later `dao` materially different in execution behavior.
- Files:
  `packages/core/types/governance.ts`
  `packages/modules/governance/index.ts`
  `packages/drivers/internal/src/internal.driver.ts`
- Acceptance criteria:
  `multisig` is more than a label on the same workflow
  `policy` proposals have domain-specific validation and application rules
  governance execution behavior is type-aware
- Depends on: `governance-bind-approvals-to-snapshots`

#### Ticket 21: `governance-workflow-completion`

- Status: `queued`
- Scope: complete the governance workflow beyond create, get, and approve.
- Files:
  `packages/modules/governance/index.ts`
  `packages/drivers/internal/src/models/governance.model.ts`
  `packages/core/types/governance.ts`
- Acceptance criteria:
  governance routes can represent reject, cancel, execute, expire, and delegated approver paths
  audit events exist for rejection, cancellation, execution, and expiration
- Depends on: `governance-type-specific-execution`

#### Ticket 22: `route-rbac-and-super-admin-governance`

- Status: `queued`
- Scope: connect control-plane RBAC with governance and trust operations.
- Files:
  `apps/api-server/src/plugins/index.ts`
  `docs/platform-guide.md`
  `packages/modules/**/index.ts`
- Acceptance criteria:
  sensitive trust and governance routes enforce role-based permissions
  super administrator behavior is explicit and documented
- Depends on: `governance-workflow-completion`

## Milestone Groups

### Milestone A: Ethereum Baseline

- Status: `done`
- Outcome: Ethereum now has real contract-backed writes, local and external deployment tooling, event-driven indexing, and richer `did:ethr` resolution

### Milestone B: Bitcoin Anchoring

- Status: `done`
- Tickets: `1`, `2`, `3`, `4`, `5`
- Outcome: Bitcoin becomes a real commitment anchor backend with confirmation-aware read models and proof verification

### Milestone C: Ethereum Hardening

- Status: `queued`
- Tickets: `6`, `7`, `8`
- Outcome: Ethereum anchors gain stronger lifecycle semantics and verification only trusts confirmed on-chain state

### Milestone D: DID Resolution

- Status: `queued`
- Tickets: `9`, `10`, `11`
- Outcome: DID resolution is driver-consistent and no longer depends on synthetic chain identifiers outside explicit test mode

### Milestone E: Deferred Indy Support

- Status: `backlog`
- Tickets: `12`, `13`, `14`, `15`, `16`
- Outcome: Indy can be reintroduced intentionally without affecting the active driver set

### Milestone F: Governance And Trust Hardening

- Status: `queued`
- Tickets: `17`, `18`, `19`, `20`, `21`, `22`
- Outcome: governance and trust become explicit lifecycle, policy, and authorization systems rather than lightweight approval metadata

## Recommended Next Sprint

- `did-resolution-cleanup-post-indy`
- `ethereum-receipt-lifecycle-hardening`
- `governance-resource-lifecycle-endpoints`
- `trust-runtime-policy-hardening`

Indy remains in backlog, while the active next sprint stays focused on hardening the drivers that are still shipped.
