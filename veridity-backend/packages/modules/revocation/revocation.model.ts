import mongoose, { Schema, Document } from "mongoose";

export interface RevocationEntry {
  credentialId: string;
  revokedAt: Date;
}

export interface IRevocationList extends Document {
  listId: string;
  issuerDid: string;
  tenantId?: string;
  statusListUri?: string;
  revokedEntries: RevocationEntry[];
}

const revocationSchema = new Schema<IRevocationList>(
  {
    listId: { type: String, required: true, unique: true },
    issuerDid: { type: String, required: true },
    tenantId: { type: String },
    statusListUri: { type: String },
    revokedEntries: [
      {
        credentialId: { type: String, required: true },
        revokedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model<IRevocationList>(
  "RevocationList",
  revocationSchema,
);
