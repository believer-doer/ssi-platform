import type {
  EntityTimestamps,
  Metadata,
  RecordStatus,
  RegistryType,
} from "./common";
import type { CredentialFormatProfile } from "./credential";
import type { ProtocolProfile } from "./protocol";

export type DidMethod =
  | "did:key"
  | "did:web"
  | "did:jwk"
  | "did:ethr"
  | "did:pkh"
  | "did:ion"
  | string;

export interface ActorKeyBinding {
  kid?: string;
  algorithm?: string;
  publicKeyJwk?: Record<string, unknown>;
  privateKeyRef?: string;
  controllerDid?: string;
  purposes?: string[];
}

export interface TrustFrameworkMembership {
  trustFrameworkId: string;
  trustFrameworkName?: string;
  roles: string[];
  memberStatus: "pending" | "active" | "suspended" | "revoked";
  accreditedBy?: string;
  validFrom?: Date;
  validUntil?: Date;
  metadata?: Metadata;
}

export interface RegisteredActorBase extends EntityTimestamps {
  id: string;
  tenantId?: string;
  name: string;
  did: string;
  didMethod?: DidMethod;
  registryType: RegistryType;
  status: RecordStatus;
  metadata?: Metadata;
  keyBindings?: ActorKeyBinding[];
  trustFrameworkMemberships?: TrustFrameworkMembership[];
}

export interface IssuerRecord extends RegisteredActorBase {
  kind: "issuer";
  supportedFormats?: CredentialFormatProfile[];
  supportedProtocols?: ProtocolProfile[];
  credentialConfigurationIds?: string[];
}

export interface VerifierRecord extends RegisteredActorBase {
  kind: "verifier";
  supportedPresentationProfiles?: ProtocolProfile[];
}

export interface WalletRecord extends RegisteredActorBase {
  kind: "wallet";
  walletType: "internal" | "blockchain" | "external";
  address?: string;
  holderId?: string;
}
