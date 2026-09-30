import type { EntityTimestamps, Metadata } from "./common";
import type { GovernanceAnchor } from "./governance";

export { type VerifierRecord } from "./actors";

export type TrustRegistryEntityType =
  | "issuer"
  | "verifier"
  | "wallet"
  | "schema"
  | "template"
  | "credential-type"
  | "trust-framework";

export interface TrustRegistryRecord extends EntityTimestamps {
  id: string;
  tenantId?: string;
  registryId: string;
  entityType: TrustRegistryEntityType;
  entityId: string;
  did?: string;
  name?: string;
  status: "pending" | "active" | "suspended" | "revoked";
  trustFrameworkId?: string;
  accreditationLevel?: string;
  scopes?: string[];
  metadataUri?: string;
  hash?: string;
  anchors?: GovernanceAnchor[];
  metadata?: Metadata;
}

export interface TrustRegistryQuery {
  registryId?: string;
  entityType?: TrustRegistryEntityType;
  entityId?: string;
  did?: string;
  status?: TrustRegistryRecord["status"];
  trustFrameworkId?: string;
}

export interface TrustRegistryResolution {
  matched: boolean;
  record?: TrustRegistryRecord | null;
  errors?: string[];
}
