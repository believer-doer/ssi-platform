import { createHash } from "crypto";
import { env } from "@ssi/config";
import { verifyJWT } from "@ssi/core/crypto";
import { createDID, resolveEthrDID, resolveKeyDID } from "@ssi/core/did";
import { KeyManager } from "@ssi/core/kms";
import type {
  DriverCapabilityMatrix,
  SSIDriver,
} from "@ssi/core/interfaces/driver.interface";
import type {
  AuditEventRecord,
  CredentialFormatProfile,
  CredentialRecord,
  GovernanceProposal,
  IssueCredentialRequest,
  PageResult,
  PresentationRecord,
  PresentationRequest,
  ProtocolMetadataRecord,
  ProtocolProfile,
  ProtocolSession,
  StatusListRecord,
  StatusMutationRequest,
  TemplateRecord,
  TrustRegistryRecord,
  VerifyCredentialRequest,
  VerifyPresentationRequest,
  VerifyPresentationResult,
} from "@ssi/core/types";
import { v4 as uuidv4 } from "uuid";
import { DIDModel } from "./models/did.model";
import { SchemaModel, SchemaDocument } from "./models/schema.model";
import { CredentialModel, CredentialDocument } from "./models/credential.model";
import { PresentationModel, PresentationDocument } from "./models/presentation.model";
import IssuerModel from "./models/issuer.model";
import VerifierModel from "./models/verifier.model";
import WalletModel from "./models/wallet.model";
import TenantModel from "./models/tenant.model";
import GovernanceModel from "./models/governance.model";
import StatusListModel from "./models/status.model";
import CredentialTemplateModel from "./models/credentialTemplate.model";
import VerificationModel from "./models/verification.model";
import { TrustRegistryModel } from "./models/trustRegistry.model";
import { AuditEventModel } from "./models/auditEvent.model";
import { ProtocolSessionModel } from "./models/protocolSession.model";
import { buildInternalFormatRegistry } from "./format.handlers";

