import type {
  DeferredExchangeRecord,
  Metadata,
  ProtocolMetadataRecord,
  ProtocolProfile,
  ProtocolSession,
} from "../types";

export interface ProtocolExecutionContext {
  driver: string;
  baseUrl?: string;
  tenantId?: string;
}

export interface ProtocolHandler {
  id: ProtocolProfile;
  buildMetadata(
    context: ProtocolExecutionContext,
  ): Promise<ProtocolMetadataRecord>;
  createSession?(
    input: Metadata,
    context: ProtocolExecutionContext,
  ): Promise<ProtocolSession>;
  getDeepLink?(
    session: ProtocolSession,
    context: ProtocolExecutionContext,
  ): Promise<string>;
  handleCallback?(
    payload: Metadata,
    context: ProtocolExecutionContext,
  ): Promise<ProtocolSession>;
  resolveDeferredExchange?(
    transactionId: string,
    context: ProtocolExecutionContext,
  ): Promise<DeferredExchangeRecord | null>;
}

export class ProtocolRegistry {
  private readonly handlers = new Map<ProtocolProfile, ProtocolHandler>();

  register(handler: ProtocolHandler) {
    this.handlers.set(handler.id, handler);
  }

  get(profile: ProtocolProfile) {
    return this.handlers.get(profile) ?? null;
  }

  supports(profile: ProtocolProfile) {
    return this.handlers.has(profile);
  }

  list() {
    return Array.from(this.handlers.values());
  }
}

export const DEFAULT_PROTOCOL_PROFILES: ProtocolProfile[] = [
  "oidc4vci",
  "oidc4vp",
  "siopv2",
  "dcql",
  "didcomm-v2",
  "aries",
  "openid-federation",
];
