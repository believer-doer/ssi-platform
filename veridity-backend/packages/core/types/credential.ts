import type { EntityTimestamps, Metadata } from "./common";
import type { GovernanceAnchor } from "./governance";
import type { ProtocolProfile } from "./protocol";

export type CredentialFormatProfile =
  | "vc-jwt"
  | "vc-ldp"
  | "sd-jwt-vc"
  | "bbs-vc"
  | "anoncreds"
  | "iso-mdoc";

export type StatusListProfile = "statuslist2021" | "bitstring-status-list";

export interface CredentialSchemaRef {
  id: string;
  type?:
    | "json-schema"
    | "json-ld-context"
    | "anoncreds-schema"
    | "mdoc-doctype"
    | string;
  version?: string;
}

export interface CredentialTemplateRef {
  id: string;
  version?: string;
}

export interface StatusBinding {
  listId: string;
  listUri?: string;
  index?: number;
  purpose: "revocation" | "suspension";
  profile: StatusListProfile;
  status: "valid" | "suspended" | "revoked";
  updatedAt?: Date;
}

export interface CredentialRecord extends EntityTimestamps {
  id: string;
  tenantId?: string;
  format: CredentialFormatProfile;
  schema: CredentialSchemaRef;
  template?: CredentialTemplateRef;
  issuerDid: string;
  subjectId?: string;
  subjectData: Record<string, unknown>;
  proofType?: string;
  credential?: unknown;
  hash?: string;
  status?: StatusBinding;
  anchors?: GovernanceAnchor[];
  metadata?: Metadata;
}

export interface IssueCredentialRequest {
  tenantId?: string;
  issuerDid: string;
  holderDid?: string;
  subjectId?: string;
  walletId?: string;
  format: CredentialFormatProfile;
  schema: CredentialSchemaRef;
  templateId?: string;
  claims: Record<string, unknown>;
  proofType?: string;
  evidence?: Record<string, unknown>[];
  status?: Partial<StatusBinding>;
  issuanceProtocol?: ProtocolProfile;
  defer?: boolean;
  metadata?: Metadata;
}

export interface IssueCredentialResult {
  record: CredentialRecord;
  format: CredentialFormatProfile;
  credential: unknown;
  deferred?: {
    transactionId: string;
    expiresAt?: Date;
  };
}

export interface VerifyCredentialRequest {
  credential: unknown;
  format: CredentialFormatProfile;
  challenge?: string;
  domain?: string;
  expectedIssuerDid?: string;
  resolveStatus?: boolean;
  metadata?: Metadata;
}

export interface VerifyCredentialResult {
  valid: boolean;
  format: CredentialFormatProfile;
  checks: {
    signature: boolean;
    structure: boolean;
    issuer?: boolean;
    schema?: boolean;
    status?: boolean;
    trust?: boolean;
    challenge?: boolean;
    disclosure?: boolean;
  };
  errors?: string[];
  record?: CredentialRecord | null;
}

export interface PresentationDefinitionConstraint {
  field: string;
  required?: boolean;
  format?: CredentialFormatProfile;
  purpose?: string;
}

export interface PresentationRequest {
  tenantId?: string;
  verifierDid: string;
  holderDid?: string;
  presentationDefinitionId?: string;
  inputDescriptors?: PresentationDefinitionConstraint[];
  challenge: string;
  domain?: string;
  protocols?: ProtocolProfile[];
  metadata?: Metadata;
}

export interface PresentationRecord extends EntityTimestamps {
  id: string;
  tenantId?: string;
  holderDid?: string;
  verifierDid?: string;
  format: CredentialFormatProfile | "mixed";
  presentation: unknown;
  credentialIds?: string[];
  challenge?: string;
  domain?: string;
  metadata?: Metadata;
  hash?: string;
  anchors?: GovernanceAnchor[];
}

export interface VerifyPresentationRequest {
  presentation: unknown;
  format: CredentialFormatProfile | "mixed";
  challenge?: string;
  domain?: string;
  resolveStatus?: boolean;
  verifyTrustChain?: boolean;
  metadata?: Metadata;
}

export interface VerifyPresentationResult {
  valid: boolean;
  format: CredentialFormatProfile | "mixed";
  checks: {
    holderBinding?: boolean;
    challenge?: boolean;
    domain?: boolean;
    credentials?: boolean;
    status?: boolean;
    trust?: boolean;
    disclosure?: boolean;
  };
  errors?: string[];
  record?: PresentationRecord | null;
}

export interface StatusListRecord extends EntityTimestamps {
  id: string;
  tenantId?: string;
  issuerDid: string;
  profile: StatusListProfile;
  purpose: "revocation" | "suspension";
  listUri?: string;
  encodedList?: string;
  size?: number;
  rootHash?: string;
  chainAnchors?: GovernanceAnchor[];
  metadata?: Metadata;
}

export interface StatusMutationRequest {
  statusListId: string;
  credentialId: string;
  operation: "suspend" | "reinstate" | "revoke";
  reason?: string;
  metadata?: Metadata;
}
