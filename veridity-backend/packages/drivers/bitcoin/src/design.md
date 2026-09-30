# Bitcoin Anchoring Design

## Recommended Model

Use batched Merkle-root anchoring.

## Why

- Bitcoin is expensive and slow compared with the internal and Ethereum paths.
- The platform needs to anchor trust, governance, audit, and status events, not just one-off records.
- Batching keeps transaction count low while still allowing per-record verification with inclusion proofs.

## Proposed Shape

1. Collect anchorable events off-chain.
2. Canonicalize each event into a commitment payload.
3. Hash each payload into a leaf.
4. Build a Merkle root for the batch.
5. Commit the root through one Bitcoin transaction using an `OP_RETURN` output.
6. Store:
   - batch id
   - txid
   - root hash
   - per-record leaf hash
   - per-record Merkle proof
   - confirmation state

## Records To Anchor

- trust registry changes
- governance proposals and approvals
- audit events
- status-root updates

## Runtime Model

- write path:
  create a pending batch entry and eventually a pending tx record
- worker path:
  submit, watch, and reconcile tx confirmations
- verification path:
  prefer confirmed anchors when present

## Confirmation Policy

- `mempool`: transaction broadcast but not mined
- `confirmed`: at least one confirmation
- higher confirmation thresholds can be enforced later per environment or per action type

## Current Implementation Direction

- `bitcoin-anchor.client.ts` owns JSON-RPC communication and tx-status reads
- `merkle.ts` owns commitment-tree helpers
- `opreturn.ts` owns `OP_RETURN` payload encoding
- the next step is batching plus worker reconciliation into the local read model
