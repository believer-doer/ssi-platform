// modules/verifiers/verifier.model.ts
import { Schema, model, Document } from "mongoose";
import type { VerifierRecord } from "@ssi/core/types";

export interface IVerifier extends Document {
  id: string;
  tenantId?: string;
  did: string;
  didMethod?: string;
  type?: string;
  kind: VerifierRecord["kind"];
  name?: string;
  registryType?: VerifierRecord["registryType"];
  keyBindings?: VerifierRecord["keyBindings"];
  trustFrameworkMemberships?: VerifierRecord["trustFrameworkMemberships"];
  supportedPresentationProfiles?: VerifierRecord["supportedPresentationProfiles"];
  publicKeyJwk?: Record<string, unknown>;
  status: "pending" | "active" | "suspended" | "revoked";
  metadata?: Record<string, unknown>;
}

const verifierSchema = new Schema<IVerifier>(
  {
    tenantId: { type: String, index: true },
    id: { type: String, required: true, unique: true },
    did: { type: String, required: true, unique: true, index: true },
    didMethod: { type: String },
    type: {
      type: String,
      enum: ["internal", "oauth", "blockchain"],
      default: "internal",
    },
    name: { type: String },
    registryType: {
      type: String,
      enum: ["internal", "blockchain"],
      default: "internal",
    },
    kind: { type: String, default: "verifier" },
    keyBindings: { type: [Schema.Types.Mixed], default: [] },
    trustFrameworkMemberships: { type: [Schema.Types.Mixed], default: [] },
    supportedPresentationProfiles: { type: [String], default: [] },
    publicKeyJwk: { type: Schema.Types.Mixed },
    status: { type: String, enum: ["pending", "active", "suspended", "revoked"], default: "pending" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export default model<IVerifier>("Verifier", verifierSchema);
