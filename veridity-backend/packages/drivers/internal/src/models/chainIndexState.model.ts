import { Document, Schema, model } from "mongoose";

export interface IChainIndexState extends Document {
  driver: string;
  registryAddress: string;
  chainId?: number;
  lastProcessedBlock: number;
  lastProcessedLogIndex: number;
  metadata?: Record<string, unknown>;
}

const chainIndexStateSchema = new Schema<IChainIndexState>(
  {
    driver: { type: String, required: true, index: true },
    registryAddress: { type: String, required: true, index: true },
    chainId: { type: Number },
    lastProcessedBlock: { type: Number, default: 0 },
    lastProcessedLogIndex: { type: Number, default: -1 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

chainIndexStateSchema.index({ driver: 1, registryAddress: 1 }, { unique: true });

export const ChainIndexStateModel = model<IChainIndexState>(
  "ChainIndexState",
  chainIndexStateSchema,
);
