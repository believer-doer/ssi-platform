import type { ethers } from "ethers";

export interface EthereumDriverOptions {
  rpcUrl?: string;
  privateKey?: string;
  chainId?: number;
  registryAddress?: string;
  registryDeployBlock?: number;
  provider?: ethers.JsonRpcProvider;
  signer?: ethers.Signer;
}

export type EthereumRecordStatus =
  | "unknown"
  | "pending"
  | "active"
  | "suspended"
  | "revoked";

export type EthereumGovernanceStatus =
  | "unknown"
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "cancelled";

export interface EthereumRegistryClientOptions {
  provider: ethers.JsonRpcProvider;
  signer: ethers.Signer;
  registryAddress: string;
  chainId?: number;
}

export type EthereumRegistryEventName =
  | "IssuerUpserted"
  | "IssuerStatusUpdated"
  | "IssuerRegistered"
  | "IssuerRevoked"
  | "VerifierUpserted"
  | "VerifierStatusUpdated"
  | "VerifierRegistered"
  | "VerifierRevoked"
  | "SchemaUpserted"
  | "SchemaStatusUpdated"
  | "SchemaRegistered"
  | "SchemaRevoked"
  | "TemplateUpserted"
  | "TemplateStatusUpdated"
  | "TemplateRegistered"
  | "TemplateRevoked"
  | "TrustRecordUpserted"
  | "TrustRecordStatusUpdated"
  | "GovernanceProposalUpserted"
  | "GovernanceProposalApproved"
  | "StatusRootUpserted";

export interface EthereumRegistryEvent {
  name: EthereumRegistryEventName;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  args: Record<string, unknown>;
}

export type EthereumTransactionStatus = "pending" | "confirmed" | "failed";

export interface EthereumContractWriteResult {
  txHash: string;
  chainId: number;
  blockNumber: number | null;
  status: EthereumTransactionStatus;
}

export interface EthereumIssuerChainRecord {
  status: EthereumRecordStatus;
  metadataURI: string;
  updatedAt: bigint;
}

export interface EthereumVerifierChainRecord {
  status: EthereumRecordStatus;
  metadataURI: string;
  updatedAt: bigint;
}

export interface EthereumSchemaChainRecord {
  status: EthereumRecordStatus;
  uri: string;
  updatedAt: bigint;
}

export interface EthereumTemplateChainRecord {
  status: EthereumRecordStatus;
  uri: string;
  updatedAt: bigint;
}

export interface EthereumTrustChainRecord {
  registryId: string;
  entityType: string;
  entityId: string;
  did: string;
  metadataURI: string;
  status: EthereumRecordStatus;
  updatedAt: bigint;
}

export interface EthereumGovernanceChainRecord {
  issuerDid: string;
  governanceType: string;
  subjectType: string;
  subjectId: string;
  requiredApprovals: bigint;
  approvalCount: bigint;
  status: EthereumGovernanceStatus;
  policyRef: string;
  metadataURI: string;
  updatedAt: bigint;
}

export interface EthereumStatusRootChainRecord {
  listUri: string;
  rootHash: string;
  updatedAt: bigint;
}
