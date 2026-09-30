import { Schema, model } from "mongoose";

export interface DIDDocument {
  did: string;
  type: string;
  publicKey: string;
  metadata?: Record<string, any>;
}

const DIDSchema = new Schema<DIDDocument>({
  did: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  publicKey: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
});

export const DIDModel = model<DIDDocument>("DID", DIDSchema);