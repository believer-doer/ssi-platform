import type {
  AuditEventRecord,
  CredentialFormatProfile,
  DeferredExchangeRecord,
  GovernanceProposal,
  IssueCredentialRequest,
  IssueCredentialResult,
  CredentialRecord,
  IssuerRecord,
  PageResult,
  PresentationRecord,
  PresentationRequest,
  ProtocolMetadataRecord,
  ProtocolProfile,
  ProtocolSession,
  SchemaRecord,
  StatusListRecord,
  StatusMutationRequest,
  TemplateRecord,
  TenantPolicy,
  TenantRecord,
  TrustRegistryQuery,
  TrustRegistryRecord,
  VerifyCredentialRequest,
  VerifyCredentialResult,
  VerifyPresentationRequest,
  VerifyPresentationResult,
  VerifierRecord,
  WalletRecord,
} from "../types";

export interface KeyManagementService {
  createKey(type?: "Ed25519" | "Secp256k1"): unknown;
  getKey(id: string): unknown;
  listKeys(): unknown[];
}

export interface DriverCapabilityMatrix {
  maturity?: "prototype" | "pilot" | "production";
  didMethods: string[];
  credentialFormats: CredentialFormatProfile[];
  protocols: ProtocolProfile[];
  storage: {
    offChain: boolean;
    onChain: boolean;
    hybrid: boolean;
    anchors: boolean;
    statusRoots: boolean;
    trustRegistry: boolean;
    audit: boolean;
  };
  domains: {
    issuer: boolean;
    verifier: boolean;
    wallet: boolean;
    tenant: boolean;
    schema: boolean;
    template: boolean;
    credential: boolean;
    presentation: boolean;
    status: boolean;
    trustRegistry: boolean;
    governance: boolean;
    protocol: boolean;
    audit: boolean;
  };
}

export interface IssuerOperations {
  onboard(input: Partial<IssuerRecord> & Pick<IssuerRecord, "name" | "did">): Promise<IssuerRecord>;
  getByDid(did: string): Promise<IssuerRecord | null>;
  list?(tenantId?: string): Promise<IssuerRecord[] | PageResult<IssuerRecord>>;
  updateStatus?(did: string, status: IssuerRecord["status"]): Promise<IssuerRecord | null>;
}

export interface VerifierOperations {
  onboard(input: Partial<VerifierRecord> & Pick<VerifierRecord, "name" | "did">): Promise<VerifierRecord>;
  getByDid(did: string): Promise<VerifierRecord | null>;
  list?(tenantId?: string): Promise<VerifierRecord[] | PageResult<VerifierRecord>>;
  updateStatus?(did: string, status: VerifierRecord["status"]): Promise<VerifierRecord | null>;
}

export interface WalletOperations {
  onboard(input: Partial<WalletRecord> & Pick<WalletRecord, "name" | "did" | "walletType">): Promise<WalletRecord>;
  getByDid(did: string): Promise<WalletRecord | null>;
  list?(tenantId?: string): Promise<WalletRecord[] | PageResult<WalletRecord>>;
}

export interface SchemaOperations {
  register(schema: Omit<SchemaRecord, "createdAt" | "updatedAt">): Promise<SchemaRecord>;
  get(schemaId: string): Promise<SchemaRecord | null>;
  list?(tenantId?: string): Promise<SchemaRecord[] | PageResult<SchemaRecord>>;
  activate?(schemaId: string): Promise<SchemaRecord | null>;
}

export interface TemplateOperations {
  register(template: Omit<TemplateRecord, "createdAt" | "updatedAt">): Promise<TemplateRecord>;
  get(templateId: string): Promise<TemplateRecord | null>;
  list?(tenantId?: string): Promise<TemplateRecord[] | PageResult<TemplateRecord>>;
  activate?(templateId: string): Promise<TemplateRecord | null>;
}

