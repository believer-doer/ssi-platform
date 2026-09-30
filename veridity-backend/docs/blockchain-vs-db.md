# Blockchain vs DB in Veridity

This note explains what Veridity currently writes to Ethereum and Bitcoin, and why the backend keeps the full operational record in MongoDB instead of putting everything on-chain.

## Short version

Veridity does **not** store all business data on-chain.

- **Ethereum** is used as a registry layer: the chain stores the canonical identifier/status surface for supported records.
- **Bitcoin** is used as a commitment layer: the chain stores a Merkle-root anchor for a batch of off-chain records.
- **MongoDB** stores the full operational record, history, proofs, and runtime metadata.

That split gives us the best mix of:

- auditability
- tamper evidence
- lower cost
- better privacy
- faster queries
- easier updates and reconciliation

## What goes on Ethereum

In the current `UniversalRegistry` contract, Ethereum stores the live registry fields directly on-chain.

### Issuer and verifier records

Stored on-chain:

- DID
- metadata URI
- status
- updated timestamp

Examples:

- `did:ethr:0x1234...abcd` with `metadataURI = ssi://ethereum/issuer/tenant-issuer-01` and `status = active`
- `did:pkh:eip155:1:0x9876...fedc` with `metadataURI = ssi://ethereum/verifier/verifier-ops-02` and `status = suspended`

Relevant code:

- [`UniversalRegistry.sol`](../packages/drivers/ethereum/src/contracts/UniversalRegistry.sol)
- [`registry.client.ts`](../packages/drivers/ethereum/src/chain/registry.client.ts)

### Schema and template records

Stored on-chain:

- schema or template identifier, hashed to `bytes32`
- URI
- status
- updated timestamp

Examples:

- `schemaId = schema:kyc-basic`, stored on-chain as `bytes32(keccak256("schema:kyc-basic"))`, with `uri = ssi://ethereum/schema/schema:kyc-basic`
- `templateId = tpl:employment-vc`, stored on-chain as `bytes32(keccak256("tpl:employment-vc"))`, with `uri = ssi://ethereum/template/tpl:employment-vc`

Relevant code:

- [`UniversalRegistry.sol`](../packages/drivers/ethereum/src/contracts/UniversalRegistry.sol)
- [`registry.client.ts`](../packages/drivers/ethereum/src/chain/registry.client.ts)

### Trust records

Stored on-chain:

- record identifier, hashed to `bytes32`
- registry ID
- entity type
- entity ID
- DID
- metadata URI
- status
- updated timestamp

Examples:

- trust registry entry for `issuer-01` pointing to `did:ethr:0x1234...abcd` with `registryId = trust-registry:main`
- verifier trust entry for `wallet-provider-07` with `entityType = verifier`, `entityId = verifier-ops-07`, and `status = active`

Relevant code:

- [`UniversalRegistry.sol`](../packages/drivers/ethereum/src/contracts/UniversalRegistry.sol)
- [`ethereum.driver.ts`](../packages/drivers/ethereum/src/ethereum.driver.ts)

### Governance proposals

Stored on-chain:

- proposal identifier, hashed to `bytes32`
- issuer DID
- governance type
- subject type
- subject ID
- required approvals
- approval count
- status
- policy reference
- metadata URI
- updated timestamp

Examples:

- governance proposal `gov:tenant-rotation-01` with `governanceType = policy`, `subjectType = issuer`, and `requiredApprovals = 2`
- approval-tracked proposal for activating a verifier, with `subjectId = verifier-ops-07` and `status = pending`

Relevant code:

- [`UniversalRegistry.sol`](../packages/drivers/ethereum/src/contracts/UniversalRegistry.sol)
- [`registry.client.ts`](../packages/drivers/ethereum/src/chain/registry.client.ts)

### Status roots

Stored on-chain:

- status list identifier, hashed to `bytes32`
- list URI
- root hash
- updated timestamp

Examples:

- status list `status:issuer-main` with `listUri = http://localhost:4000/status/issuer-main`
- revocation root for `status:kyc-2026-q1` with `rootHash = 0x8f3a...` representing the latest encoded status list

Relevant code:

- [`UniversalRegistry.sol`](../packages/drivers/ethereum/src/contracts/UniversalRegistry.sol)
- [`ethereum.driver.ts`](../packages/drivers/ethereum/src/ethereum.driver.ts)

## What goes on Bitcoin

Bitcoin is used as a batch commitment anchor, not as a place to store the full record.

### On-chain Bitcoin data

The Bitcoin transaction carries:

- a single root hash
- encoded in an `OP_RETURN` output

That root hash is the Merkle root for a batch of queued commitments.

Examples:

- a Bitcoin transaction whose `OP_RETURN` payload commits the root for a batch of 12 trust-registry and governance anchors
- a `regtest` transaction that anchors `rootHash = 7c4f...a91b` for a batch containing several status-list updates

Relevant code:

- [`design.md`](../packages/drivers/bitcoin/src/design.md)
- [`bitcoin-anchor.client.ts`](../packages/drivers/bitcoin/src/anchor/bitcoin-anchor.client.ts)
- [`indexer.ts`](../packages/drivers/bitcoin/src/anchor/indexer.ts)

