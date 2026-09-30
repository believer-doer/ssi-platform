import "reflect-metadata";
import { Type } from "class-transformer";
import {
  Allow,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

const CREDENTIAL_FORMATS = [
  "vc-jwt",
  "vc-ldp",
  "sd-jwt-vc",
  "bbs-vc",
  "anoncreds",
  "iso-mdoc",
] as const;

const STATUS_LIST_PROFILES = ["statuslist2021", "bitstring-status-list"] as const;
const STATUS_PURPOSES = ["revocation", "suspension"] as const;
const STATUS_VALUES = ["valid", "suspended", "revoked"] as const;
const WALLET_TYPES = ["internal", "blockchain", "external"] as const;
const KEY_TYPES = ["Ed25519", "Secp256k1"] as const;
const TRUST_ENTITY_TYPES = [
  "issuer",
  "verifier",
  "wallet",
  "schema",
  "template",
  "credential-type",
  "trust-framework",
] as const;
const TRUST_RECORD_STATUSES = ["pending", "active", "suspended", "revoked"] as const;
const GOVERNANCE_TYPES = ["admin", "multisig", "dao", "policy"] as const;
const GOVERNANCE_SUBJECT_TYPES = [
  "issuer",
  "verifier",
  "wallet",
  "schema",
  "template",
  "trust-registry",
  "policy",
] as const;
const PROTOCOLS = [
  "oidc4vci",
  "oidc4vp",
  "siopv2",
  "dcql",
  "didcomm-v2",
  "aries",
  "openid-federation",
] as const;

export class TrustFrameworkMembershipDto {
  @IsString()
  @IsNotEmpty()
  trustFrameworkId!: string;

  @IsOptional()
  @IsString()
  trustFrameworkName?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  roles!: string[];

  @IsIn(TRUST_RECORD_STATUSES)
  memberStatus!: "pending" | "active" | "suspended" | "revoked";

  @IsOptional()
  @IsString()
  accreditedBy?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class IssuerOnboardingDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  did?: string;

  @IsOptional()
  @IsString()
  didMethod?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  publicKey?: string;

  @IsOptional()
  @IsObject()
  publicKeyJwk?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsArray()
  @IsIn(CREDENTIAL_FORMATS, { each: true })
  supportedFormats?: Array<(typeof CREDENTIAL_FORMATS)[number]>;

  @IsOptional()
  @IsArray()
  @IsIn(PROTOCOLS, { each: true })
  supportedProtocols?: Array<(typeof PROTOCOLS)[number]>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrustFrameworkMembershipDto)
  trustFrameworkMemberships?: TrustFrameworkMembershipDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class VerifierOnboardingDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  did?: string;

  @IsOptional()
  @IsString()
  didMethod?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  publicKey?: string;

  @IsOptional()
  @IsObject()
  publicKeyJwk?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsArray()
  @IsIn(PROTOCOLS, { each: true })
  supportedPresentationProfiles?: Array<(typeof PROTOCOLS)[number]>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrustFrameworkMembershipDto)
  trustFrameworkMemberships?: TrustFrameworkMembershipDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class WalletOnboardingDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsIn(KEY_TYPES)
  type?: "Ed25519" | "Secp256k1";

  @IsOptional()
  @IsIn(WALLET_TYPES)
  walletType?: "internal" | "blockchain" | "external";

  @IsOptional()
  @IsString()
  did?: string;

  @IsOptional()
  @IsString()
  didMethod?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  holderId?: string;

  @IsOptional()
  @IsArray()
  @IsIn(CREDENTIAL_FORMATS, { each: true })
  supportedFormats?: Array<(typeof CREDENTIAL_FORMATS)[number]>;

  @IsOptional()
  @IsArray()
  @IsIn(PROTOCOLS, { each: true })
  supportedProtocols?: Array<(typeof PROTOCOLS)[number]>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SchemaRegistrationDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsObject()
  definition!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  uri?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class TemplateRegistrationDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  schemaId!: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsObject()
  defaults?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CredentialSchemaRefDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  version?: string;
}

export class CredentialStatusDto {
  @IsString()
  @IsNotEmpty()
  listId!: string;

  @IsOptional()
  @IsString()
  listUri?: string;

  @IsOptional()
  @IsIn(STATUS_LIST_PROFILES)
  profile?: "statuslist2021" | "bitstring-status-list";

  @IsOptional()
  @IsIn(STATUS_PURPOSES)
  purpose?: "revocation" | "suspension";

  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: "valid" | "suspended" | "revoked";
}

