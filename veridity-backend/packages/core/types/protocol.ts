import type { Metadata } from "./common";
import type { CredentialFormatProfile } from "./credential";

export type ProtocolProfile =
  | "oidc4vci"
  | "oidc4vp"
  | "siopv2"
  | "dcql"
  | "didcomm-v2"
  | "aries"
  | "openid-federation";

export type ProtocolSessionState =
  | "created"
  | "pending"
  | "authorized"
  | "issued"
  | "presented"
  | "verified"
  | "expired"
  | "cancelled"
  | "failed";

export type ProtocolEndpointType =
  | "metadata"
  | "authorization"
  | "token"
  | "credential"
  | "batch-credential"
  | "deferred-credential"
  | "presentation"
  | "response"
  | "callback"
  | "jwks"
  | "qr";

export interface ProtocolEndpoint {
  type: ProtocolEndpointType;
  url: string;
  methods?: string[];
  authenticated?: boolean;
}

export interface ProtocolMetadataRecord {
  protocol: ProtocolProfile;
  issuerId?: string;
  verifierId?: string;
  walletId?: string;
  supportedCredentialFormats?: CredentialFormatProfile[];
  supportedDidMethods?: string[];
  scopes?: string[];
  endpoints: ProtocolEndpoint[];
  metadata?: Metadata;
}

export interface ProtocolSession {
  id: string;
  protocol: ProtocolProfile;
  tenantId?: string;
  issuerDid?: string;
  verifierDid?: string;
  holderDid?: string;
  walletId?: string;
  state: ProtocolSessionState;
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
  metadata?: Metadata;
}

export interface DeferredExchangeRecord {
  transactionId: string;
  protocol: ProtocolProfile;
  sessionId?: string;
  credentialFormat: CredentialFormatProfile;
  state: "pending" | "ready" | "expired" | "claimed" | "failed";
  subjectId?: string;
  expiresAt?: Date;
  metadata?: Metadata;
}
