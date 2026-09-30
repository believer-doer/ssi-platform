import type {
  DriverCapabilityMatrix,
} from "@ssi/core/interfaces/driver.interface";
import type {
  AuditEventRecord,
  CredentialFormatProfile,
  GovernanceAnchor,
  ProtocolProfile,
} from "@ssi/core/types";
import { v4 as uuidv4 } from "uuid";
import { InternalDriver } from "./internal.driver";

type AnchorType = GovernanceAnchor["anchorType"];

export interface HybridBackedDriverOptions {
  name: string;
  network?: string;
  maturity?: DriverCapabilityMatrix["maturity"];
  defaultDidMethod: string;
  didMethods: string[];
  credentialFormats: CredentialFormatProfile[];
  protocols: ProtocolProfile[];
}

export interface HybridBaseDomainServices {
  issuer: any;
  verifier: any;
  wallet: any;
  tenant: any;
  schemaRegistry: any;
  templateRegistry: any;
  trustRegistry: any;
  governance: any;
  status: any;
  audit: any;
  protocol: any;
  credential: any;
  presentation: any;
}

function mergeMetadata(
  metadata: Record<string, unknown> | undefined,
  anchor: GovernanceAnchor,
  extras: Record<string, unknown> = {},
) {
  const existingAnchors = Array.isArray(metadata?.anchors)
    ? (metadata?.anchors as GovernanceAnchor[])
    : [];

  return {
    ...(metadata ?? {}),
    ...extras,
    anchors: [...existingAnchors, anchor],
  };
}

export class HybridBackedDriver extends InternalDriver {
  protected readonly hybridOptions: HybridBackedDriverOptions;
  protected readonly baseDomainServices: HybridBaseDomainServices;

  constructor(options: HybridBackedDriverOptions) {
    super();
    this.hybridOptions = options;
    this.baseDomainServices = {
      issuer: this.issuer!,
      verifier: this.verifier!,
      wallet: this.wallet!,
      tenant: this.tenant!,
      schemaRegistry: this.schemaRegistry!,
      templateRegistry: this.templateRegistry!,
      trustRegistry: this.trustRegistry!,
      governance: this.governance!,
      status: this.status!,
      audit: this.audit!,
      protocol: this.protocol!,
      credential: this.credential!,
      presentation: this.presentation!,
    };
    this.name = options.name;
    this.capabilities = {
      maturity: options.maturity ?? "pilot",
      didMethods: options.didMethods,
      credentialFormats: options.credentialFormats,
      protocols: options.protocols,
      storage: {
        offChain: true,
        onChain: true,
        hybrid: true,
        anchors: true,
        statusRoots: true,
        trustRegistry: true,
        audit: true,
      },
      domains: {
        issuer: true,
        verifier: true,
        wallet: true,
        tenant: true,
        schema: true,
        template: true,
        credential: true,
        presentation: true,
        status: true,
        trustRegistry: true,
        governance: true,
        protocol: true,
        audit: true,
      },
    };
    this.wrapDomainServices();
  }