export class IssueCredentialDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsIn(CREDENTIAL_FORMATS)
  format?: (typeof CREDENTIAL_FORMATS)[number];

  @IsOptional()
  @IsString()
  schemaId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CredentialSchemaRefDto)
  schema?: CredentialSchemaRefDto;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  issuer?: string;

  @IsOptional()
  @IsString()
  issuerDid?: string;

  @IsOptional()
  @IsString()
  holderDid?: string;

  @IsOptional()
  @IsObject()
  subject?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  claims?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  proofType?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CredentialStatusDto)
  status?: CredentialStatusDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class VerifyCredentialDto {
  @IsOptional()
  @Allow()
  credential?: unknown;

  @IsOptional()
  @Allow()
  vc?: unknown;

  @IsOptional()
  @IsIn(CREDENTIAL_FORMATS)
  format?: (typeof CREDENTIAL_FORMATS)[number];

  @IsOptional()
  @IsString()
  challenge?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  expectedIssuerDid?: string;

  @IsOptional()
  @IsBoolean()
  resolveStatus?: boolean;
}

export class CreatePresentationDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  @IsNotEmpty()
  verifierDid!: string;

  @IsOptional()
  @IsString()
  holder?: string;

  @IsOptional()
  @IsString()
  holderDid?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  credentialIds!: string[];

  @IsOptional()
  @IsString()
  challenge?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class VerifyPresentationDto {
  @IsOptional()
  @Allow()
  presentation?: unknown;

  @IsOptional()
  @Allow()
  vp?: unknown;

  @IsOptional()
  @IsIn([...CREDENTIAL_FORMATS, "mixed"])
  format?: (typeof CREDENTIAL_FORMATS)[number] | "mixed";

  @IsOptional()
  @IsString()
  challenge?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsBoolean()
  resolveStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  verifyTrustChain?: boolean;
}

export class TenantCreateDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  issuerDid?: string;

  @IsOptional()
  @IsString()
  tier?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @Allow({ each: true })
  policies?: unknown[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class TenantPolicyDto {
  @IsString()
  @IsNotEmpty()
  policyId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  rules!: Record<string, unknown>;
}

export class TrustRegistryCreateDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  @IsNotEmpty()
  registryId!: string;

  @IsIn(TRUST_ENTITY_TYPES)
  entityType!: (typeof TRUST_ENTITY_TYPES)[number];

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsOptional()
  @IsString()
  did?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(TRUST_RECORD_STATUSES)
  status?: "pending" | "active" | "suspended" | "revoked";

  @IsOptional()
  @IsString()
  trustFrameworkId?: string;

  @IsOptional()
  @IsString()
  accreditationLevel?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @IsOptional()
  @IsString()
  metadataUri?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class GovernanceProposalDto {
  @IsOptional()
  @IsString()
  proposalId?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  issuerDid?: string;

  @IsOptional()
  @IsIn(GOVERNANCE_TYPES)
  governanceType?: (typeof GOVERNANCE_TYPES)[number];

  @IsIn(GOVERNANCE_SUBJECT_TYPES)
  subjectType!: (typeof GOVERNANCE_SUBJECT_TYPES)[number];

  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  requiredApprovals?: number;

  @IsOptional()
  @IsString()
  policyRef?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class GovernanceApprovalDto {
  @IsString()
  @IsNotEmpty()
  approverDid!: string;

  @IsOptional()
  @IsString()
  signature?: string;
}

export class PresentationConstraintDto {
  @IsString()
  @IsNotEmpty()
  field!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsIn(CREDENTIAL_FORMATS)
  format?: (typeof CREDENTIAL_FORMATS)[number];

  @IsOptional()
  @IsString()
  purpose?: string;
}

export class ProtocolSessionCreateDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  issuerDid?: string;

  @IsOptional()
  @IsString()
  verifierDid?: string;

  @IsOptional()
  @IsString()
  holderDid?: string;

  @IsOptional()
  @IsString()
  walletId?: string;

  @IsOptional()
  @IsString()
  schemaId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsIn(CREDENTIAL_FORMATS)
  format?: (typeof CREDENTIAL_FORMATS)[number];

  @IsOptional()
  @IsIn(CREDENTIAL_FORMATS)
  credentialFormat?: (typeof CREDENTIAL_FORMATS)[number];

  @IsOptional()
  @IsObject()
  claims?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  challenge?: string;

  @IsOptional()
  @IsString()
  nonce?: string;

  @IsOptional()
  @IsString()
  preAuthorizedCode?: string;

  @IsOptional()
  @IsString()
  authorizationCode?: string;

  @IsOptional()
  @IsString()
  presentationDefinitionId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PresentationConstraintDto)
  inputDescriptors?: PresentationConstraintDto[];

  @IsOptional()
  @IsUrl({
    require_tld: false,
    require_protocol: true,
  })
  callbackUrl?: string;

  @IsOptional()
  @IsBoolean()
  enqueue?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @Allow()
  requestObject?: unknown;
}

export function isNonEmptyObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0;
}

export function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
