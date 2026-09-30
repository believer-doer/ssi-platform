import { createHash } from "crypto";
import { ethers } from "ethers";
import type {
  GovernanceAnchor,
  GovernanceProposal,
  IssueCredentialRequest,
  VerifyCredentialRequest,
  Metadata,
  StatusMutationRequest,
  StatusListRecord,
  TrustRegistryRecord,
} from "@ssi/core/types";
import { ChainIndexStateModel } from "../../internal/src/models/chainIndexState.model";
import { CredentialModel } from "../../internal/src/models/credential.model";
import IssuerModel from "../../internal/src/models/issuer.model";
import VerifierModel from "../../internal/src/models/verifier.model";
import { SchemaModel } from "../../internal/src/models/schema.model";
import CredentialTemplateModel from "../../internal/src/models/credentialTemplate.model";
import GovernanceModel from "../../internal/src/models/governance.model";
import StatusListModel from "../../internal/src/models/status.model";
import { TrustRegistryModel } from "../../internal/src/models/trustRegistry.model";
import { HybridBackedDriver } from "../../internal/src/hybrid.driver";
import type {
  EthereumContractWriteResult,
  EthereumDriverOptions,
  EthereumGovernanceStatus,
  EthereumRegistryEvent,
  EthereumRecordStatus,
} from "./chain/config";
import { EthereumRegistryClient } from "./chain/registry.client";

