import mongoose, { Schema, Document } from "mongoose";

export type DefinitionRegistryType = "internal" | "blockchain";

export interface ICredentialTemplate extends Document {
  templateId: string;
  tenantId?: string;

  title: string;
  description?: string;

  schemaId: string;

  defaults: Record<string, unknown>;

  format?: string;
  enabled: boolean;
  anchors?: Record<string, unknown>[];

  registryType: DefinitionRegistryType;

  chain?: string;
  contractAddress?: string;
  transactionHash?: string;

  metadata?: Record<string, unknown>;
}

const templateSchema = new Schema<ICredentialTemplate>(
  {
    templateId: { type: String, required: true, unique: true },

    title: { type: String, required: true },

    description: { type: String },

    schemaId: { type: String, required: true },

    defaults: { type: Object, default: {} },

    format: { type: String },

    tenantId: { type: String, index: true },

    enabled: { type: Boolean, default: false },

    anchors: { type: [Schema.Types.Mixed], default: [] },

    registryType: {
      type: String,
      enum: ["internal", "blockchain"],
      default: "internal",
    },

    chain: String,

    contractAddress: String,

    transactionHash: String,

    metadata: { type: Object },
  },
  { timestamps: true },
);

export default mongoose.model<ICredentialTemplate>(
  "CredentialTemplate",
  templateSchema,
);

// Field	Purpose
// registryType:	internal vs blockchain
// chain:	polygon / ethereum / etc
// contractAddress:	credential definition contract
// transactionHash	: proof of registration
// metadata:	extensibility
