import type { EntityTimestamps, Metadata } from "./common";

export type GovernanceType = "admin" | "multisig" | "dao" | "policy";

export type GovernanceStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "cancelled";

export interface GovernanceApproval {
  approverDid: string;
  approvedAt: Date;
  signature?: string;
  comment?: string;
}

export interface GovernanceAnchor {
  driver: string;
  network?: string;
  commitmentId?: string;
  batchId?: string;
  transactionHash?: string;
  blockNumber?: number;
  blockHash?: string;
  confirmations?: number;
  confirmationStatus?: "queued" | "batched" | "mempool" | "confirmed" | "failed" | "stale";
  rootHash?: string;
  leafHash?: string;
  merkleProof?: Array<{
    position: "left" | "right";
    hash: string;
  }>;
  error?: string;
  anchorType: "approval" | "policy" | "audit" | "status-root";
  anchoredAt?: Date;
}

export interface GovernanceProposal extends EntityTimestamps {
  proposalId: string;
  tenantId?: string;
  issuerDid?: string;
  governanceType: GovernanceType;
  status: GovernanceStatus;
  subjectType:
    | "issuer"
    | "verifier"
    | "wallet"
    | "schema"
    | "template"
    | "trust-registry"
    | "policy";
  subjectId: string;
  requiredApprovals: number;
  approvals: GovernanceApproval[];
  policyRef?: string;
  chainAnchors?: GovernanceAnchor[];
  metadata?: Metadata;
}
