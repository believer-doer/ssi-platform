import { Schema, model, Document } from "mongoose";

export interface IProtocolSession extends Document {
  id: string;
  protocol: string;
  tenantId?: string;
  issuerDid?: string;
  verifierDid?: string;
  holderDid?: string;
  walletId?: string;
  state: string;
  challenge?: string;
  nonce?: string;
  authorizationCode?: string;
  preAuthorizedCode?: string;
  deepLink?: string;
  qrPayload?: string;
  callbackUrl?: string;
  requestObject?: unknown;
  responseObject?: unknown;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

const protocolSessionSchema = new Schema<IProtocolSession>(
  {
    id: { type: String, required: true, unique: true },
    protocol: { type: String, required: true, index: true },
    tenantId: { type: String, index: true },
    issuerDid: { type: String },
    verifierDid: { type: String },
    holderDid: { type: String },
    walletId: { type: String },
    state: { type: String, required: true, index: true },
    challenge: { type: String },
    nonce: { type: String },
    authorizationCode: { type: String },
    preAuthorizedCode: { type: String },
    deepLink: { type: String },
    qrPayload: { type: String },
    callbackUrl: { type: String },
    requestObject: { type: Schema.Types.Mixed },
    responseObject: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const ProtocolSessionModel = model<IProtocolSession>(
  "ProtocolSession",
  protocolSessionSchema,
);
