import { Document, Schema, model } from "mongoose";

export type BitcoinAnchorBatchStatus =
  | "building"
  | "mempool"
  | "confirmed"
  | "failed"
  | "stale";

export interface IBitcoinAnchorBatch extends Document {
  batchId: string;
  driver: "bitcoin";
  network?: string;
  rootHash: string;
  leafCount: number;
  txid?: string;
  rawTxHex?: string;
  confirmationStatus: BitcoinAnchorBatchStatus;
  confirmations: number;
  blockhash?: string;
  blockheight?: number;
  broadcastAt?: Date;
  confirmedAt?: Date;
  lastCheckedAt?: Date;
  error?: string;
  commitmentIds: string[];
  metadata?: Record<string, unknown>;
}

const bitcoinAnchorBatchSchema = new Schema<IBitcoinAnchorBatch>(
  {
    batchId: { type: String, required: true, unique: true, index: true },
    driver: { type: String, default: "bitcoin", index: true },
    network: { type: String },
    rootHash: { type: String, required: true, index: true },
    leafCount: { type: Number, required: true },
    txid: { type: String, index: true },
    rawTxHex: { type: String },
    confirmationStatus: {
      type: String,
      enum: ["building", "mempool", "confirmed", "failed", "stale"],
      default: "building",
      index: true,
    },
    confirmations: { type: Number, default: 0 },
    blockhash: { type: String },
    blockheight: { type: Number },
    broadcastAt: { type: Date },
    confirmedAt: { type: Date },
    lastCheckedAt: { type: Date },
    error: { type: String },
    commitmentIds: { type: [String], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

bitcoinAnchorBatchSchema.index({ driver: 1, confirmationStatus: 1, createdAt: 1 });

export const BitcoinAnchorBatchModel = model<IBitcoinAnchorBatch>(
  "BitcoinAnchorBatch",
  bitcoinAnchorBatchSchema,
);
