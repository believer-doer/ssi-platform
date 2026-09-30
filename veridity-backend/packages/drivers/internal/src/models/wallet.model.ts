import mongoose, { Schema, Document } from "mongoose";

export interface IWallet extends Document {
  walletId: string;
  holderId?: string;

  did: string;
  name?: string;
  tenantId?: string;
  didMethod?: string;

  walletType: "internal" | "blockchain" | "external";

  address?: string;

  publicKey?: string;
  supportedFormats?: string[];
  supportedProtocols?: string[];
  keyBindings?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;

  keyRef?: string;
}

const walletSchema = new Schema<IWallet>(
  {
    walletId: { type: String, required: true, unique: true },
    tenantId: { type: String, index: true },
    holderId: { type: String, index: true },

    name: { type: String },

    did: { type: String, required: true, unique: true },

    didMethod: { type: String },

    walletType: {
      type: String,
      enum: ["internal", "blockchain", "external"],
      required: true,
    },

    address: { type: String },

    publicKey: { type: String },

    supportedFormats: { type: [String], default: [] },

    supportedProtocols: { type: [String], default: [] },

    keyBindings: { type: [Schema.Types.Mixed], default: [] },

    metadata: { type: Schema.Types.Mixed, default: {} },

    keyRef: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model<IWallet>("Wallet", walletSchema);
