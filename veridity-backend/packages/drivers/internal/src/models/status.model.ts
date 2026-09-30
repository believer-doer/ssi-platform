import mongoose, { Schema, Document } from "mongoose";

export interface StatusListEntry {
  credentialId: string;
  status: "valid" | "revoked" | "suspended";
  updatedAt: Date;
  reason?: string;
}

export interface IStatusList extends Document {
  statusListId: string;
  issuerDid: string;
  tenantId?: string;
  profile?: string;
  purpose?: string;
  listUri?: string;
  encodedList?: string;
  rootHash?: string;
  chainAnchors?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
  entries: StatusListEntry[];
}

const statusSchema = new Schema<IStatusList>(
  {
    statusListId: { type: String, required: true, unique: true },
    issuerDid: { type: String, required: true },
    tenantId: { type: String },
    profile: { type: String, default: "statuslist2021" },
    purpose: { type: String, default: "revocation" },
    listUri: { type: String },
    encodedList: { type: String },
    rootHash: { type: String },
    chainAnchors: { type: [Schema.Types.Mixed], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
    entries: [
      {
        credentialId: { type: String, required: true },
        status: {
          type: String,
          enum: ["valid", "revoked", "suspended"],
          default: "valid",
        },
        updatedAt: { type: Date, default: Date.now },
        reason: { type: String },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model<IStatusList>("StatusList", statusSchema);
