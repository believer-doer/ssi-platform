import type { EntityTimestamps, Metadata, RegistryType } from "./common";
import type { CredentialFormatProfile } from "./credential";
import type { GovernanceAnchor } from "./governance";

export interface SchemaRecord extends EntityTimestamps {
  id: string;
  tenantId?: string;
  name: string;
  version?: string;
  format?: CredentialFormatProfile | "agnostic";
  registryType: RegistryType;
  definition: Record<string, unknown>;
  uri?: string;
  hash?: string;
  active?: boolean;
  metadata?: Metadata;
  anchors?: GovernanceAnchor[];
}

export interface TemplateRecord extends EntityTimestamps {
  id: string;
  tenantId?: string;
  title: string;
  description?: string;
  schemaId: string;
  format?: CredentialFormatProfile;
  defaults?: Record<string, unknown>;
  registryType: RegistryType;
  enabled: boolean;
  uri?: string;
  hash?: string;
  metadata?: Metadata;
  anchors?: GovernanceAnchor[];
}
