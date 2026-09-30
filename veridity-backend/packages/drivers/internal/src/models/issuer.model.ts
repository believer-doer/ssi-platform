import mongoose, { Schema, Document } from "mongoose";

export interface IIssuer extends Document {
  issuerId: string;
  tenantId?: string;
  name: string;
  did: string;
  didMethod?: string;

  registryType: "internal" | "blockchain";
  supportedFormats?: string[];
  supportedProtocols?: string[];
  trustFrameworkMemberships?: Record<string, unknown>[];
  keyBindings?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;

  publicKeyJwk?: Record<string, any>;
  privateKeyRef?: string;
  kid?: string;

  status: "pending" | "active" | "suspended" | "revoked";
}

const issuerSchema = new Schema<IIssuer>(
  {
    issuerId: { type: String, required: true, unique: true },
    tenantId: { type: String, index: true },

    name: { type: String, required: true },

    did: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    didMethod: { type: String },

    registryType: {
      type: String,
      enum: ["internal", "blockchain"],
      default: "internal",
    },

    supportedFormats: { type: [String], default: [] },

    supportedProtocols: { type: [String], default: [] },

    trustFrameworkMemberships: { type: [Schema.Types.Mixed], default: [] },

    keyBindings: { type: [Schema.Types.Mixed], default: [] },

    metadata: { type: Schema.Types.Mixed, default: {} },

    publicKeyJwk: { type: Object },

    privateKeyRef: { type: String },

    kid: { type: String },

    status: {
      type: String,
      enum: ["pending", "active", "suspended", "revoked"],
      default: "pending",
    },
  },
  { timestamps: true },
);


issuerSchema.index({ did: 1, status: 1 });
issuerSchema.index({ issuerId: 1, tenantId: 1 });

export default mongoose.model<IIssuer>("Issuer", issuerSchema);
