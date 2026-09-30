import { Document, Schema, model } from "mongoose";

export type BitcoinCommitmentSourceKind =
  | "trust-registry"
  | "governance"
  | "status-list"
  | "audit";

export type BitcoinCommitmentStatus =
  | "queued"
  | "batched"
  | "mempool"
  | "confirmed"
  | "failed"
  | "stale";

export interface IBitcoinMerkleProofNode {
  position: "left" | "right";
  hash: string;
}

export interface IBitcoinAnchorCommitment extends Document {
  commitmentId: string;
  commitmentKey: string;
  driver: "bitcoin";
  network?: string;
  sourceKind: BitcoinCommitmentSourceKind;
  sourceId: string;
  tenantId?: string;
  subjectId?: string;
  anchorType: "approval" | "policy" | "audit" | "status-root";
  payload: Record<string, unknown>;
  payloadHash: string;
  leafHash: string;
  batchId?: string;
  txid?: string;
  rootHash?: string;
  merkleProof: IBitcoinMerkleProofNode[];
  confirmationStatus: BitcoinCommitmentStatus;
  confirmations: number;
  blockhash?: string;
  blockheight?: number;
  anchoredAt?: Date;
  lastCheckedAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

const bitcoinMerkleProofNodeSchema = new Schema<IBitcoinMerkleProofNode>(
  {
    position: {
      type: String,
      enum: ["left", "right"],
      required: true,
    },
    hash: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const bitcoinAnchorCommitmentSchema = new Schema<IBitcoinAnchorCommitment>(
  {
    commitmentId: { type: String, required: true, unique: true, index: true },
    commitmentKey: { type: String, required: true, unique: true, index: true },
    driver: { type: String, default: "bitcoin", index: true },
    network: { type: String },
    sourceKind: {
      type: String,
      enum: ["trust-registry", "governance", "status-list", "audit"],
      required: true,
      index: true,
    },
    sourceId: { type: String, required: true, index: true },
    tenantId: { type: String, index: true },
    subjectId: { type: String, index: true },
    anchorType: {
      type: String,
      enum: ["approval", "policy", "audit", "status-root"],
      required: true,
    },
    payload: { type: Schema.Types.Mixed, required: true },
    payloadHash: { type: String, required: true, index: true },
    leafHash: { type: String, required: true },
    batchId: { type: String, index: true },
    txid: { type: String, index: true },
    rootHash: { type: String, index: true },
    merkleProof: { type: [bitcoinMerkleProofNodeSchema], default: [] },
    confirmationStatus: {
      type: String,
      enum: ["queued", "batched", "mempool", "confirmed", "failed", "stale"],
      default: "queued",
      index: true,
    },
    confirmations: { type: Number, default: 0 },
    blockhash: { type: String },
    blockheight: { type: Number },
    anchoredAt: { type: Date },
    lastCheckedAt: { type: Date },
    error: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

bitcoinAnchorCommitmentSchema.index({ driver: 1, confirmationStatus: 1, createdAt: 1 });

export const BitcoinAnchorCommitmentModel = model<IBitcoinAnchorCommitment>(
  "BitcoinAnchorCommitment",
  bitcoinAnchorCommitmentSchema,
);
