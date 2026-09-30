import { Schema, model } from "mongoose";

export interface PresentationDocument {
  id: string;
  tenantId?: string;
  format?: string;
  credentialIds: string[];
  holder: string;
  verifier?: string;
  presentation?: unknown;
  challenge?: string;
  domain?: string;
  hash?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const PresentationSchema = new Schema<PresentationDocument>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, index: true },
  format: { type: String, default: "mixed" },
  credentialIds: { type: [String], required: true },
  holder: { type: String, required: true },
  verifier: { type: String },
  presentation: { type: Schema.Types.Mixed },
  challenge: { type: String },
  domain: { type: String },
  hash: { type: String, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: () => new Date() },
}, { timestamps: true });

export const PresentationModel = model<PresentationDocument>("Presentation", PresentationSchema);