function hashValue(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function baseUrl() {
  return `http://localhost:${env.port || 3000}`;
}

export class InternalDriver implements SSIDriver {
  name = "internal";
  kms = new KeyManager();
  protected readonly formatRegistry = buildInternalFormatRegistry();
  capabilities: DriverCapabilityMatrix = {
    maturity: "pilot",
    didMethods: ["did:internal", "did:key", "did:jwk", "did:web"],
    credentialFormats: ["vc-jwt", "vc-ldp", "sd-jwt-vc", "bbs-vc"],
    protocols: ["oidc4vci", "oidc4vp", "siopv2", "dcql", "didcomm-v2"],
    storage: {
      offChain: true,
      onChain: false,
      hybrid: false,
      anchors: false,
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

  issuer: any = {
    onboard: async (input: any) => {
      const issuerId = input.id ?? input.issuerId ?? `issuer:${uuidv4()}`;
      const created = await IssuerModel.findOneAndUpdate(
        { did: input.did },
        {
          issuerId,
          tenantId: input.tenantId,
          name: input.name,
          did: input.did,
          didMethod: input.didMethod,
          registryType: input.registryType ?? "internal",
          supportedFormats: input.supportedFormats ?? this.capabilities.credentialFormats,
          supportedProtocols: input.supportedProtocols ?? this.capabilities.protocols,
          trustFrameworkMemberships: input.trustFrameworkMemberships ?? [],
          keyBindings: input.keyBindings ?? [],
          publicKeyJwk: input.publicKeyJwk,
          privateKeyRef: input.privateKeyRef,
          kid: input.kid,
          status: input.status ?? "pending",
          metadata: input.metadata ?? {},
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      await this.recordAudit("issuer.onboarded", "success", "issuer", issuerId, {
        actorDid: input.did,
        tenantId: input.tenantId,
      });
      return {
        kind: "issuer",
        id: issuerId,
        tenantId: created.tenantId,
        name: created.name,
        did: created.did,
        didMethod: created.didMethod,
        registryType: created.registryType,
        status: created.status,
        keyBindings: created.keyBindings,
        trustFrameworkMemberships: created.trustFrameworkMemberships,
        supportedFormats: created.supportedFormats,
        supportedProtocols: created.supportedProtocols,
        metadata: created.metadata,
      };
    },
    getByDid: async (did: string) => {
      const issuer = await IssuerModel.findOne({ did }).lean();
      if (!issuer) return null;
      return {
        kind: "issuer",
        id: issuer.issuerId,
        tenantId: issuer.tenantId,
        name: issuer.name,
        did: issuer.did,
        didMethod: issuer.didMethod,
        registryType: issuer.registryType,
        status: issuer.status,
        keyBindings: issuer.keyBindings,
        trustFrameworkMemberships: issuer.trustFrameworkMemberships,
        supportedFormats: issuer.supportedFormats,
        supportedProtocols: issuer.supportedProtocols,
        metadata: issuer.metadata,
      };
    },
    list: async (tenantId?: string) => {
      const items = await IssuerModel.find(tenantId ? { tenantId } : {}).lean();
      return items.map((issuer: any) => ({
        kind: "issuer",
        id: issuer.issuerId,
        tenantId: issuer.tenantId,
        name: issuer.name,
        did: issuer.did,
        didMethod: issuer.didMethod,
        registryType: issuer.registryType,
        status: issuer.status,
        keyBindings: issuer.keyBindings,
        trustFrameworkMemberships: issuer.trustFrameworkMemberships,
        supportedFormats: issuer.supportedFormats,
        supportedProtocols: issuer.supportedProtocols,
        metadata: issuer.metadata,
      }));
    },
    updateStatus: async (did: string, status: any) => {
      const current = await IssuerModel.findOne({ did }).lean();
      if (!current) return null;
      if (status === "active") {
        await this.ensureApprovedGovernance({
          subjectType: "issuer",
          subjectIds: [current.issuerId, did, current.name],
          tenantId: current.tenantId,
          issuerDid: did,
          operation: `activating issuer '${did}'`,
        });
      }
      const issuer = await IssuerModel.findOneAndUpdate(
        { did },
        { status },
        { new: true },
      ).lean();
      if (!issuer) return null;
      return {
        kind: "issuer",
        id: issuer.issuerId,
        tenantId: issuer.tenantId,
        name: issuer.name,
        did: issuer.did,
        didMethod: issuer.didMethod,
        registryType: issuer.registryType,
        status: issuer.status,
        metadata: issuer.metadata,
      };
    },
  };

  verifier: any = {
    onboard: async (input: any) => {
      const verifierId = input.id ?? `verifier:${uuidv4()}`;
      const created = await VerifierModel.findOneAndUpdate(
        { did: input.did },
        {
          id: verifierId,
          tenantId: input.tenantId,
          did: input.did,
          didMethod: input.didMethod,
          type: input.type ?? "internal",
          kind: "verifier",
          name: input.name,
          registryType: input.registryType ?? "internal",
          keyBindings: input.keyBindings ?? [],
          trustFrameworkMemberships: input.trustFrameworkMemberships ?? [],
          supportedPresentationProfiles:
            input.supportedPresentationProfiles ?? this.capabilities.protocols,
          publicKeyJwk: input.publicKeyJwk,
          status: input.status ?? "pending",
          metadata: input.metadata ?? {},
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      await this.recordAudit("verifier.onboarded", "success", "verifier", verifierId, {
        actorDid: input.did,
        tenantId: input.tenantId,
      });
      return {
        kind: "verifier",
        id: created.id,
        tenantId: created.tenantId,
        name: created.name,
        did: created.did,
        didMethod: created.didMethod,
        registryType: created.registryType,
        status: created.status,
        keyBindings: (created as any).keyBindings,
        trustFrameworkMemberships: (created as any).trustFrameworkMemberships,
        supportedPresentationProfiles: (created as any).supportedPresentationProfiles,
        metadata: created.metadata,
      };
    },
    getByDid: async (did: string) => {
      const verifier = await VerifierModel.findOne({ did }).lean();
      if (!verifier) return null;
      return {
        kind: "verifier",
        id: verifier.id,
        tenantId: verifier.tenantId,
        name: verifier.name,
        did: verifier.did,
        didMethod: verifier.didMethod,
        registryType: verifier.registryType,
        status: verifier.status,
        keyBindings: verifier.keyBindings,
        trustFrameworkMemberships: verifier.trustFrameworkMemberships,
        supportedPresentationProfiles: verifier.supportedPresentationProfiles,
        metadata: verifier.metadata,
      };
    },
    list: async (tenantId?: string) => {
      const items = await VerifierModel.find(tenantId ? { tenantId } : {}).lean();
      return items.map((verifier: any) => ({
        kind: "verifier",
        id: verifier.id,
        tenantId: verifier.tenantId,
        name: verifier.name,
        did: verifier.did,
        didMethod: verifier.didMethod,
        registryType: verifier.registryType,
        status: verifier.status,
        keyBindings: verifier.keyBindings,
        trustFrameworkMemberships: verifier.trustFrameworkMemberships,
        supportedPresentationProfiles: verifier.supportedPresentationProfiles,
        metadata: verifier.metadata,
      }));
    },
    updateStatus: async (did: string, status: any) => {
      const current = await VerifierModel.findOne({ did }).lean();
      if (!current) return null;
      if (status === "active") {
        await this.ensureApprovedGovernance({
          subjectType: "verifier",
          subjectIds: [current.id, did, current.name],
          tenantId: current.tenantId,
          operation: `activating verifier '${did}'`,
        });
      }
      const verifier = await VerifierModel.findOneAndUpdate(
        { did },
        { status },
        { new: true },
      ).lean();
      if (!verifier) return null;
      return {
        kind: "verifier",
        id: verifier.id,
        tenantId: verifier.tenantId,
        name: verifier.name,
        did: verifier.did,
        didMethod: verifier.didMethod,
        registryType: verifier.registryType,
        status: verifier.status,
        metadata: verifier.metadata,
      };
    },
  };

  wallet: any = {
    onboard: async (input: any) => {
      const walletId = input.id ?? input.walletId ?? `wallet:${uuidv4()}`;
      const created = await WalletModel.findOneAndUpdate(
        { did: input.did },
        {
          walletId,
          tenantId: input.tenantId,
          holderId: input.holderId,
          name: input.name,
          did: input.did,
          didMethod: input.didMethod,
          walletType: input.walletType,
          address: input.address,
          publicKey: input.publicKey,
          keyRef: input.keyRef,
          supportedFormats: input.supportedFormats ?? this.capabilities.credentialFormats,
          supportedProtocols: input.supportedProtocols ?? this.capabilities.protocols,
          keyBindings: input.keyBindings ?? [],
          metadata: input.metadata ?? {},
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      await this.recordAudit("wallet.onboarded", "success", "wallet", walletId, {
        actorDid: input.did,
        tenantId: input.tenantId,
      });
      return {
        kind: "wallet",
        id: walletId,
        tenantId: created.tenantId,
        name: created.name ?? walletId,
        did: created.did,
        didMethod: created.didMethod,
        registryType: "internal",
        status: "active",
        walletType: created.walletType,
        address: created.address,
        holderId: created.holderId,
        keyBindings: created.keyBindings,
        metadata: created.metadata,
      };
    },
    getByDid: async (did: string) => {
      const wallet = await WalletModel.findOne({ did }).lean();
      if (!wallet) return null;
      return {
        kind: "wallet",
        id: wallet.walletId,
        tenantId: wallet.tenantId,
        name: wallet.name ?? wallet.walletId,
        did: wallet.did,
        didMethod: wallet.didMethod,
        registryType: "internal",
        status: "active",
        walletType: wallet.walletType,
        address: wallet.address,
        holderId: wallet.holderId,
        keyBindings: wallet.keyBindings,
        metadata: wallet.metadata,
      };
    },
    list: async (tenantId?: string) => {
      const items = await WalletModel.find(tenantId ? { tenantId } : {}).lean();
      return items.map((wallet: any) => ({
        kind: "wallet",
        id: wallet.walletId,
        tenantId: wallet.tenantId,
        name: wallet.name ?? wallet.walletId,
        did: wallet.did,
        didMethod: wallet.didMethod,
        registryType: "internal",
        status: "active",
        walletType: wallet.walletType,
        address: wallet.address,
        holderId: wallet.holderId,
        keyBindings: wallet.keyBindings,
        metadata: wallet.metadata,
      }));
    },
  };

  tenant = {
    create: async (input: any) => {
      const tenantId = input.id ?? `tenant:${uuidv4()}`;
      const created = await TenantModel.findOneAndUpdate(
        { name: input.name },
        {
          _id: undefined,
          id: tenantId,
          name: input.name,
          issuerDid: input.issuerDid,
          tier: input.tier ?? "standard",
          enabled: input.enabled ?? true,
          policies: input.policies ?? [],
          metadata: input.metadata ?? {},
        } as any,
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      return {
        id: (created as any).id ?? tenantId,
        name: created.name,
        issuerDid: created.issuerDid,
        tier: created.tier,
        enabled: created.enabled,
        policies: (created as any).policies ?? [],
        metadata: created.metadata,
      };
    },
    get: async (tenantId: string) => {
      const tenant = await TenantModel.findOne({
        $or: [{ id: tenantId }, { _id: tenantId }],
      } as any).lean();
      if (!tenant) return null;
      return {
        id: (tenant as any).id ?? String((tenant as any)._id),
        name: tenant.name,
        issuerDid: tenant.issuerDid,
        tier: tenant.tier,
        enabled: tenant.enabled,
        policies: (tenant as any).policies ?? [],
        metadata: tenant.metadata,
      };
    },
    list: async () => {
      const items = await TenantModel.find().lean();
      return items.map((tenant: any) => ({
        id: tenant.id ?? String(tenant._id),
        name: tenant.name,
        issuerDid: tenant.issuerDid,
        tier: tenant.tier,
        enabled: tenant.enabled,
        policies: tenant.policies ?? [],
        metadata: tenant.metadata,
      }));
    },
    applyPolicy: async (tenantId: string, policy: any) => {
      await this.ensureApprovedGovernance({
        subjectType: "policy",
        subjectIds: [policy.policyId, policy.name],
        tenantId,
        policyRef: policy.policyId,
        operation: `applying tenant policy '${policy.policyId ?? policy.name ?? tenantId}'`,
      });
      const tenant = await TenantModel.findOneAndUpdate(
        { $or: [{ id: tenantId }, { _id: tenantId }] } as any,
        { $push: { policies: policy } },
        { new: true },
      ).lean();
      if (!tenant) return null;
      return {
        id: (tenant as any).id ?? String((tenant as any)._id),
        name: tenant.name,
        issuerDid: tenant.issuerDid,
        tier: tenant.tier,
        enabled: tenant.enabled,
        policies: (tenant as any).policies ?? [],
        metadata: tenant.metadata,
      };
    },
  };

  schemaRegistry = {
    register: async (schema: any) => {
      const id = schema.id ?? `schema:${uuidv4()}`;
      const created = await SchemaModel.create({
        id,
        tenantId: schema.tenantId,
        name: schema.name,
        version: schema.version,
        format: schema.format,
        registryType: schema.registryType ?? "internal",
        uri: schema.uri,
        hash: schema.hash ?? hashValue(schema.definition),
        active: schema.active ?? false,
        anchors: schema.anchors ?? [],
        metadata: schema.metadata ?? {},
        definition: schema.definition,
      });
      await this.recordAudit("schema.registered", "success", "schema", id, {
        tenantId: schema.tenantId,
      });
      return this.mapSchema(created);
    },
    get: async (schemaId: string) => {
      const schema = await SchemaModel.findOne({ id: schemaId }).lean();
      return schema ? this.mapSchema(schema) : null;
    },
    list: async (tenantId?: string) => {
      const items = await SchemaModel.find(tenantId ? { tenantId } : {}).lean();
      return items.map((schema) => this.mapSchema(schema));
    },
    activate: async (schemaId: string) => {
      const current = await SchemaModel.findOne({ id: schemaId }).lean();
      if (!current) return null;
      await this.ensureApprovedGovernance({
        subjectType: "schema",
        subjectIds: [schemaId, current.name, current.uri],
        tenantId: current.tenantId,
        operation: `activating schema '${schemaId}'`,
      });
      const schema = await SchemaModel.findOneAndUpdate(
        { id: schemaId },
        { active: true },
        { new: true },
      ).lean();
      return schema ? this.mapSchema(schema) : null;
    },
  };

  templateRegistry = {
    register: async (template: any) => {
      const templateId = template.id ?? template.templateId ?? `tpl:${uuidv4()}`;
      const created = await CredentialTemplateModel.create({
        templateId,
        tenantId: template.tenantId,
        title: template.title ?? template.name,
        description: template.description,
        schemaId: template.schemaId,
        defaults: template.defaults ?? {},
        format: template.format,
        enabled: template.enabled ?? false,
        anchors: template.anchors ?? [],
        registryType: template.registryType ?? "internal",
        metadata: template.metadata ?? {},
        chain: template.chain,
        contractAddress: template.contractAddress,
        transactionHash: template.transactionHash,
      });
      await this.recordAudit("template.registered", "success", "template", templateId, {
        tenantId: template.tenantId,
      });
      return this.mapTemplate(created);
    },
    get: async (templateId: string) => {
      const template = await CredentialTemplateModel.findOne({ templateId }).lean();
      return template ? this.mapTemplate(template) : null;
    },
    list: async (tenantId?: string) => {
      const items = await CredentialTemplateModel.find(
        tenantId ? { tenantId } : {},
      ).lean();
      return items.map((template) => this.mapTemplate(template));
    },
    activate: async (templateId: string) => {
      const current = await CredentialTemplateModel.findOne({ templateId }).lean();
      if (!current) return null;
      await this.ensureApprovedGovernance({
        subjectType: "template",
        subjectIds: [templateId, current.title],
        tenantId: current.tenantId,
        operation: `activating template '${templateId}'`,
      });
      const template = await CredentialTemplateModel.findOneAndUpdate(
        { templateId },
        { enabled: true },
        { new: true },
      ).lean();
      return template ? this.mapTemplate(template) : null;
    },
  };

  trustRegistry = {
    register: async (record: any) => {
      const id = record.id ?? `trust:${uuidv4()}`;
      if ((record.status ?? "active") !== "pending") {
        await this.ensureApprovedGovernance({
          subjectType: "trust-registry",
          subjectIds: [id, record.id, record.entityId, record.did, record.name],
          tenantId: record.tenantId,
          operation: `updating trust registry entry '${id}'`,
        });
      }
      const created = await TrustRegistryModel.findOneAndUpdate(
        { id },
        {
          id,
          tenantId: record.tenantId,
          registryId: record.registryId,
          entityType: record.entityType,
          entityId: record.entityId,
          did: record.did,
          name: record.name,
          status: record.status ?? "pending",
          trustFrameworkId: record.trustFrameworkId,
          accreditationLevel: record.accreditationLevel,
          scopes: record.scopes ?? [],
          metadataUri: record.metadataUri,
          hash: record.hash ?? hashValue(record),
          anchors: record.anchors ?? [],
          metadata: record.metadata ?? {},
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      await this.recordAudit("trust.entry.updated", "success", "trust-registry", id, {
        tenantId: record.tenantId,
      });
      return this.mapTrustRecord(created);
    },
    get: async (recordId: string) => {
      const record = await TrustRegistryModel.findOne({ id: recordId }).lean();
      return record ? this.mapTrustRecord(record) : null;
    },
    query: async (query: any) => {
      const filter: Record<string, unknown> = {};
      for (const key of [
        "registryId",
        "entityType",
        "entityId",
        "did",
        "status",
        "trustFrameworkId",
      ]) {
        if (query?.[key]) filter[key] = query[key];
      }
      const items = await TrustRegistryModel.find(filter).lean();
      return items.map((item) => this.mapTrustRecord(item));
    },
    updateStatus: async (recordId: string, status: any) => {
      const current = await TrustRegistryModel.findOne({ id: recordId }).lean();
      if (!current) return null;
      if (status === "active") {
        await this.ensureApprovedGovernance({
          subjectType: "trust-registry",
          subjectIds: [recordId, current.entityId, current.did, current.name],
          tenantId: current.tenantId,
          operation: `activating trust registry entry '${recordId}'`,
        });
      }
      const updated = await TrustRegistryModel.findOneAndUpdate(
        { id: recordId },
        { status },
        { new: true },
      ).lean();
      return updated ? this.mapTrustRecord(updated) : null;
    },
  };

  governance = {
    createProposal: async (input: any) => {
      const proposalId = input.proposalId ?? `gov:${uuidv4()}`;
      const created = await GovernanceModel.create({
        proposalId,
        tenantId: input.tenantId,
        issuerDid: input.issuerDid,
        governanceType: input.governanceType ?? "admin",
        approvals: input.approvals ?? [],
        requiredApprovals: input.requiredApprovals ?? 1,
        status: input.status ?? "pending",
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        policyRef: input.policyRef,
        chainAnchors: input.chainAnchors ?? [],
        metadata: input.metadata ?? {},
      } as any);
      await this.recordAudit(
        "governance.proposal.created",
        "success",
        "governance",
        proposalId,
        { tenantId: input.tenantId, actorDid: input.issuerDid },
      );
      return this.mapGovernance(created);
    },
    getProposal: async (proposalId: string) => {
      const proposal = await GovernanceModel.findOne({ proposalId }).lean();
      return proposal ? this.mapGovernance(proposal) : null;
    },
    listProposals: async (tenantId?: string) => {
      const filter = tenantId ? { tenantId } : {};
      const items = await GovernanceModel.find(filter).lean();
      return items.map((item) => this.mapGovernance(item));
    },
    approve: async (proposalId: string, approverDid: string, signature?: string) => {
      const proposal = await GovernanceModel.findOne({ proposalId });
      if (!proposal) return null;
      proposal.approvals.push({
        approverDid,
        approvedAt: new Date(),
        signature,
      } as any);
      if (proposal.approvals.length >= proposal.requiredApprovals) {
        proposal.status = "approved" as any;
      }
      await proposal.save();
      await this.recordAudit(
        "governance.proposal.approved",
        "success",
        "governance",
        proposalId,
        { actorDid: approverDid, tenantId: (proposal as any).tenantId },
      );
      return this.mapGovernance(proposal);
    },
  };

  status = {
    createList: async (input: any) => {
      const statusListId = input.id ?? input.statusListId ?? `status:${uuidv4()}`;
      const created = await StatusListModel.create({
        statusListId,
        tenantId: input.tenantId,
        issuerDid: input.issuerDid,
        profile: input.profile ?? "statuslist2021",
        purpose: input.purpose ?? "revocation",
        listUri: input.listUri,
        encodedList: input.encodedList,
        rootHash: input.rootHash,
        chainAnchors: input.chainAnchors ?? [],
        metadata: input.metadata ?? {},
        entries: input.entries ?? [],
      });
      return this.mapStatusList(created);
    },
    getList: async (statusListId: string) => {
      const list = await StatusListModel.findOne({ statusListId }).lean();
      return list ? this.mapStatusList(list) : null;
    },
    mutate: async (request: StatusMutationRequest) => {
      const list = await StatusListModel.findOne({ statusListId: request.statusListId });
      if (!list) return null;
      const existing = list.entries.find(
        (entry: any) => entry.credentialId === request.credentialId,
      );
      const status =
        request.operation === "revoke"
          ? "revoked"
          : request.operation === "suspend"
            ? "suspended"
            : "valid";
      if (existing) {
        existing.status = status as any;
        existing.updatedAt = new Date();
        existing.reason = request.reason;
      } else {
        list.entries.push({
          credentialId: request.credentialId,
          status: status as any,
          updatedAt: new Date(),
          reason: request.reason,
        } as any);
      }
      list.rootHash = hashValue(
        list.entries.map((entry: any) => ({
          credentialId: entry.credentialId,
          status: entry.status,
        })),
      );
      if (Array.isArray((request as any).chainAnchors) && (request as any).chainAnchors.length > 0) {
        list.chainAnchors = (request as any).chainAnchors;
      }
      await list.save();
      await this.recordAudit("status.updated", "success", "status-list", request.statusListId, {
        details: {
          credentialId: request.credentialId,
          operation: request.operation,
        },
      });
      return this.mapStatusList(list);
    },
  };

  audit = {
    record: async (event: any) => {
      const id = event.id ?? `audit:${uuidv4()}`;
      const created = await AuditEventModel.create({
        id,
        tenantId: event.tenantId,
        actorDid: event.actorDid,
        driver: event.driver ?? this.name,
        protocol: event.protocol,
        eventType: event.eventType,
        severity: event.severity ?? "info",
        subjectType: event.subjectType,
        subjectId: event.subjectId,
        action: event.action,
        status: event.status ?? "success",
        correlationId: event.correlationId,
        occurredAt: event.occurredAt ?? new Date(),
        details: event.details ?? {},
        hash: event.hash ?? hashValue(event),
        anchor: event.anchor,
      });
      return this.mapAudit(created);
    },
    get: async (eventId: string) => {
      const event = await AuditEventModel.findOne({ id: eventId }).lean();
      return event ? this.mapAudit(event) : null;
    },
    list: async (tenantId?: string) => {
      const items = await AuditEventModel.find(tenantId ? { tenantId } : {})
        .sort({ occurredAt: -1 })
        .lean();
      return items.map((event) => this.mapAudit(event));
    },
  };

  protocol: any = {
    metadata: async (profile: ProtocolProfile) => {
      if (!this.capabilities.protocols.includes(profile)) {
        return null;
      }

      const root = `${baseUrl()}/v1/${this.name}/protocols/${profile}`;

      const metadataByProfile: Record<ProtocolProfile, ProtocolMetadataRecord> = {
        oidc4vci: {
          protocol: "oidc4vci",
          supportedCredentialFormats: this.capabilities.credentialFormats,
          supportedDidMethods: this.capabilities.didMethods,
          endpoints: [
            { type: "metadata", url: `${root}/metadata`, methods: ["GET"] },
            { type: "authorization", url: `${root}/authorize`, methods: ["POST"] },
            { type: "token", url: `${root}/token`, methods: ["POST"] },
            { type: "credential", url: `${root}/credentials`, methods: ["POST"] },
            {
              type: "deferred-credential",
              url: `${root}/deferred`,
              methods: ["GET"],
            },
            { type: "callback", url: `${root}/callback`, methods: ["POST"] },
          ],
        },
        oidc4vp: {
          protocol: "oidc4vp",
          supportedCredentialFormats: this.capabilities.credentialFormats,
          supportedDidMethods: this.capabilities.didMethods,
          endpoints: [
            { type: "metadata", url: `${root}/metadata`, methods: ["GET"] },
            { type: "authorization", url: `${root}/authorize`, methods: ["POST"] },
            { type: "presentation", url: `${root}/presentations`, methods: ["POST"] },
            { type: "response", url: `${root}/callback`, methods: ["POST"] },
            { type: "qr", url: `${root}/qr`, methods: ["GET"] },
          ],
        },
        siopv2: {
          protocol: "siopv2",
          supportedCredentialFormats: this.capabilities.credentialFormats,
          supportedDidMethods: this.capabilities.didMethods,
          endpoints: [
            { type: "metadata", url: `${root}/metadata`, methods: ["GET"] },
            { type: "authorization", url: `${root}/authorize`, methods: ["POST"] },
            { type: "response", url: `${root}/callback`, methods: ["POST"] },
          ],
        },
        dcql: {
          protocol: "dcql",
          supportedCredentialFormats: this.capabilities.credentialFormats,
          supportedDidMethods: this.capabilities.didMethods,
          endpoints: [
            { type: "metadata", url: `${root}/metadata`, methods: ["GET"] },
            { type: "presentation", url: `${root}/query`, methods: ["POST"] },
          ],
        },
        "didcomm-v2": {
          protocol: "didcomm-v2",
          supportedCredentialFormats: this.capabilities.credentialFormats,
          supportedDidMethods: this.capabilities.didMethods,
          endpoints: [
            { type: "metadata", url: `${root}/metadata`, methods: ["GET"] },
            { type: "callback", url: `${root}/messages`, methods: ["POST"] },
          ],
        },
        aries: {
          protocol: "aries",
          supportedCredentialFormats: this.capabilities.credentialFormats,
          supportedDidMethods: this.capabilities.didMethods,
          endpoints: [{ type: "metadata", url: `${root}/metadata`, methods: ["GET"] }],
        },
        "openid-federation": {
          protocol: "openid-federation",
          supportedCredentialFormats: this.capabilities.credentialFormats,
          supportedDidMethods: this.capabilities.didMethods,
          endpoints: [{ type: "metadata", url: `${root}/metadata`, methods: ["GET"] }],
        },
      };

      return metadataByProfile[profile] ?? null;
    },
    createSession: async (profile: ProtocolProfile, payload: Record<string, unknown>) => {
      const id = `session:${uuidv4()}`;
      const session = await ProtocolSessionModel.create({
        id,
        protocol: profile,
        tenantId: payload.tenantId as string | undefined,
        issuerDid: payload.issuerDid as string | undefined,
        verifierDid: payload.verifierDid as string | undefined,
        holderDid: payload.holderDid as string | undefined,
        walletId: payload.walletId as string | undefined,
        state: "created",
        challenge: String(payload.challenge ?? uuidv4()),
        nonce: String(payload.nonce ?? uuidv4()),
        authorizationCode:
          (payload.authorizationCode as string | undefined) ?? `auth:${uuidv4()}`,
        preAuthorizedCode:
          (payload.preAuthorizedCode as string | undefined) ?? `preauth:${uuidv4()}`,
        deepLink: `${baseUrl()}/wallet?protocol=${profile}&session=${id}`,
        qrPayload: JSON.stringify({ protocol: profile, sessionId: id }),
        callbackUrl: payload.callbackUrl as string | undefined,
        requestObject: payload,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        metadata: payload.metadata ?? {},
      });
      await this.recordAudit("protocol.session.updated", "success", "protocol-session", id, {
        protocol: profile,
        tenantId: payload.tenantId as string | undefined,
      });
      return this.mapProtocolSession(session);
    },
    getSession: async (sessionId: string) => {
      const session = await ProtocolSessionModel.findOne({ id: sessionId }).lean();
      return session ? this.mapProtocolSession(session) : null;
    },
    getDeferredExchange: async (transactionId: string) => {
      const session = await ProtocolSessionModel.findOne({
        authorizationCode: transactionId,
      }).lean();
      if (!session) return null;
      return {
        transactionId,
        protocol: session.protocol as ProtocolProfile,
        sessionId: session.id,
        credentialFormat: "vc-jwt",
        state: session.state === "issued" ? "ready" : "pending",
        subjectId: session.holderDid,
        expiresAt: session.expiresAt,
        metadata: session.metadata,
      };
    },
  };

  credential = {
    issue: async (request: IssueCredentialRequest) => {
      await this.ensureIssuerTrusted(request.issuerDid);
      const schema = await SchemaModel.findOne({ id: request.schema.id }).lean();
      if (!schema) {
        throw new Error(`Schema '${request.schema.id}' not found`);
      }
      if (schema.active === false) {
        throw new Error(`Schema '${request.schema.id}' is not active`);
      }

      if (request.templateId) {
        const template = await CredentialTemplateModel.findOne({
          templateId: request.templateId,
        }).lean();
        if (!template) {
          throw new Error(`Template '${request.templateId}' not found`);
        }
        if (!template.enabled) {
          throw new Error(`Template '${request.templateId}' is not enabled`);
        }
      }

      const handler = this.formatRegistry.get(request.format);
      if (!handler) {
        throw new Error(`Credential format '${request.format}' is not supported`);
      }

      const issued = await handler.issue(request, {
        driver: this.name,
        issuerDid: request.issuerDid,
        holderDid: request.holderDid,
        tenantId: request.tenantId,
      });

      const recordId = `cred:${uuidv4()}`;
      const persisted = await CredentialModel.create({
        id: recordId,
        tenantId: request.tenantId,
        format: request.format,
        schemaId: request.schema.id,
        templateId: request.templateId,
        subject: request.claims,
        issuer: request.issuerDid,
        holderDid: request.holderDid,
        subjectId: request.subjectId,
        proofType: issued.record.proofType,
        credential: issued.credential,
        hash: issued.record.hash,
        status: issued.record.status ? { ...issued.record.status } : undefined,
        metadata: request.metadata ?? {},
        issuedAt: new Date(),
      });

      if (request.status?.listId) {
        const statusList = await StatusListModel.findOne({
          statusListId: request.status.listId,
        });
        if (statusList) {
          const exists = statusList.entries.find(
            (entry: any) => entry.credentialId === recordId,
          );
          if (!exists) {
            statusList.entries.push({
              credentialId: recordId,
              status: request.status.status ?? "valid",
              updatedAt: new Date(),
            } as any);
            statusList.rootHash = hashValue(statusList.entries);
            await statusList.save();
          }
        }
      }

      await this.recordAudit("credential.issued", "success", "credential", recordId, {
        actorDid: request.issuerDid,
        tenantId: request.tenantId,
        details: { format: request.format },
      });

      return {
        ...issued,
        record: {
          ...issued.record,
          id: recordId,
        },
      };
    },
    verify: async (request: VerifyCredentialRequest) => {
      const format = request.format ?? this.inferCredentialFormat(request.credential);
      const handler = this.formatRegistry.get(format);
      if (!handler) {
        throw new Error(`Credential format '${format}' is not supported`);
      }

      const result = await handler.verify(request, { driver: this.name });
      const issuerDid = this.extractIssuerDid(request.credential, format);
      const schemaId = this.extractSchemaId(request.credential, format);
      const stored = await this.findCredentialRecord(request.credential);

      const issuer = issuerDid ? await this.issuer.getByDid(issuerDid) : null;
      const schema = schemaId ? await SchemaModel.findOne({ id: schemaId }).lean() : null;
      const statusCheck = request.resolveStatus
        ? await this.resolveCredentialStatus(
            stored?.id,
            stored?.status?.listId as string | undefined,
          )
        : { ok: true, status: "valid" };
      const trustCheck = issuerDid
        ? await this.resolveTrustForDid(issuerDid, "issuer")
        : { ok: true };

      result.checks.issuer = !!issuer && issuer.status === "active";
      result.checks.schema = !!schema;
      result.checks.status = statusCheck.ok;
      result.checks.trust = trustCheck.ok;

      const valid =
        result.valid &&
        result.checks.signature &&
        result.checks.structure &&
        !!result.checks.issuer &&
        !!result.checks.schema &&
        !!result.checks.status &&
        !!result.checks.trust;

      const errors = [...(result.errors ?? [])];
      if (!result.checks.issuer) errors.push("Issuer is not onboarded or active");
      if (!result.checks.schema) errors.push("Credential schema could not be resolved");
      if (!result.checks.status) errors.push(`Credential status is ${statusCheck.status}`);
      if (!result.checks.trust) errors.push("Issuer is not active in trust registry");

      await VerificationModel.create({
        vc: request.credential as any,
        verified: valid,
      });
      await this.recordAudit("credential.verified", valid ? "success" : "failure", "credential", stored?.id, {
        actorDid: issuerDid,
        tenantId: stored?.tenantId,
        details: { format },
      });

      return {
        ...result,
        valid,
        errors,
        record: stored ? this.mapCredential(stored) : null,
      };
    },
    list: async (tenantId?: string) => {
      const items = await CredentialModel.find(tenantId ? { tenantId } : {})
        .sort({ issuedAt: -1 })
        .lean();
      return items.map((item) => this.mapCredential(item));
    },
  };

  presentation = {
    create: async (request: PresentationRequest) => {
      const credentialIds = (request.metadata?.credentialIds as string[] | undefined) ?? [];
      const credentials = await CredentialModel.find({
        id: { $in: credentialIds },
      }).lean();
      const verifiableCredential = credentials.map((credential) => credential.credential);
      const presentation = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiablePresentation"],
        holder: request.holderDid,
        verifiableCredential,
        challenge: request.challenge,
        domain: request.domain,
      };
      const hash = hashValue(presentation);
      const id = `vp:${uuidv4()}`;
      const created = await PresentationModel.create({
        id,
        tenantId: request.tenantId,
        format:
          credentials.length === 1
            ? credentials[0].format
            : "mixed",
        credentialIds,
        holder: request.holderDid ?? "unknown",
        verifier: request.verifierDid,
        presentation,
        challenge: request.challenge,
        domain: request.domain,
        hash,
        metadata: request.metadata ?? {},
        createdAt: new Date(),
      });
      await this.recordAudit("presentation.created", "success", "presentation", id, {
        actorDid: request.holderDid,
        tenantId: request.tenantId,
      });
      return this.mapPresentationRecord(created);
    },
    verify: async (request: VerifyPresentationRequest) => {
      const vp = request.presentation as any;
      const embeddedCredentials = Array.isArray(vp?.verifiableCredential)
        ? vp.verifiableCredential
        : [];
      const verificationResults = await Promise.all(
        embeddedCredentials.map((credential: unknown) =>
          this.credential.verify({
            credential,
            format: this.inferCredentialFormat(credential),
            resolveStatus: request.resolveStatus,
          }),
        ),
      );

      const challengeOk =
        !request.challenge || request.challenge === vp?.challenge || request.challenge === vp?.proof?.challenge;
      const domainOk =
        !request.domain || request.domain === vp?.domain || request.domain === vp?.proof?.domain;
      const credentialsOk = verificationResults.every((result) => result.valid);
      const trustOk = request.verifyTrustChain
        ? verificationResults.every((result) => result.checks.trust !== false)
        : true;

      const valid = challengeOk && domainOk && credentialsOk && trustOk;
      const record = await this.findPresentationRecord(request.presentation);

      await this.recordAudit(
        "presentation.verified",
        valid ? "success" : "failure",
        "presentation",
        record?.id,
        {
          actorDid: vp?.holder,
          tenantId: record?.tenantId,
        },
      );

      return {
        valid,
        format: request.format,
        checks: {
          holderBinding: !!vp?.holder,
          challenge: challengeOk,
          domain: domainOk,
          credentials: credentialsOk,
          status: verificationResults.every((result) => result.checks.status !== false),
          trust: trustOk,
          disclosure: true,
        },
        errors: [
          ...verificationResults.flatMap((result) => result.errors ?? []),
          ...(challengeOk ? [] : ["Presentation challenge mismatch"]),
          ...(domainOk ? [] : ["Presentation domain mismatch"]),
        ],
        record: record ? this.mapPresentationRecord(record) : null,
      };
    },
  };

  // ---------------- DID ----------------
  async createDid(input: {
    type?: string;
    method?: string;
    publicKey?: string;
    publicKeyJwk?: Record<string, unknown>;
    domain?: string;
    address?: string;
    network?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const method = input.method ?? input.type ?? "internal";
    const did = createDID(method as any, {
      publicKey: input.publicKey,
      publicKeyJwk: input.publicKeyJwk,
      domain: input.domain,
      address: input.address,
      network: input.network,
    });

    await DIDModel.findOneAndUpdate(
      { did },
      {
        did,
        type: method,
        publicKey:
          input.publicKey ??
          (input.publicKeyJwk ? JSON.stringify(input.publicKeyJwk) : input.address ?? "managed"),
        metadata: input.metadata ?? {},
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return did;
  }

  async resolveDid(did: string): Promise<any> {
    const stored = await DIDModel.findOne({ did }).lean();
    if (stored) return stored as any;

    if (did.startsWith("did:key:")) {
      return resolveKeyDID(did);
    }
    if (did.startsWith("did:ethr:") || did.startsWith("did:pkh:")) {
      return resolveEthrDID(did, {
        rpcUrl: env.ethNodeUrl,
        chainId: env.ethChainId,
        registryAddress: env.ethRegistryAddress,
        registryDeployBlock: env.ethRegistryDeployBlock,
      });
    }
    return null;
  }

  // ---------------- Schema ----------------
  async registerSchema(schema: {
    name: string;
    definition: Record<string, any>;
    tenantId?: string;
    version?: string;
    format?: string;
  }): Promise<SchemaDocument> {
    const record = await this.schemaRegistry.register({
      name: schema.name,
      definition: schema.definition,
      tenantId: schema.tenantId,
      version: schema.version,
      format: schema.format,
      registryType: "internal",
    });
    return (await SchemaModel.findOne({ id: record.id }))!;
  }

  async getSchema(schemaId: string): Promise<SchemaDocument | null> {
    return SchemaModel.findOne({ id: schemaId }).lean();
  }

  // ---------------- Credential ----------------
  async issueCredential(payload: {
    schemaId: string;
    subject: Record<string, any>;
    issuer: string;
    format?: CredentialFormatProfile;
    holderDid?: string;
    tenantId?: string;
    templateId?: string;
    statusListId?: string;
  }): Promise<CredentialDocument> {
    const issued = await this.credential.issue({
      tenantId: payload.tenantId,
      issuerDid: payload.issuer,
      holderDid: payload.holderDid,
      format: payload.format ?? "vc-jwt",
      schema: { id: payload.schemaId },
      templateId: payload.templateId,
      claims: payload.subject,
      status: payload.statusListId
        ? {
            listId: payload.statusListId,
            profile: "statuslist2021",
            purpose: "revocation",
            status: "valid",
          }
        : undefined,
    });

    return (await CredentialModel.findOne({ id: issued.record.id }))!;
  }

  async verifyCredential(vc: CredentialDocument | unknown): Promise<boolean> {
    const result = await this.credential.verify({
      credential: vc,
      format: this.inferCredentialFormat(vc),
      resolveStatus: true,
    });
    return result.valid;
  }

  // ---------------- Presentation ----------------
  async createPresentation(input: {
    credentialIds: string[];
    holder: string;
    verifier?: string;
    challenge?: string;
    domain?: string;
    tenantId?: string;
  }): Promise<PresentationDocument> {
    const created = await this.presentation.create({
      tenantId: input.tenantId,
      verifierDid: input.verifier ?? "verifier:unknown",
      holderDid: input.holder,
      challenge: input.challenge ?? uuidv4(),
      domain: input.domain,
      metadata: {
        credentialIds: input.credentialIds,
      },
    });
    return (await PresentationModel.findOne({ id: created.id }))!;
  }

  async verifyPresentation(vp: PresentationDocument | unknown): Promise<boolean> {
    const result = await this.presentation.verify({
      presentation: vp,
      format: "mixed",
      resolveStatus: true,
      verifyTrustChain: true,
    });
    return result.valid;
  }

  protected inferCredentialFormat(
    credential: unknown,
  ): CredentialFormatProfile {
    if (typeof credential === "string") {
      return "vc-jwt";
    }
    const value = credential as any;
    if (value?.compact && Array.isArray(value?.disclosures)) {
      return "sd-jwt-vc";
    }
    if (value?.proof?.type === "BbsBlsSignature2020") {
      return "bbs-vc";
    }
    if (value?.proof) {
      return "vc-ldp";
    }
    if (value?.format) {
      return value.format;
    }
    return "vc-jwt";
  }

  protected extractIssuerDid(credential: unknown, format: CredentialFormatProfile) {
    const value = credential as any;
    if (format === "vc-jwt") {
      try {
        const decoded = verifyJWT(
          String(credential),
          env.jwtKey || "dev-jwt-key",
        ) as any;
        return decoded?.iss;
      } catch {
        return undefined;
      }
    }
    if (format === "sd-jwt-vc") {
      try {
        const decoded = verifyJWT(
          value?.compact,
          env.sdJwtKey || env.jwtKey || "dev-sdjwt-key",
        ) as any;
        return decoded?.iss;
      } catch {
        return undefined;
      }
    }
    return value?.issuer;
  }

  protected extractSchemaId(credential: unknown, format: CredentialFormatProfile) {
    const value = credential as any;
    if (format === "vc-jwt") {
      try {
        const decoded = verifyJWT(
          String(credential),
          env.jwtKey || "dev-jwt-key",
        ) as any;
        return decoded?.vc?.credentialSchema?.id;
      } catch {
        return undefined;
      }
    }
    if (format === "sd-jwt-vc") {
      try {
        const decoded = verifyJWT(
          value?.compact,
          env.sdJwtKey || env.jwtKey || "dev-sdjwt-key",
        ) as any;
        return decoded?.vct;
      } catch {
        return undefined;
      }
    }
    return value?.credentialSchema?.id;
  }

  private async ensureIssuerTrusted(issuerDid: string) {
    const issuer = await this.issuer.getByDid(issuerDid);
    if (!issuer || issuer.status !== "active") {
      throw new Error(`Issuer '${issuerDid}' is not onboarded or active`);
    }

    const trust = await this.resolveTrustForDid(issuerDid, "issuer");
    if (!trust.ok) {
      throw new Error(`Issuer '${issuerDid}' is not active in the trust registry`);
    }
  }

  private async resolveTrustForDid(did: string, entityType: string) {
    const entries = (await this.trustRegistry.query?.({
      did,
      entityType,
    })) as TrustRegistryRecord[] | undefined;
    if (!entries || entries.length === 0) {
      return { ok: true };
    }
    return { ok: entries.some((entry) => entry.status === "active") };
  }

  protected async ensureApprovedGovernance(params: {
    subjectType: GovernanceProposal["subjectType"];
    subjectIds?: Array<string | undefined | null>;
    tenantId?: string;
    issuerDid?: string;
    policyRef?: string;
    operation: string;
  }) {
    const subjectIds = Array.from(
      new Set(
        (params.subjectIds ?? []).filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0,
        ),
      ),
    );

    const query: Record<string, unknown> = {
      subjectType: params.subjectType,
      status: "approved",
    };

    if (params.tenantId) {
      query.tenantId = params.tenantId;
    }

    const matchers: Record<string, unknown>[] = [];
    if (subjectIds.length > 0) {
      matchers.push({ subjectId: { $in: subjectIds } });
    }
    if (params.issuerDid) {
      matchers.push({ issuerDid: params.issuerDid });
    }
    if (params.policyRef) {
      matchers.push({ policyRef: params.policyRef });
    }

    if (matchers.length === 1) {
      Object.assign(query, matchers[0]);
    } else if (matchers.length > 1) {
      query.$or = matchers;
    }

    const approved = await GovernanceModel.findOne(query).lean();
    if (approved) {
      return approved;
    }

    const targets = [
      ...subjectIds,
      ...(params.issuerDid ? [params.issuerDid] : []),
      ...(params.policyRef ? [params.policyRef] : []),
    ];

    throw new Error(
      `Governance approval is required before ${params.operation}. Expected an approved '${params.subjectType}' proposal for ${targets.join(", ") || params.subjectType}.`,
    );
  }

  protected async resolveCredentialStatus(credentialId?: string, listId?: string) {
    if (!credentialId) {
      return { ok: true, status: "valid" };
    }
    const lists = await StatusListModel.find(
      listId ? { statusListId: listId } : { "entries.credentialId": credentialId },
    ).lean();

    for (const list of lists) {
      const entry = list.entries.find((candidate: any) => candidate.credentialId === credentialId);
      if (entry && entry.status !== "valid") {
        return { ok: false, status: entry.status };
      }
    }
    return { ok: true, status: "valid" };
  }

  protected async findCredentialRecord(credential: unknown) {
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

  private async findPresentationRecord(presentation: unknown) {
    const value = presentation as any;
    if (value?.id) {
      return PresentationModel.findOne({ id: value.id }).lean();
    }
    return PresentationModel.findOne({
      hash: hashValue(presentation),
    }).lean();
  }

  protected mapCredential(stored: any): CredentialRecord {
    return {
      id: stored.id,
      tenantId: stored.tenantId,
      format: stored.format as CredentialFormatProfile,
      schema: { id: stored.schemaId },
      template: stored.templateId ? { id: stored.templateId } : undefined,
      issuerDid: stored.issuer,
      subjectId: stored.subjectId,
      subjectData: stored.subject,
      proofType: stored.proofType,
      credential: stored.credential,
      hash: stored.hash,
      status: stored.status as any,
      metadata: stored.metadata,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };
  }

  protected mapSchema(schema: any) {
    return {
      id: schema.id,
      tenantId: schema.tenantId,
      name: schema.name,
      version: schema.version,
      format: schema.format,
      registryType: schema.registryType,
      definition: schema.definition,
      uri: schema.uri,
      hash: schema.hash,
      active: schema.active,
      anchors: schema.anchors,
      metadata: schema.metadata,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
    };
  }

  protected mapTemplate(template: any): TemplateRecord {
    return {
      id: template.templateId,
      tenantId: template.tenantId,
      title: template.title,
      description: template.description,
      schemaId: template.schemaId,
      format: template.format,
      defaults: template.defaults,
      registryType: template.registryType,
      enabled: template.enabled,
      anchors: template.anchors,
      metadata: template.metadata,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  protected mapTrustRecord(record: any): TrustRegistryRecord {
    return {
      id: record.id,
      tenantId: record.tenantId,
      registryId: record.registryId,
      entityType: record.entityType,
      entityId: record.entityId,
      did: record.did,
      name: record.name,
      status: record.status,
      trustFrameworkId: record.trustFrameworkId,
      accreditationLevel: record.accreditationLevel,
      scopes: record.scopes,
      metadataUri: record.metadataUri,
      hash: record.hash,
      anchors: record.anchors,
      metadata: record.metadata,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  protected mapGovernance(record: any): GovernanceProposal {
    return {
      proposalId: record.proposalId,
      tenantId: record.tenantId,
      issuerDid: record.issuerDid,
      governanceType: record.governanceType,
      approvals: record.approvals,
      requiredApprovals: record.requiredApprovals,
      status: record.status,
      subjectType: record.subjectType,
      subjectId: record.subjectId,
      policyRef: record.policyRef,
      chainAnchors: record.chainAnchors,
      metadata: record.metadata,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  protected mapStatusList(list: any): StatusListRecord {
    return {
      id: list.statusListId,
      tenantId: list.tenantId,
      issuerDid: list.issuerDid,
      profile: list.profile,
      purpose: list.purpose,
      listUri: list.listUri,
      encodedList: list.encodedList,
      rootHash: list.rootHash,
      chainAnchors: list.chainAnchors,
      metadata: list.metadata,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    };
  }

  private mapAudit(record: any): AuditEventRecord {
    return {
      id: record.id,
      tenantId: record.tenantId,
      actorDid: record.actorDid,
      driver: record.driver,
      protocol: record.protocol,
      eventType: record.eventType,
      severity: record.severity,
      subjectType: record.subjectType,
      subjectId: record.subjectId,
      action: record.action,
      status: record.status,
      correlationId: record.correlationId,
      occurredAt: record.occurredAt,
      details: record.details,
      hash: record.hash,
      anchor: record.anchor,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private mapProtocolSession(session: any): ProtocolSession {
    return {
      id: session.id,
      protocol: session.protocol,
      tenantId: session.tenantId,
      issuerDid: session.issuerDid,
      verifierDid: session.verifierDid,
      holderDid: session.holderDid,
      walletId: session.walletId,
      state: session.state,
      challenge: session.challenge,
      nonce: session.nonce,
      authorizationCode: session.authorizationCode,
      preAuthorizedCode: session.preAuthorizedCode,
      deepLink: session.deepLink,
      qrPayload: session.qrPayload,
      callbackUrl: session.callbackUrl,
      requestObject: session.requestObject,
      responseObject: session.responseObject,
      expiresAt: session.expiresAt,
      metadata: session.metadata,
    };
  }

  private mapPresentationRecord(record: any): PresentationRecord {
    return {
      id: record.id,
      tenantId: record.tenantId,
      holderDid: record.holder,
      verifierDid: record.verifier,
      format: record.format,
      presentation: record.presentation,
      credentialIds: record.credentialIds,
      challenge: record.challenge,
      domain: record.domain,
      metadata: record.metadata,
      hash: record.hash,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  protected async recordAudit(
    eventType: string,
    status: "success" | "failure" | "pending",
    subjectType: string,
    subjectId: string | undefined,
    context: {
      actorDid?: string;
      tenantId?: string;
      protocol?: string;
      details?: Record<string, unknown>;
    } = {},
  ) {
    return this.audit.record({
      eventType: eventType as any,
      severity: status === "failure" ? "warning" : "info",
      subjectType,
      subjectId,
      action: eventType,
      status,
      actorDid: context.actorDid,
      tenantId: context.tenantId,
      protocol: context.protocol as any,
      details: context.details,
      occurredAt: new Date(),
    });
  }
}
