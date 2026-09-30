import { Schema, model, Document } from "mongoose";

export interface ITrustRegistryRecord extends Document {
  id: string;
  tenantId?: string;
  registryId: string;
  entityType: string;
  entityId: string;
  did?: string;
  name?: string;
  status: "pending" | "active" | "suspended" | "revoked";
  trustFrameworkId?: string;
  accreditationLevel?: string;
  scopes?: string[];
  metadataUri?: string;
  hash?: string;
  anchors?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
}

const trustRegistrySchema = new Schema<ITrustRegistryRecord>(
  {
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, index: true },
    registryId: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    did: { type: String, index: true },
    name: { type: String },
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "revoked"],
      default: "pending",
    },
    trustFrameworkId: { type: String, index: true },
    accreditationLevel: { type: String },
    scopes: { type: [String], default: [] },
    metadataUri: { type: String },
    hash: { type: String, index: true },
    anchors: { type: [Schema.Types.Mixed], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

trustRegistrySchema.index({ registryId: 1, entityType: 1, entityId: 1 });

export const TrustRegistryModel = model<ITrustRegistryRecord>(
  "TrustRegistryRecord",
  trustRegistrySchema,
);
