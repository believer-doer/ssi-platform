import mongoose, { Schema, Document } from "mongoose";

export interface ITenant extends Document {
  id?: string;
  name: string;
  issuerDid?: string;
  tier: "standard" | "enterprise";
  enabled: boolean;
  policies?: Record<string, unknown>[];
  metadata: Record<string, unknown>;
}

const tenantSchema = new Schema<ITenant>(
  {
    id: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, unique: true },
    issuerDid: { type: String, sparse: true },
    tier: {
      type: String,
      enum: ["standard", "enterprise"],
      default: "standard",
    },
    enabled: { type: Boolean, default: true },
    policies: { type: [Schema.Types.Mixed], default: [] },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true },
);

export default mongoose.model<ITenant>("Tenant", tenantSchema);