### Off-chain Bitcoin data

The database keeps the operational and verification data:

- commitment ID
- commitment key
- source kind
- source ID
- tenant ID
- subject ID
- anchor type
- original payload
- payload hash
- leaf hash
- batch ID
- txid
- Merkle proof
- confirmation status
- confirmation count
- block hash
- block height
- error state
- metadata

Examples:

- a trust-registry commitment with `sourceKind = trust-registry`, `anchorType = approval`, `payload.registryId = trust-registry:main`, and `payload.did = did:pkh:bip122:...`
- a governance commitment with `sourceKind = governance`, `anchorType = policy`, `payload.proposalId = gov:tenant-rotation-01`, and `payload.status = pending`
- a status-list commitment with `sourceKind = status-list`, `payload.statusListId = status:issuer-main`, `payload.rootHash = 0x8f3a...`, and `payload.purpose = revocation`
- an audit commitment with `sourceKind = audit`, `payload.eventType = credential-issued`, and `payload.subjectId = cred:abc123`

Relevant code:

- [`bitcoinAnchorCommitment.model.ts`](../packages/drivers/internal/src/models/bitcoinAnchorCommitment.model.ts)
- [`bitcoinAnchorBatch.model.ts`](../packages/drivers/internal/src/models/bitcoinAnchorBatch.model.ts)
- [`indexer.ts`](../packages/drivers/bitcoin/src/anchor/indexer.ts)

## Why keep data on-chain at all?

The chain is useful when the data needs to be independently verifiable by parties that do not trust our MongoDB instance.

### Benefits of on-chain data

- **Tamper evidence**: once written, the record or commitment is hard to alter without detection.
- **Shared source of truth**: wallets, verifiers, and operators can independently check the same registry or anchor.
- **Independent auditability**: the chain gives an external timeline and history that is not controlled by a single database admin.
- **Proof of existence and order**: the chain can prove that a record existed at a certain point in time.
- **Cross-organization trust**: useful when multiple parties need to agree on state without sharing one private database.

## Why not keep everything on-chain instead of in DB?

For Veridity’s current backend, keeping everything on-chain would be the wrong tradeoff.

### Reasons to keep the full record in MongoDB

- **Privacy**: chain data is public and permanent. We should not place sensitive claims, identities, or internal operational detail on-chain.
- **Cost**: Ethereum storage and Bitcoin transaction space both cost money. Full records would be unnecessarily expensive.
- **Throughput**: the DB is much faster for application queries, filtering, and dashboard views.
- **Mutability**: operational state changes often. Databases are better for rapidly changing data.
- **Queryability**: the app needs to search, list, sort, and join records. That is much easier in MongoDB than on-chain storage.
- **Recovery and reconciliation**: the DB can hold history, proofs, and indexes that make replay and repair practical.

## The right split for Veridity

The clean rule of thumb is:

- put **identity, status, and commitment surfaces** on-chain
- keep **payloads, proofs, dashboards, and operational history** in the DB

### Use Ethereum when we need

- a registry-style canonical record
- directly queryable lifecycle status
- shared verification across tenants or operators

### Use Bitcoin when we need

- a low-trust timestamped commitment
- batch anchoring of many records at once
- a proof that a batch existed without revealing the underlying data

## Practical takeaway

If a field is:

- sensitive
- frequently updated
- expensive to store
- or only useful for internal application logic

it should stay in MongoDB.

If a field is:

- meant to be independently verified
- part of the public trust surface
- or needed as a durable anchor for cross-party assurance

it is a better fit for the chain.

## Bottom line

In Veridity:

- **Ethereum** holds registry-style state such as DIDs, URIs, statuses, proposal metadata, and status roots.
- **Bitcoin** holds a compact Merkle-root commitment for batches of off-chain records.
- **MongoDB** holds the full business data, proofs, and runtime state.

That is the intended trust model: chain for verifiability, DB for usability.

## FAQ

### Why put any data on-chain at all?

Because some parts of the system sit inside the trust boundary. On-chain data lets other parties verify state without trusting our database or operators. It also gives us tamper evidence, a shared timestamped history, and a durable audit trail.

### Is cross-operator support the only reason?

No. Cross-operator support is one benefit, but the bigger reason is independent verification. The chain is the neutral layer that proves a record or commitment existed at a point in time.

### Why use Ethereum for some data?

Ethereum is a good fit for registry-style state that needs direct lookup and updates, such as issuer and verifier status, trust records, governance proposals, and status roots. The contract stores structured live state, and the backend can reconcile that state back into MongoDB.

### Why use Bitcoin for some data?

Bitcoin is a good fit for compact commitment anchoring. Veridity uses it to commit a Merkle root for a batch of off-chain records, which gives us a public timestamp and proof of inclusion without placing the full data on-chain.

### Why not store everything on-chain?

Because most platform data is private, mutable, or too large and expensive to store publicly. MongoDB is better for full payloads, search, dashboards, proofs, and fast updates. The chain should hold only the minimum data needed to make the trust model verifiable.