  override async createDid(input: {
    type?: string;
    method?: string;
    publicKey?: string;
    publicKeyJwk?: Record<string, unknown>;
    domain?: string;
    address?: string;
    network?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    return super.createDid({
      ...input,
      method: input.method ?? input.type ?? this.hybridOptions.defaultDidMethod,
      network: input.network ?? this.hybridOptions.network,
      metadata: mergeMetadata(
        input.metadata,
        this.createAnchor("audit", input.publicKey ?? input.address ?? this.name),
        { driver: this.name, network: this.hybridOptions.network },
      ),
    });
  }

  protected createAnchor(anchorType: AnchorType, subjectId: string): GovernanceAnchor {
    return {
      driver: this.name,
      network: this.hybridOptions.network,
      transactionHash: `${this.name}:${anchorType}:${subjectId}:${uuidv4()}`,
      anchorType,
      anchoredAt: new Date(),
    };
  }

  protected wrapDomainServices() {
    const baseIssuer = this.baseDomainServices.issuer;
    const baseVerifier = this.baseDomainServices.verifier;
    const baseWallet = this.baseDomainServices.wallet;
    const baseTenant = this.baseDomainServices.tenant;
    const baseSchemaRegistry = this.baseDomainServices.schemaRegistry;
    const baseTemplateRegistry = this.baseDomainServices.templateRegistry;
    const baseTrustRegistry = this.baseDomainServices.trustRegistry;
    const baseGovernance = this.baseDomainServices.governance;
    const baseStatus = this.baseDomainServices.status;
    const baseAudit = this.baseDomainServices.audit;
    const baseProtocol = this.baseDomainServices.protocol;
    const baseCredential = this.baseDomainServices.credential;
    const basePresentation = this.baseDomainServices.presentation;

    this.issuer = {
      ...baseIssuer,
      onboard: async (input: any) =>
        baseIssuer.onboard({
          ...input,
          registryType: "hybrid",
          metadata: mergeMetadata(
            input.metadata,
            this.createAnchor("audit", input.did),
            { driver: this.name, network: this.hybridOptions.network },
          ),
        }),
    };

    this.verifier = {
      ...baseVerifier,
      onboard: async (input: any) =>
        baseVerifier.onboard({
          ...input,
          registryType: "hybrid",
          metadata: mergeMetadata(
            input.metadata,
            this.createAnchor("audit", input.did),
            { driver: this.name, network: this.hybridOptions.network },
          ),
        }),
    };

    this.wallet = {
      ...baseWallet,
      onboard: async (input: any) =>
        baseWallet.onboard({
          ...input,
          walletType: input.walletType ?? "blockchain",
          metadata: mergeMetadata(
            input.metadata,
            this.createAnchor("audit", input.did),
            { driver: this.name, network: this.hybridOptions.network },
          ),
        }),
    };

    this.tenant = {
      ...baseTenant,
      create: async (input) =>
        baseTenant.create({
          ...input,
          metadata: mergeMetadata(
            input.metadata,
            this.createAnchor("policy", input.id ?? input.name),
            { driver: this.name, network: this.hybridOptions.network },
          ),
        }),
      applyPolicy: async (tenantId, policy) =>
        baseTenant.applyPolicy?.(tenantId, {
          ...policy,
          metadata: mergeMetadata(
            policy.metadata,
            this.createAnchor("policy", tenantId),
            { driver: this.name, network: this.hybridOptions.network },
          ),
        }) ?? null,
    };

    this.schemaRegistry = {
      ...baseSchemaRegistry,
      register: async (schema) =>
        baseSchemaRegistry.register({
          ...schema,
          registryType: "hybrid",
          metadata: mergeMetadata(
            schema.metadata,
            this.createAnchor("audit", schema.id ?? schema.name),
            { driver: this.name, network: this.hybridOptions.network },
          ),
        }),
    };

    this.templateRegistry = {
      ...baseTemplateRegistry,
      register: async (template) => {
        const anchor = this.createAnchor("audit", template.id ?? template.title);
        return baseTemplateRegistry.register({
          ...template,
          registryType: "blockchain",
          metadata: mergeMetadata(template.metadata, anchor, {
            driver: this.name,
            network: this.hybridOptions.network,
          }),
        });
      },
    };

    this.trustRegistry = {
      ...baseTrustRegistry,
      register: async (record) =>
        baseTrustRegistry.register({
          ...record,
          metadata: mergeMetadata(
            record.metadata,
            this.createAnchor("policy", record.id ?? record.entityId),
            { driver: this.name, network: this.hybridOptions.network },
          ),
        }),
    };

    this.governance = {
      ...baseGovernance,
      createProposal: async (input) => {
        const anchor = this.createAnchor(
          input.governanceType === "policy" ? "policy" : "approval",
          input.subjectId,
        );
        return baseGovernance.createProposal({
          ...input,
          chainAnchors: [...(input.chainAnchors ?? []), anchor],
          metadata: mergeMetadata(input.metadata, anchor, {
            driver: this.name,
            network: this.hybridOptions.network,
          }),
        });
      },
      approve: async (proposalId, approverDid, signature) => {
        const approved = await baseGovernance.approve?.(proposalId, approverDid, signature);
        if (!approved) {
          return null;
        }

        const approvalAnchor = this.createAnchor("approval", proposalId);
        return {
          ...approved,
          chainAnchors: [...(approved.chainAnchors ?? []), approvalAnchor],
          metadata: mergeMetadata(approved.metadata, approvalAnchor, {
            driver: this.name,
            network: this.hybridOptions.network,
          }),
        };
      },
    };

    this.status = {
      ...baseStatus,
      createList: async (input) => {
        const anchor = this.createAnchor("status-root", input.id ?? input.issuerDid);
        return baseStatus.createList({
          ...input,
          metadata: mergeMetadata(input.metadata, anchor, {
            driver: this.name,
            network: this.hybridOptions.network,
          }),
        });
      },
      mutate: async (request) => {
        const updated = await baseStatus.mutate(request);
        if (!updated) {
          return null;
        }

        const anchor = this.createAnchor("status-root", request.statusListId);
        return {
          ...updated,
          chainAnchors: [...(updated.chainAnchors ?? []), anchor],
          metadata: mergeMetadata(updated.metadata, anchor, {
            driver: this.name,
            network: this.hybridOptions.network,
          }),
        };
      },
    };

    this.audit = {
      ...baseAudit,
      record: async (event) => {
        const anchor = this.createAnchor(
          "audit",
          event.subjectId ?? event.id ?? event.action ?? event.eventType,
        );
        return baseAudit.record({
          ...event,
          driver: this.name,
          details: {
            ...(event.details ?? {}),
            anchor,
            network: this.hybridOptions.network,
          },
          hash: event.hash ?? anchor.transactionHash,
        } as Omit<AuditEventRecord, "createdAt" | "updatedAt">);
      },
    };

    this.protocol = {
      ...baseProtocol,
      metadata: async (profile: any) => {
        const metadata = await baseProtocol.metadata(profile);
        if (!metadata) {
          return null;
        }

        return {
          ...metadata,
          metadata: {
            ...(metadata.metadata ?? {}),
            driver: this.name,
            network: this.hybridOptions.network,
            processingMode: "worker-backed",
          },
        };
      },
      createSession: async (profile: any, payload: any) => {
        const anchor = this.createAnchor("audit", String(payload.sessionId ?? profile));
        const session = await baseProtocol.createSession(profile, {
          ...payload,
          metadata: mergeMetadata(
            (payload.metadata as Record<string, unknown> | undefined) ?? {},
            anchor,
            {
              driver: this.name,
              network: this.hybridOptions.network,
              processingMode: "worker-backed",
            },
          ),
        });
        return {
          ...session,
          metadata: mergeMetadata(
            session.metadata as Record<string, unknown> | undefined,
            anchor,
            {
              driver: this.name,
              network: this.hybridOptions.network,
              processingMode: "worker-backed",
            },
          ),
        };
      },
    };

    this.credential = {
      ...baseCredential,
      issue: async (request) => {
        const anchor = this.createAnchor("audit", `${request.issuerDid}:${request.schema.id}`);
        const issued = await baseCredential.issue({
          ...request,
          metadata: mergeMetadata(request.metadata, anchor, {
            driver: this.name,
            network: this.hybridOptions.network,
          }),
        });
        return {
          ...issued,
          record: {
            ...issued.record,
            anchors: [...(issued.record.anchors ?? []), anchor],
            metadata: mergeMetadata(issued.record.metadata, anchor, {
              driver: this.name,
              network: this.hybridOptions.network,
            }),
          },
        };
      },
    };

    this.presentation = {
      ...basePresentation,
      create: async (request) => {
        const anchor = this.createAnchor("audit", `${request.verifierDid}:${request.challenge}`);
        const presentation = await basePresentation.create({
          ...request,
          metadata: mergeMetadata(request.metadata, anchor, {
            driver: this.name,
            network: this.hybridOptions.network,
          }),
        });
        return {
          ...presentation,
          anchors: [...(presentation.anchors ?? []), anchor],
          metadata: mergeMetadata(presentation.metadata, anchor, {
            driver: this.name,
            network: this.hybridOptions.network,
          }),
        };
      },
    };
  }
}
