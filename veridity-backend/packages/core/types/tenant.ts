import type { EntityTimestamps, Metadata } from "./common";

export interface TenantPolicy {
  policyId: string;
  name: string;
  version?: string;
  description?: string;
  rules: Record<string, unknown>;
}

export interface TenantRecord extends EntityTimestamps {
  id: string;
  name: string;
  issuerDid?: string;
  tier: "standard" | "enterprise";
  enabled: boolean;
  policies?: TenantPolicy[];
  metadata?: Metadata;
}
