import { Schema, model } from "mongoose";

export interface SchemaDocument {
  id: string;
  tenantId?: string;
  name: string;
  version?: string;
  format?: string;
  registryType?: string;
  uri?: string;
  hash?: string;
  active?: boolean;
  anchors?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
  definition: Record<string, any>;
  createdAt: Date;
}

const SchemaSchema = new Schema<SchemaDocument>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, index: true },
  name: { type: String, required: true },
  version: { type: String },
  format: { type: String },
  registryType: { type: String, default: "internal" },
  uri: { type: String },
  hash: { type: String },
  active: { type: Boolean, default: false },
  anchors: { type: [Schema.Types.Mixed], default: [] },
  metadata: { type: Schema.Types.Mixed, default: {} },
  definition: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: () => new Date() },
}, { timestamps: true });

export const SchemaModel = model<SchemaDocument>("Schema", SchemaSchema);