function hashValue(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function appendAnchorList<T extends GovernanceAnchor>(
  anchors: T[] | undefined,
  anchor: T,
) {
  return [...(anchors ?? []), anchor];
}

function mergeMetadata(
  metadata: Metadata | undefined,
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

export class EthereumDriver extends HybridBackedDriver {
  readonly provider: ethers.JsonRpcProvider;
  readonly signer: ethers.Signer;
  readonly registryClient: EthereumRegistryClient | null;
  readonly chainId?: number;
  readonly registryAddress?: string;
  readonly registryDeployBlock?: number;
  private stopRegistryWatcher?: () => void;
  private registryEventQueue: Promise<void> = Promise.resolve();

  constructor(options: EthereumDriverOptions = {}) {
    super({
      name: "ethereum",
      network: "ethereum",
      maturity: "pilot",
      defaultDidMethod: "ethr",
      didMethods: ["did:ethr", "did:pkh", "did:key", "did:jwk"],
      credentialFormats: ["vc-jwt", "vc-ldp", "sd-jwt-vc", "bbs-vc"],
      protocols: ["oidc4vci", "oidc4vp", "siopv2", "dcql", "didcomm-v2"],
    });
    this.provider = options.provider ?? new ethers.JsonRpcProvider(options.rpcUrl || "http://localhost:8545");
    const baseSigner = options.signer
      ?? (options.privateKey
        ? new ethers.Wallet(options.privateKey, this.provider)
        : ethers.Wallet.createRandom().connect(this.provider));
    this.signer = baseSigner instanceof ethers.NonceManager
      ? baseSigner
      : new ethers.NonceManager(baseSigner);
    this.chainId = options.chainId;
    this.registryAddress = options.registryAddress;
    this.registryDeployBlock = options.registryDeployBlock;
    this.registryClient = options.registryAddress
      ? new EthereumRegistryClient({
        provider: this.provider,
        signer: this.signer,
        registryAddress: options.registryAddress,
        chainId: options.chainId,
      })
      : null;

    if (this.registryClient) {
      this.wrapRegistryBackedDomainServices();
    }
  }

  get hasRegistryClient() {
    return this.registryClient !== null;
  }

  private wrapRegistryBackedDomainServices() {
    const client = this.registryClient;
    if (!client) {
      return;
    }

    const baseIssuer = this.baseDomainServices.issuer;
    const baseVerifier = this.baseDomainServices.verifier;
    const baseSchemaRegistry = this.baseDomainServices.schemaRegistry;
    const baseTemplateRegistry = this.baseDomainServices.templateRegistry;
    const baseTrustRegistry = this.baseDomainServices.trustRegistry;
    const baseGovernance = this.baseDomainServices.governance;
    const baseStatus = this.baseDomainServices.status;
    const baseCredential = this.baseDomainServices.credential;

    this.issuer = {
      ...this.issuer,
      onboard: async (input: any) => {
        const anchor = await this.writeIssuerToChain(input.did, input.id ?? input.issuerId ?? input.did, "pending");
        return baseIssuer.onboard({
          ...input,
          registryType: "blockchain",
          metadata: this.mergeChainMetadata(input.metadata, anchor, {
            registryAddress: this.registryAddress,
          }),
        });
      },
      updateStatus: async (did: string, status: any) => {
        const current = await baseIssuer.getByDid(did);
        if (!current) return null;
        if (status === "active") {
          await this.ensureApprovedGovernance({
            subjectType: "issuer",
            subjectIds: [current.id, did, current.name],
            tenantId: current.tenantId,
            issuerDid: did,
            operation: `activating issuer '${did}'`,
          });
        }

        const anchor = await this.writeIssuerToChain(did, current.id ?? did, this.toEthereumRecordStatus(status));
        const issuer = await baseIssuer.updateStatus?.(did, status);
        if (!issuer) return null;

        await IssuerModel.findOneAndUpdate(
          { did },
          { metadata: this.mergeChainMetadata(issuer.metadata, anchor, { registryAddress: this.registryAddress }) },
          { new: true },
        );

        return baseIssuer.getByDid(did);
      },
      getByDid: async (did: string) => {
        await this.reconcileIssuerByDid(did);
        return baseIssuer.getByDid(did);
      },
    };

    this.verifier = {
      ...this.verifier,
      onboard: async (input: any) => {
        const anchor = await this.writeVerifierToChain(input.did, input.id ?? input.did, "pending");
        return baseVerifier.onboard({
          ...input,
          registryType: "blockchain",
          metadata: this.mergeChainMetadata(input.metadata, anchor, {
            registryAddress: this.registryAddress,
          }),
        });
      },
      updateStatus: async (did: string, status: any) => {
        const current = await baseVerifier.getByDid(did);
        if (!current) return null;
        if (status === "active") {
          await this.ensureApprovedGovernance({
            subjectType: "verifier",
            subjectIds: [current.id, did, current.name],
            tenantId: current.tenantId,
            operation: `activating verifier '${did}'`,
          });
        }

        const anchor = await this.writeVerifierToChain(did, current.id ?? did, this.toEthereumRecordStatus(status));
        const verifier = await baseVerifier.updateStatus?.(did, status);
        if (!verifier) return null;

        await VerifierModel.findOneAndUpdate(
          { did },
          { metadata: this.mergeChainMetadata(verifier.metadata, anchor, { registryAddress: this.registryAddress }) },
          { new: true },
        );

        return baseVerifier.getByDid(did);
      },
      getByDid: async (did: string) => {
        await this.reconcileVerifierByDid(did);
        return baseVerifier.getByDid(did);
      },
    };

    this.schemaRegistry = {
      ...this.schemaRegistry,
      register: async (schema: any) => {
        const schemaId = schema.id ?? `schema:${Date.now()}`;
        const anchor = await this.writeSchemaToChain(schemaId, this.schemaUri(schemaId, schema), "pending");
        return baseSchemaRegistry.register({
          ...schema,
          id: schemaId,
          registryType: "blockchain",
          anchors: appendAnchorList(schema.anchors, anchor),
          metadata: this.mergeChainMetadata(schema.metadata, anchor, {
            registryAddress: this.registryAddress,
          }),
        });
      },
      activate: async (schemaId: string) => {
        const current = await baseSchemaRegistry.get(schemaId);
        if (!current) return null;
        await this.ensureApprovedGovernance({
          subjectType: "schema",
          subjectIds: [schemaId, current.name, current.uri],
          tenantId: current.tenantId,
          operation: `activating schema '${schemaId}'`,
        });

        const anchor = await this.writeSchemaToChain(schemaId, this.schemaUri(schemaId, current), "active");
        const activated = await baseSchemaRegistry.activate?.(schemaId);
        if (!activated) return null;

        const schema = await SchemaModel.findOneAndUpdate(
          { id: schemaId },
          {
            anchors: appendAnchorList(activated.anchors as GovernanceAnchor[] | undefined, anchor),
            metadata: this.mergeChainMetadata(activated.metadata, anchor, {
              registryAddress: this.registryAddress,
            }),
          },
          { new: true },
        ).lean();

        return schema ? this.mapSchema(schema) : null;
      },
      get: async (schemaId: string) => {
        await this.reconcileSchemaById(schemaId);
        return baseSchemaRegistry.get(schemaId);
      },
    };

    this.templateRegistry = {
      ...this.templateRegistry,
      register: async (template: any) => {
        const templateId = template.id ?? template.templateId ?? `tpl:${Date.now()}`;
        const anchor = await this.writeTemplateToChain(templateId, this.templateUri(templateId, template), "pending");
        return baseTemplateRegistry.register({
          ...template,
          id: templateId,
          registryType: "blockchain",
          chain: "ethereum",
          contractAddress: this.registryAddress,
          transactionHash: anchor.transactionHash,
          anchors: appendAnchorList(template.anchors, anchor),
          metadata: this.mergeChainMetadata(template.metadata, anchor, {
            registryAddress: this.registryAddress,
          }),
        });
      },
      activate: async (templateId: string) => {
        const current = await baseTemplateRegistry.get(templateId);
        if (!current) return null;
        await this.ensureApprovedGovernance({
          subjectType: "template",
          subjectIds: [templateId, current.title],
          tenantId: current.tenantId,
          operation: `activating template '${templateId}'`,
        });

        const anchor = await this.writeTemplateToChain(templateId, this.templateUri(templateId, current), "active");
        const activated = await baseTemplateRegistry.activate?.(templateId);
        if (!activated) return null;

        const template = await CredentialTemplateModel.findOneAndUpdate(
          { templateId },
          {
            anchors: appendAnchorList(activated.anchors as GovernanceAnchor[] | undefined, anchor),
            metadata: this.mergeChainMetadata(activated.metadata, anchor, {
              registryAddress: this.registryAddress,
            }),
            chain: "ethereum",
            contractAddress: this.registryAddress,
            transactionHash: anchor.transactionHash,
          },
          { new: true },
        ).lean();

        return template ? this.mapTemplate(template) : null;
      },
      get: async (templateId: string) => {
        await this.reconcileTemplateById(templateId);
        return baseTemplateRegistry.get(templateId);
      },
    };

    this.trustRegistry = {
      ...this.trustRegistry,
      register: async (record: any) => {
        const recordId = record.id ?? `trust:${Date.now()}`;
        const anchor = await this.writeTrustToChain(recordId, {
          registryId: record.registryId,
          entityType: record.entityType,
          entityId: record.entityId,
          did: record.did,
          status: this.toEthereumRecordStatus(record.status ?? "pending"),
        });
        return baseTrustRegistry.register({
          ...record,
          id: recordId,
          anchors: appendAnchorList(record.anchors, anchor),
          metadata: this.mergeChainMetadata(record.metadata, anchor, {
            registryAddress: this.registryAddress,
          }),
        });
      },
      updateStatus: async (recordId: string, status: any) => {
        const current = await baseTrustRegistry.get(recordId);
        if (!current) return null;
        if (status === "active") {
          await this.ensureApprovedGovernance({
            subjectType: "trust-registry",
            subjectIds: [recordId, current.entityId, current.did, current.name],
            tenantId: current.tenantId,
            operation: `activating trust registry entry '${recordId}'`,
          });
        }

        const anchor = await this.writeTrustToChain(recordId, {
          registryId: current.registryId,
          entityType: current.entityType,
          entityId: current.entityId,
          did: current.did,
          status: this.toEthereumRecordStatus(status),
        });
        const updated = await baseTrustRegistry.updateStatus?.(recordId, status);
        if (!updated) return null;

        const trust = await TrustRegistryModel.findOneAndUpdate(
          { id: recordId },
          {
            anchors: appendAnchorList(updated.anchors as GovernanceAnchor[] | undefined, anchor),
            metadata: this.mergeChainMetadata(updated.metadata, anchor, {
              registryAddress: this.registryAddress,
            }),
          },
          { new: true },
        ).lean();

        return trust ? this.mapTrustRecord(trust) : null;
      },
      get: async (recordId: string) => {
        await this.reconcileTrustRecordById(recordId);
        return baseTrustRegistry.get(recordId);
      },
      query: async (query: any) => {
        const results = await baseTrustRegistry.query?.(query);
        if (Array.isArray(results)) {
          for (const record of results) {
            await this.reconcileTrustRecordById(record.id);
          }
          return baseTrustRegistry.query?.(query);
        }
        return results;
      },
    };

    this.governance = {
      ...this.governance,
      createProposal: async (input: any) => {
        const proposalId = input.proposalId ?? `gov:${Date.now()}`;
        const anchor = await this.writeGovernanceProposalToChain({
          proposalId,
          issuerDid: input.issuerDid,
          governanceType: input.governanceType ?? "admin",
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          requiredApprovals: input.requiredApprovals ?? 1,
          status: "pending",
          policyRef: input.policyRef,
        });

        return baseGovernance.createProposal({
          ...input,
          proposalId,
          chainAnchors: appendAnchorList(input.chainAnchors, anchor),
          metadata: this.mergeChainMetadata(input.metadata, anchor, {
            registryAddress: this.registryAddress,
          }),
        });
      },
      approve: async (proposalId: string, approverDid: string, signature?: string) => {
        const existing = await baseGovernance.getProposal(proposalId);
        if (!existing) return null;
        const anchor = await this.writeGovernanceApprovalToChain(proposalId);
        const approved = await baseGovernance.approve?.(proposalId, approverDid, signature);
        if (!approved) return null;

        const proposal = await GovernanceModel.findOneAndUpdate(
          { proposalId },
          {
            chainAnchors: appendAnchorList(approved.chainAnchors, anchor),
            metadata: this.mergeChainMetadata(approved.metadata, anchor, {
              registryAddress: this.registryAddress,
            }),
          },
          { new: true },
        );

        return proposal ? this.mapGovernance(proposal) : null;
      },
      getProposal: async (proposalId: string) => {
        await this.reconcileGovernanceById(proposalId);
        return baseGovernance.getProposal(proposalId);
      },
    };

    this.status = {
      ...this.status,
      createList: async (input: any) => {
        const statusListId = input.id ?? input.statusListId ?? `status:${Date.now()}`;
        const rootHash = input.rootHash ?? hashValue(input.entries ?? []);
        const anchor = await this.writeStatusRootToChain(statusListId, input.listUri, rootHash);
        return baseStatus.createList({
          ...input,
          id: statusListId,
          rootHash,
          chainAnchors: appendAnchorList(input.chainAnchors, anchor),
          metadata: this.mergeChainMetadata(input.metadata, anchor, {
            registryAddress: this.registryAddress,
          }),
        });
      },
      mutate: async (request: StatusMutationRequest) => {
        const updated = await baseStatus.mutate(request);
        if (!updated) return null;
        const anchor = await this.writeStatusRootToChain(
          request.statusListId,
          updated.listUri,
          updated.rootHash,
        );

        const list = await StatusListModel.findOneAndUpdate(
          { statusListId: request.statusListId },
          {
            chainAnchors: appendAnchorList(updated.chainAnchors, anchor),
            metadata: this.mergeChainMetadata(updated.metadata, anchor, {
              registryAddress: this.registryAddress,
            }),
          },
          { new: true },
        ).lean();

        return list ? this.mapStatusList(list) : null;
      },
      getList: async (statusListId: string) => {
        await this.reconcileStatusListById(statusListId);
        return baseStatus.getList(statusListId);
      },
    };

    this.credential = {
      ...this.credential,
      issue: async (request: IssueCredentialRequest) => {
        await this.reconcileIssuerByDid(request.issuerDid);
        await this.reconcileTrustByDid(request.issuerDid);
        await this.reconcileSchemaById(request.schema.id);
        if (request.templateId) {
          await this.reconcileTemplateById(request.templateId);
        }
        return baseCredential.issue(request);
      },
      verify: async (request: VerifyCredentialRequest) => {
        const stored = await this.findStoredCredentialRecord(request.credential);
        const issuerDid = request.expectedIssuerDid ?? this.extractIssuerDidFromCredential(request.credential, request.format);
        const schemaId = this.extractSchemaIdFromCredential(request.credential, request.format);

        if (issuerDid) {
          await this.reconcileIssuerByDid(issuerDid);
          await this.reconcileTrustByDid(issuerDid);
        }
        if (schemaId) {
          await this.reconcileSchemaById(schemaId);
        }
        if (stored?.templateId) {
          await this.reconcileTemplateById(stored.templateId);
        }
        if (request.resolveStatus && stored?.status?.listId) {
          await this.reconcileStatusListById(String(stored.status.listId));
        }

        return baseCredential.verify(request);
      },
    };
  }

  async reconcileOnChainState() {
    if (!this.registryClient) {
      return;
    }

    const [issuers, verifiers, schemas, templates, trustRecords, proposals, statusLists] = await Promise.all([
      IssuerModel.find({ registryType: "blockchain" }).lean(),
      VerifierModel.find({ registryType: "blockchain" }).lean(),
      SchemaModel.find({ registryType: "blockchain" }).lean(),
      CredentialTemplateModel.find({ registryType: "blockchain" }).lean(),
      TrustRegistryModel.find({}).lean(),
      GovernanceModel.find({}).lean(),
      StatusListModel.find({}).lean(),
    ]);

    for (const issuer of issuers) {
      await this.reconcileIssuerByDid(issuer.did);
    }
    for (const verifier of verifiers) {
      await this.reconcileVerifierByDid(verifier.did);
    }
    for (const schema of schemas) {
      await this.reconcileSchemaById(schema.id);
    }
    for (const template of templates) {
      await this.reconcileTemplateById(template.templateId);
    }
    for (const record of trustRecords) {
      await this.reconcileTrustRecordById(record.id);
    }
    for (const proposal of proposals) {
      await this.reconcileGovernanceById(proposal.proposalId);
    }
    for (const list of statusLists) {
      await this.reconcileStatusListById(list.statusListId);
    }
  }

  async startEventIndexer(options: {
    fromBlock?: number;
    onReady?: (details: { fromBlock: number; latestBlock: number }) => void;
    onEvent?: (event: EthereumRegistryEvent) => void;
    onError?: (error: unknown, event?: EthereumRegistryEvent) => void;
  } = {}) {
    if (!this.registryClient || !this.registryAddress) {
      return () => undefined;
    }
    if (this.stopRegistryWatcher) {
      return this.stopEventIndexer.bind(this);
    }

    let cursor = await ChainIndexStateModel.findOne(this.indexStateQuery()).lean();
    const latestBlock = await this.registryClient.getLatestBlockNumber();
    const fromBlock = options.fromBlock
      ?? cursor?.lastProcessedBlock
      ?? this.registryDeployBlock
      ?? latestBlock;

    const backfill = await this.registryClient.queryRegistryEvents(fromBlock, latestBlock);
    for (const event of backfill) {
      if (this.shouldSkipEvent(event, cursor)) {
        continue;
      }
      await this.processRegistryEvent(event);
      cursor = await this.persistIndexCursor(event);
      options.onEvent?.(event);
    }

    options.onReady?.({ fromBlock, latestBlock });

    this.stopRegistryWatcher = this.registryClient.watchRegistryEvents((event) => {
      this.registryEventQueue = this.registryEventQueue
        .then(async () => {
          if (this.shouldSkipEvent(event, cursor)) {
            return;
          }
          await this.processRegistryEvent(event);
          cursor = await this.persistIndexCursor(event);
          options.onEvent?.(event);
        })
        .catch((error) => {
          options.onError?.(error, event);
        });

      return this.registryEventQueue;
    });

    return this.stopEventIndexer.bind(this);
  }

  stopEventIndexer() {
    this.stopRegistryWatcher?.();
    this.stopRegistryWatcher = undefined;
  }

  private async writeIssuerToChain(did: string, subjectId: string, status: EthereumRecordStatus) {
    const receipt = await this.registryClient!.upsertIssuer(
      did,
      this.metadataUri("issuer", subjectId),
      status,
    );
    return this.toChainAnchor(receipt, status === "active" ? "approval" : "audit");
  }

  private async writeVerifierToChain(did: string, subjectId: string, status: EthereumRecordStatus) {
    const receipt = await this.registryClient!.upsertVerifier(
      did,
      this.metadataUri("verifier", subjectId),
      status,
    );
    return this.toChainAnchor(receipt, status === "active" ? "approval" : "audit");
  }

  private async writeSchemaToChain(schemaId: string, uri: string, status: EthereumRecordStatus) {
    const receipt = await this.registryClient!.upsertSchema(schemaId, uri, status);
    return this.toChainAnchor(receipt, status === "active" ? "approval" : "audit");
  }

  private async writeTemplateToChain(templateId: string, uri: string, status: EthereumRecordStatus) {
    const receipt = await this.registryClient!.upsertTemplate(templateId, uri, status);
    return this.toChainAnchor(receipt, status === "active" ? "approval" : "audit");
  }

  private async writeTrustToChain(
    recordId: string,
    input: {
      registryId: string;
      entityType: string;
      entityId: string;
      did?: string;
      status: EthereumRecordStatus;
    },
  ) {
    const receipt = await this.registryClient!.upsertTrustRecord(
      recordId,
      input.registryId,
      input.entityType,
      input.entityId,
      input.did ?? "",
      this.metadataUri("trust", recordId),
      input.status,
    );
    return this.toChainAnchor(receipt, input.status === "active" ? "approval" : "policy");
  }

  private async writeGovernanceProposalToChain(input: {
    proposalId: string;
    issuerDid?: string;
    governanceType: string;
    subjectType: string;
    subjectId: string;
    requiredApprovals: number;
    status: EthereumGovernanceStatus;
    policyRef?: string;
  }) {
    const receipt = await this.registryClient!.upsertGovernanceProposal({
      ...input,
      metadataURI: this.metadataUri("governance", input.proposalId),
    });
    return this.toChainAnchor(
      receipt,
      input.governanceType === "policy" ? "policy" : "approval",
    );
  }

  private async writeGovernanceApprovalToChain(proposalId: string) {
    const receipt = await this.registryClient!.approveGovernanceProposal(proposalId);
    return this.toChainAnchor(receipt, "approval");
  }

  private async writeStatusRootToChain(
    statusListId: string,
    listUri?: string,
    rootHash?: string,
  ) {
    const receipt = await this.registryClient!.upsertStatusRoot(
      statusListId,
      listUri ?? "",
      rootHash ?? "",
    );
    return this.toChainAnchor(receipt, "status-root");
  }

  private metadataUri(kind: string, subjectId: string) {
    return `ssi://ethereum/${kind}/${encodeURIComponent(subjectId)}`;
  }

  private schemaUri(schemaId: string, schema: { uri?: string }) {
    return schema.uri ?? this.metadataUri("schema", schemaId);
  }

  private templateUri(templateId: string, template: { uri?: string }) {
    return template.uri ?? this.metadataUri("template", templateId);
  }

  private mergeChainMetadata(metadata: Metadata | undefined, anchor: GovernanceAnchor, extras: Record<string, unknown> = {}) {
    return mergeMetadata(metadata, anchor, {
      driver: this.name,
      network: this.hybridOptions.network,
      registryAddress: this.registryAddress,
      ...extras,
    });
  }

  private toChainAnchor(
    receipt: EthereumContractWriteResult,
    anchorType: GovernanceAnchor["anchorType"],
  ): GovernanceAnchor {
    return {
      driver: this.name,
      network: this.hybridOptions.network,
      transactionHash: receipt.txHash,
      blockNumber: receipt.blockNumber ?? undefined,
      anchorType,
      anchoredAt: new Date(),
    };
  }

  private toEthereumRecordStatus(status: string): EthereumRecordStatus {
    switch (status) {
      case "active":
        return "active";
      case "suspended":
        return "suspended";
      case "revoked":
        return "revoked";
      case "pending":
      default:
        return "pending";
    }
  }

  private async reconcileIssuerByDid(did: string) {
    if (!this.registryClient) return null;
    const chain = await this.registryClient.getIssuer(did);
    if (chain.status === "unknown") {
      return null;
    }

    await IssuerModel.findOneAndUpdate(
      { did },
      {
        registryType: "blockchain",
        status: chain.status,
        metadata: {
          ...(await this.currentMetadata(IssuerModel, { did })),
          registryAddress: this.registryAddress,
          onChainMetadataUri: chain.metadataURI,
          onChainUpdatedAt: new Date(Number(chain.updatedAt) * 1000),
        },
      },
      { new: true },
    );
    return chain;
  }

  private async reconcileVerifierByDid(did: string) {
    if (!this.registryClient) return null;
    const chain = await this.registryClient.getVerifier(did);
    if (chain.status === "unknown") {
      return null;
    }

    await VerifierModel.findOneAndUpdate(
      { did },
      {
        registryType: "blockchain",
        status: chain.status,
        metadata: {
          ...(await this.currentMetadata(VerifierModel, { did })),
          registryAddress: this.registryAddress,
          onChainMetadataUri: chain.metadataURI,
          onChainUpdatedAt: new Date(Number(chain.updatedAt) * 1000),
        },
      },
      { new: true },
    );
    return chain;
  }

  private async reconcileSchemaById(schemaId: string) {
    if (!this.registryClient) return null;
    const chain = await this.registryClient.getSchema(schemaId);
    if (chain.status === "unknown") {
      return null;
    }

    await SchemaModel.findOneAndUpdate(
      { id: schemaId },
      {
        registryType: "blockchain",
        uri: chain.uri,
        active: chain.status === "active",
        metadata: {
          ...(await this.currentMetadata(SchemaModel, { id: schemaId })),
          registryAddress: this.registryAddress,
          onChainUpdatedAt: new Date(Number(chain.updatedAt) * 1000),
        },
      },
      { new: true },
    );
    return chain;
  }

  private async reconcileTemplateById(templateId: string) {
    if (!this.registryClient) return null;
    const chain = await this.registryClient.getTemplate(templateId);
    if (chain.status === "unknown") {
      return null;
    }

    await CredentialTemplateModel.findOneAndUpdate(
      { templateId },
      {
        registryType: "blockchain",
        uri: chain.uri,
        enabled: chain.status === "active",
        chain: "ethereum",
        contractAddress: this.registryAddress,
        metadata: {
          ...(await this.currentMetadata(CredentialTemplateModel, { templateId })),
          registryAddress: this.registryAddress,
          onChainUpdatedAt: new Date(Number(chain.updatedAt) * 1000),
        },
      },
      { new: true },
    );
    return chain;
  }

  private async reconcileTrustRecordById(recordId: string) {
    if (!this.registryClient) return null;
    const chain = await this.registryClient.getTrustRecord(recordId);
    if (chain.status === "unknown") {
      return null;
    }

    await TrustRegistryModel.findOneAndUpdate(
      { id: recordId },
      {
        registryId: chain.registryId,
        entityType: chain.entityType,
        entityId: chain.entityId,
        did: chain.did || undefined,
        status: chain.status,
        metadataUri: chain.metadataURI || undefined,
        metadata: {
          ...(await this.currentMetadata(TrustRegistryModel, { id: recordId })),
          registryAddress: this.registryAddress,
          onChainUpdatedAt: new Date(Number(chain.updatedAt) * 1000),
        },
      },
      { new: true },
    );
    return chain;
  }

  private async reconcileTrustByDid(did: string) {
    const records = await TrustRegistryModel.find({ did }).lean();
    for (const record of records) {
      await this.reconcileTrustRecordById(record.id);
    }
  }

  private async reconcileGovernanceById(proposalId: string) {
    if (!this.registryClient) return null;
    const chain = await this.registryClient.getGovernanceProposal(proposalId);
    if (chain.status === "unknown") {
      return null;
    }

    await GovernanceModel.findOneAndUpdate(
      { proposalId },
      {
        issuerDid: chain.issuerDid || undefined,
        governanceType: chain.governanceType,
        subjectType: chain.subjectType,
        subjectId: chain.subjectId,
        requiredApprovals: Number(chain.requiredApprovals),
        status: chain.status,
        policyRef: chain.policyRef || undefined,
        metadata: {
          ...(await this.currentMetadata(GovernanceModel, { proposalId })),
          registryAddress: this.registryAddress,
          onChainMetadataUri: chain.metadataURI,
          onChainApprovalCount: Number(chain.approvalCount),
          onChainUpdatedAt: new Date(Number(chain.updatedAt) * 1000),
        },
      },
      { new: true },
    );
    return chain;
  }

  private async reconcileStatusListById(statusListId: string) {
    if (!this.registryClient) return null;
    const chain = await this.registryClient.getStatusRoot(statusListId);
    if (!chain.rootHash && !chain.listUri && Number(chain.updatedAt) === 0) {
      return null;
    }

    await StatusListModel.findOneAndUpdate(
      { statusListId },
      {
        listUri: chain.listUri || undefined,
        rootHash: chain.rootHash || undefined,
        metadata: {
          ...(await this.currentMetadata(StatusListModel, { statusListId })),
          registryAddress: this.registryAddress,
          onChainUpdatedAt: new Date(Number(chain.updatedAt) * 1000),
        },
      },
      { new: true },
    );
    return chain;
  }

  private indexStateQuery() {
    return {
      driver: this.name,
      registryAddress: this.registryAddress,
    };
  }

  private shouldSkipEvent(
    event: EthereumRegistryEvent,
    cursor?: { lastProcessedBlock?: number; lastProcessedLogIndex?: number } | null,
  ) {
    if (!cursor?.lastProcessedBlock) {
      return false;
    }

    if (event.blockNumber < cursor.lastProcessedBlock) {
      return true;
    }

    return event.blockNumber === cursor.lastProcessedBlock
      && event.logIndex <= (cursor.lastProcessedLogIndex ?? -1);
  }

  private async persistIndexCursor(event: EthereumRegistryEvent) {
    return ChainIndexStateModel.findOneAndUpdate(
      this.indexStateQuery(),
      {
        driver: this.name,
        registryAddress: this.registryAddress,
        chainId: this.chainId,
        lastProcessedBlock: event.blockNumber,
        lastProcessedLogIndex: event.logIndex,
        metadata: {
          lastProcessedTxHash: event.transactionHash,
          lastProcessedEvent: event.name,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
  }

  private async processRegistryEvent(event: EthereumRegistryEvent) {
    switch (event.name) {
      case "IssuerUpserted":
      case "IssuerStatusUpdated":
      case "IssuerRegistered":
      case "IssuerRevoked":
        if (event.args.did) {
          await this.reconcileIssuerByDid(String(event.args.did));
        }
        return;
      case "VerifierUpserted":
      case "VerifierStatusUpdated":
      case "VerifierRegistered":
      case "VerifierRevoked":
        if (event.args.did) {
          await this.reconcileVerifierByDid(String(event.args.did));
        }
        return;
      case "SchemaUpserted":
      case "SchemaStatusUpdated":
      case "SchemaRegistered":
      case "SchemaRevoked": {
        const schemaId = await this.findPlaintextIdByHash(SchemaModel, "id", String(event.args.schemaId ?? ""));
        if (schemaId) {
          await this.reconcileSchemaById(schemaId);
        }
        return;
      }
      case "TemplateUpserted":
      case "TemplateStatusUpdated":
      case "TemplateRegistered":
      case "TemplateRevoked": {
        const templateId = await this.findPlaintextIdByHash(CredentialTemplateModel, "templateId", String(event.args.templateId ?? ""));
        if (templateId) {
          await this.reconcileTemplateById(templateId);
        }
        return;
      }
      case "TrustRecordUpserted":
      case "TrustRecordStatusUpdated": {
        const recordId = await this.findPlaintextIdByHash(TrustRegistryModel, "id", String(event.args.recordId ?? ""));
        if (recordId) {
          await this.reconcileTrustRecordById(recordId);
        }
        return;
      }
      case "GovernanceProposalUpserted":
      case "GovernanceProposalApproved": {
        const proposalId = await this.findPlaintextIdByHash(GovernanceModel, "proposalId", String(event.args.proposalId ?? ""));
        if (proposalId) {
          await this.reconcileGovernanceById(proposalId);
        }
        return;
      }
      case "StatusRootUpserted": {
        const statusListId = await this.findPlaintextIdByHash(StatusListModel, "statusListId", String(event.args.statusListId ?? ""));
        if (statusListId) {
          await this.reconcileStatusListById(statusListId);
        }
        return;
      }
      default:
        return;
    }
  }

  private async findPlaintextIdByHash(
    model: { find(query?: Record<string, unknown>): { lean(): Promise<Array<Record<string, unknown>>> } },
    field: string,
    hashedValue: string,
  ) {
    if (!hashedValue) {
      return undefined;
    }

    const records = await model.find({}).lean();
    const match = records.find((record) => ethers.id(String(record[field] ?? "")) === hashedValue);
    return typeof match?.[field] === "string" ? String(match[field]) : undefined;
  }

  private async currentMetadata(model: { findOne(query: Record<string, unknown>): { lean(): Promise<any> } }, query: Record<string, unknown>) {
    const current = await model.findOne(query).lean();
    return (current?.metadata ?? {}) as Record<string, unknown>;
  }

  private async findStoredCredentialRecord(credential: unknown) {
    if (typeof credential === "string") {
      return CredentialModel.findOne({
        $or: [{ credential }, { hash: hashValue(credential) }],
      }).lean();
    }
    const value = credential as any;
    if (value?.id) {
      return CredentialModel.findOne({ id: value.id }).lean();
    }
    return CredentialModel.findOne({
      hash: hashValue(credential),
    }).lean();
  }

  private extractIssuerDidFromCredential(credential: unknown, format?: string) {
    const value = credential as any;
    if ((format ?? "vc-jwt") === "vc-jwt" && typeof credential === "string") {
      try {
        const [, payload] = credential.split(".");
        return payload ? JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).iss : undefined;
      } catch {
        return undefined;
      }
    }
    if ((format ?? "") === "sd-jwt-vc" && value?.compact) {
      try {
        const [, payload] = String(value.compact).split(".");
        return payload ? JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).iss : undefined;
      } catch {
        return undefined;
      }
    }
    return value?.issuer;
  }

  private extractSchemaIdFromCredential(credential: unknown, format?: string) {
    const value = credential as any;
    if ((format ?? "vc-jwt") === "vc-jwt" && typeof credential === "string") {
      try {
        const [, payload] = credential.split(".");
        const decoded = payload ? JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) : undefined;
        return decoded?.vc?.credentialSchema?.id;
      } catch {
        return undefined;
      }
    }
    if ((format ?? "") === "sd-jwt-vc" && value?.compact) {
      try {
        const [, payload] = String(value.compact).split(".");
        const decoded = payload ? JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) : undefined;
        return decoded?.vct;
      } catch {
        return undefined;
      }
    }
    return value?.credentialSchema?.id;
  }
}
