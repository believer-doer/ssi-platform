export interface Oidc4vpSession {
  state: string;
  nonce?: string;
  challenge?: string;
  verifierDid?: string;
  holderDid?: string;
  requestUri?: string;
  presentationDefinition?: Record<string, unknown>;
  response?: unknown;
  expiresAt?: number;
}