export interface CredentialOperations {
  issue(request: IssueCredentialRequest): Promise<IssueCredentialResult>;
  verify(request: VerifyCredentialRequest): Promise<VerifyCredentialResult>;
  list?(tenantId?: string): Promise<CredentialRecord[] | PageResult<CredentialRecord>>;
}

export interface PresentationOperations {
  create(request: PresentationRequest): Promise<PresentationRecord>;
  verify(request: VerifyPresentationRequest): Promise<VerifyPresentationResult>;
}

export interface StatusOperations {
  createList(input: Omit<StatusListRecord, "createdAt" | "updatedAt">): Promise<StatusListRecord>;
  getList(statusListId: string): Promise<StatusListRecord | null>;
  mutate(request: StatusMutationRequest): Promise<StatusListRecord | null>;
}

export interface TrustRegistryOperations {
  register(record: Omit<TrustRegistryRecord, "createdAt" | "updatedAt">): Promise<TrustRegistryRecord>;
  get(recordId: string): Promise<TrustRegistryRecord | null>;
  query?(query: TrustRegistryQuery): Promise<TrustRegistryRecord[] | PageResult<TrustRegistryRecord>>;
  updateStatus?(recordId: string, status: TrustRegistryRecord["status"]): Promise<TrustRegistryRecord | null>;
}

export interface GovernanceOperations {
  createProposal(input: Omit<GovernanceProposal, "createdAt" | "updatedAt">): Promise<GovernanceProposal>;
  getProposal(proposalId: string): Promise<GovernanceProposal | null>;
  listProposals?(tenantId?: string): Promise<GovernanceProposal[] | PageResult<GovernanceProposal>>;
  approve?(proposalId: string, approverDid: string, signature?: string): Promise<GovernanceProposal | null>;
}

export interface TenantOperations {
  create(input: Omit<TenantRecord, "createdAt" | "updatedAt">): Promise<TenantRecord>;
  get(tenantId: string): Promise<TenantRecord | null>;
  list?(): Promise<TenantRecord[] | PageResult<TenantRecord>>;
  applyPolicy?(tenantId: string, policy: TenantPolicy): Promise<TenantRecord | null>;
}

export interface ProtocolOperations {
  metadata(profile: ProtocolProfile): Promise<ProtocolMetadataRecord | null>;
  createSession(profile: ProtocolProfile, payload: Record<string, unknown>): Promise<ProtocolSession>;
  getSession?(sessionId: string): Promise<ProtocolSession | null>;
  getDeferredExchange?(transactionId: string): Promise<DeferredExchangeRecord | null>;
}

export interface AuditOperations {
  record(event: Omit<AuditEventRecord, "createdAt" | "updatedAt">): Promise<AuditEventRecord>;
  get(eventId: string): Promise<AuditEventRecord | null>;
  list?(tenantId?: string): Promise<AuditEventRecord[] | PageResult<AuditEventRecord>>;
}

export interface SSIDriver {
  name: string;
  kms?: KeyManagementService;
  capabilities?: DriverCapabilityMatrix;

  issuer?: IssuerOperations;
  verifier?: VerifierOperations;
  wallet?: WalletOperations;
  schemaRegistry?: SchemaOperations;
  templateRegistry?: TemplateOperations;
  credential?: CredentialOperations;
  presentation?: PresentationOperations;
  status?: StatusOperations;
  trustRegistry?: TrustRegistryOperations;
  governance?: GovernanceOperations;
  tenant?: TenantOperations;
  protocol?: ProtocolOperations;
  audit?: AuditOperations;

  // Legacy methods kept for backward compatibility with existing modules.
  createDid(input: any): Promise<string>;
  resolveDid(did: string): Promise<any>;
  registerSchema(schema: any): Promise<any>;
  getSchema(schemaId: string): Promise<any>;
  issueCredential(payload: any): Promise<any>;
  verifyCredential(vc: any): Promise<boolean>;
  createPresentation(input: any): Promise<any>;
  verifyPresentation(vp: any): Promise<boolean>;
}
