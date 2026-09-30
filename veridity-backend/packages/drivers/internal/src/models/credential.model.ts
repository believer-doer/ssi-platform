import { Schema, model } from "mongoose";

export interface CredentialDocument {
  id: string;
  tenantId?: string;
  format?: string;
  schemaId: string;
  templateId?: string;
  subject: Record<string, any>;
  issuer: string;
  holderDid?: string;
  subjectId?: string;
  proofType?: string;
  credential?: unknown;
  hash?: string;
  status?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  issuedAt: Date;
}

const CredentialSchema = new Schema<CredentialDocument>({
  id: { type: String, required: true, unique: true },
  tenantId: { type: String, index: true },
  format: { type: String, default: "vc-jwt" },
  schemaId: { type: String, required: true },
  templateId: { type: String },
  subject: { type: Schema.Types.Mixed, required: true },
  issuer: { type: String, required: true },
  holderDid: { type: String },
  subjectId: { type: String },
  proofType: { type: String },
  credential: { type: Schema.Types.Mixed },
  hash: { type: String, index: true },
  status: { type: Schema.Types.Mixed },
  metadata: { type: Schema.Types.Mixed, default: {} },
  issuedAt: { type: Date, default: () => new Date() },
}, { timestamps: true });

export const CredentialModel = model<CredentialDocument>("Credential", CredentialSchema);
