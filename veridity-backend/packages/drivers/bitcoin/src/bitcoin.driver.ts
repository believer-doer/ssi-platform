import { HybridBackedDriver } from "../../internal/src/hybrid.driver";
import type {
  CredentialFormatProfile,
  GovernanceAnchor,
  Metadata,
  TrustRegistryRecord,
  VerifyCredentialRequest,
} from "@ssi/core/types";
import { v4 as uuidv4 } from "uuid";
import { AuditEventModel } from "../../internal/src/models/auditEvent.model";
import { CredentialModel } from "../../internal/src/models/credential.model";
import GovernanceModel from "../../internal/src/models/governance.model";
import StatusListModel from "../../internal/src/models/status.model";
import { TrustRegistryModel } from "../../internal/src/models/trustRegistry.model";
import type { BitcoinDriverOptions } from "./anchor/config";
import { BitcoinAnchorClient } from "./anchor/bitcoin-anchor.client";
import { BitcoinAnchorIndexer } from "./anchor/indexer";

function appendOrReplaceAnchor(
  anchors: GovernanceAnchor[] | undefined,
  nextAnchor: GovernanceAnchor,
) {
  const existing = [...(anchors ?? [])];
  const index = existing.findIndex(
    (anchor) => anchor.commitmentId === nextAnchor.commitmentId,
  );

  if (index >= 0) {
    existing[index] = {
      ...existing[index],
      ...nextAnchor,
    };
    return existing;
  }

  return [...existing, nextAnchor];
}

function mergeBitcoinMetadata(
  metadata: Metadata | undefined,
  anchor: GovernanceAnchor,
  network?: string,
) {
  return {
    ...(metadata ?? {}),
    driver: "bitcoin",
    network,
    bitcoinAnchor: {
      commitmentId: anchor.commitmentId,
      batchId: anchor.batchId,
      txid: anchor.transactionHash,
      confirmationStatus: anchor.confirmationStatus,
      confirmations: anchor.confirmations,
      rootHash: anchor.rootHash,
      leafHash: anchor.leafHash,
      blockHash: anchor.blockHash,
      blockHeight: anchor.blockNumber,
      error: anchor.error,
      updatedAt: new Date().toISOString(),
    },
  };
}

function buildTrustCommitmentPayload(record: {
  id: string;
  tenantId?: string;
  registryId: string;
  entityType: string;
  entityId: string;
  did?: string;
  status: string;
  hash?: string;
}) {
  return {
    id: record.id,
    tenantId: record.tenantId,
    registryId: record.registryId,
    entityType: record.entityType,
    entityId: record.entityId,
    did: record.did,
    status: record.status,
    hash: record.hash,
  };
}

function buildStatusCommitmentPayload(list: {
  id: string;
  tenantId?: string;
  issuerDid: string;
  listUri?: string;
  rootHash?: string;
  purpose?: string;
  profile?: string;
}) {
  return {
    statusListId: list.id,
    tenantId: list.tenantId,
    issuerDid: list.issuerDid,
    listUri: list.listUri,
    rootHash: list.rootHash,
    purpose: list.purpose ?? "revocation",
    profile: list.profile ?? "statuslist2021",
  };
}

export class BitcoinDriver extends HybridBackedDriver {
  readonly anchorClient: BitcoinAnchorClient | null;
  readonly anchorIndexer: BitcoinAnchorIndexer | null;

  constructor(options: BitcoinDriverOptions = {}) {
    super({
      name: "bitcoin",
      network: options.network ?? "bitcoin",
      maturity: "pilot",
      defaultDidMethod: "pkh",
      didMethods: ["did:pkh", "did:key", "did:jwk"],
      credentialFormats: ["vc-jwt", "vc-ldp", "sd-jwt-vc", "bbs-vc"],
      protocols: ["oidc4vci", "oidc4vp", "siopv2", "dcql", "didcomm-v2"],
    });
    this.anchorClient = options.nodeUrl
      ? new BitcoinAnchorClient({
        nodeUrl: options.nodeUrl,
        walletName: options.walletName,
        network: options.network,
      })
      : null;
    this.anchorIndexer = this.anchorClient
      ? new BitcoinAnchorIndexer(this.anchorClient, options.network)
      : null;

    if (this.anchorIndexer) {
      this.wrapBitcoinAnchoredDomainServices();
    }
  }

  get hasAnchorClient() {
    return this.anchorClient !== null;
  }

  get hasAnchorIndexer() {
    return this.anchorIndexer !== null;
  }

  async getAnchorStatus(txid: string) {
    return this.anchorClient?.getConfirmations(txid) ?? null;
  }

  async getBlockchainInfo() {
    return this.anchorClient?.getBlockchainInfo() ?? null;
  }

  async processAnchorBatch(limit = 25) {
    return this.anchorIndexer?.processNextBatch(limit) ?? null;
  }

  async reconcileAnchorBatches() {
    return this.anchorIndexer?.reconcilePendingBatches() ?? { reconciled: 0 };
  }

  private wrapBitcoinAnchoredDomainServices() {
    const indexer = this.anchorIndexer;
    if (!indexer) {
      return;
    }

    const baseTrustRegistry = this.baseDomainServices.trustRegistry;
    const baseGovernance = this.baseDomainServices.governance;
    const baseStatus = this.baseDomainServices.status;
    const baseAudit = this.baseDomainServices.audit;
    const baseCredential = this.baseDomainServices.credential;

    this.trustRegistry = {
      ...this.trustRegistry,
      register: async (record: any) => {
        const created = await baseTrustRegistry.register({
          ...record,
          anchors: record.anchors ?? [],
          metadata: {
            ...(record.metadata ?? {}),
            driver: this.name,
            network: this.hybridOptions.network,
          },
        });
        const anchor = await indexer.queueCommitment({
          sourceKind: "trust-registry",
          sourceId: created.id,
          tenantId: created.tenantId,
          subjectId: created.entityId,
          anchorType: created.status === "active" ? "approval" : "policy",
          payload: buildTrustCommitmentPayload(created),
        });
        await TrustRegistryModel.findOneAndUpdate(
          { id: created.id },
          {
            anchors: appendOrReplaceAnchor(created.anchors as GovernanceAnchor[] | undefined, anchor),
            metadata: mergeBitcoinMetadata(created.metadata, anchor, this.hybridOptions.network),
          },
          { new: true },
        );
        return baseTrustRegistry.get(created.id);
      },
      updateStatus: async (recordId: string, status: any) => {
        const updated = await baseTrustRegistry.updateStatus?.(recordId, status);
        if (!updated) return null;
        const anchor = await indexer.queueCommitment({
          sourceKind: "trust-registry",
          sourceId: updated.id,
          tenantId: updated.tenantId,
          subjectId: updated.entityId,
          anchorType: status === "active" ? "approval" : "policy",
          payload: buildTrustCommitmentPayload(updated),
        });
        await TrustRegistryModel.findOneAndUpdate(
          { id: updated.id },
          {
            anchors: appendOrReplaceAnchor(updated.anchors as GovernanceAnchor[] | undefined, anchor),
            metadata: mergeBitcoinMetadata(updated.metadata, anchor, this.hybridOptions.network),
          },
          { new: true },
        );
        return baseTrustRegistry.get(updated.id);
      },
    };

    this.governance = {
      ...this.governance,
      createProposal: async (input: any) => {
        const created = await baseGovernance.createProposal({
          ...input,
          chainAnchors: input.chainAnchors ?? [],
          metadata: {
            ...(input.metadata ?? {}),
            driver: this.name,
            network: this.hybridOptions.network,
          },
        });
        const anchor = await indexer.queueCommitment({
          sourceKind: "governance",
          sourceId: created.proposalId,
          tenantId: created.tenantId,
          subjectId: created.subjectId,
          anchorType: created.governanceType === "policy" ? "policy" : "approval",
          payload: {
            proposalId: created.proposalId,
            tenantId: created.tenantId,
            issuerDid: created.issuerDid,
            governanceType: created.governanceType,
            subjectType: created.subjectType,
            subjectId: created.subjectId,
            requiredApprovals: created.requiredApprovals,
            status: created.status,
            policyRef: created.policyRef,
          },
        });
        await GovernanceModel.findOneAndUpdate(
          { proposalId: created.proposalId },
          {
            chainAnchors: appendOrReplaceAnchor(created.chainAnchors, anchor),
            metadata: mergeBitcoinMetadata(created.metadata, anchor, this.hybridOptions.network),
          },
          { new: true },
        );
        return baseGovernance.getProposal(created.proposalId);
      },
      approve: async (proposalId: string, approverDid: string, signature?: string) => {
        const approved = await baseGovernance.approve?.(proposalId, approverDid, signature);
        if (!approved) return null;
        const anchor = await indexer.queueCommitment({
          sourceKind: "governance",
          sourceId: approved.proposalId,
          tenantId: approved.tenantId,
          subjectId: approved.subjectId,
          anchorType: "approval",
          payload: {
            proposalId: approved.proposalId,
            tenantId: approved.tenantId,
            approverDid,
            governanceType: approved.governanceType,
            subjectType: approved.subjectType,
            subjectId: approved.subjectId,
            status: approved.status,
            requiredApprovals: approved.requiredApprovals,
            approvals: approved.approvals,
            signature,
          },
        });
        await GovernanceModel.findOneAndUpdate(
          { proposalId: approved.proposalId },
          {
            chainAnchors: appendOrReplaceAnchor(approved.chainAnchors, anchor),
            metadata: mergeBitcoinMetadata(approved.metadata, anchor, this.hybridOptions.network),
          },
          { new: true },
        );
        return baseGovernance.getProposal(approved.proposalId);
      },
    };

    this.status = {
      ...this.status,
      createList: async (input: any) => {
        const created = await baseStatus.createList({
          ...input,
          chainAnchors: input.chainAnchors ?? [],
          metadata: {
            ...(input.metadata ?? {}),
            driver: this.name,
            network: this.hybridOptions.network,
          },
        });
        const anchor = await indexer.queueCommitment({
          sourceKind: "status-list",
          sourceId: created.id,
          tenantId: created.tenantId,
          subjectId: created.id,
          anchorType: "status-root",
          payload: buildStatusCommitmentPayload(created),
        });
        await StatusListModel.findOneAndUpdate(
          { statusListId: created.id },
          {
            chainAnchors: appendOrReplaceAnchor(created.chainAnchors, anchor),
            metadata: mergeBitcoinMetadata(created.metadata, anchor, this.hybridOptions.network),
          },
          { new: true },
        );
        return baseStatus.getList(created.id);
      },
      mutate: async (request: any) => {
        const updated = await baseStatus.mutate(request);
        if (!updated) return null;
        const anchor = await indexer.queueCommitment({
          sourceKind: "status-list",
          sourceId: updated.id,
          tenantId: updated.tenantId,
          subjectId: updated.id,
          anchorType: "status-root",
          payload: buildStatusCommitmentPayload(updated),
        });
        await StatusListModel.findOneAndUpdate(
          { statusListId: updated.id },
          {
            chainAnchors: appendOrReplaceAnchor(updated.chainAnchors, anchor),
            metadata: mergeBitcoinMetadata(updated.metadata, anchor, this.hybridOptions.network),
          },
          { new: true },
        );
        return baseStatus.getList(updated.id);
      },
    };

    this.audit = {
      ...this.audit,
      record: async (event: any) => {
        const eventId = event.id ?? `audit:${uuidv4()}`;
        const created = await baseAudit.record({
          ...event,
          id: eventId,
          driver: this.name,
          details: {
            ...(event.details ?? {}),
            network: this.hybridOptions.network,
          },
        });
        const anchor = await indexer.queueCommitment({
          sourceKind: "audit",
          sourceId: created.id,
          tenantId: created.tenantId,
          subjectId: created.subjectId ?? created.id,
          anchorType: "audit",
          payload: {
            id: created.id,
            tenantId: created.tenantId,
            actorDid: created.actorDid,
            protocol: created.protocol,
            eventType: created.eventType,
            severity: created.severity,
            subjectType: created.subjectType,
            subjectId: created.subjectId,
            action: created.action,
            status: created.status,
            occurredAt: created.occurredAt,
            hash: created.hash,
          },
        });
        await AuditEventModel.findOneAndUpdate(
          { id: created.id },
          {
            anchor,
            details: {
              ...(created.details ?? {}),
              anchor,
            },
          },
          { new: true },
        );
        return baseAudit.get(created.id);
      },
    };

    this.credential = {
      ...this.credential,
      verify: async (request: VerifyCredentialRequest) => {
        const result = await baseCredential.verify(request);
        const format = request.format ?? this.inferCredentialFormat(request.credential);
        const stored = await this.findCredentialRecord(request.credential);
        const issuerDid = request.expectedIssuerDid
          ?? (stored?.issuer as string | undefined)
          ?? this.extractIssuerDid(request.credential, format as CredentialFormatProfile);

        const trustAnchorCheck = issuerDid
          ? await this.verifyBitcoinTrustAnchor(issuerDid)
          : { ok: true, mode: "unavailable" as const };
        const statusAnchorCheck = request.resolveStatus === false
          ? { ok: true, mode: "unavailable" as const }
          : await this.verifyBitcoinStatusAnchor(
              stored?.id,
              stored?.status?.listId as string | undefined,
            );

        const errors = [...(result.errors ?? [])];

        if (!trustAnchorCheck.ok) {
          result.checks.trust = false;
          errors.push(trustAnchorCheck.reason ?? "Bitcoin trust anchor could not be verified");
        }

        if (!statusAnchorCheck.ok) {
          result.checks.status = false;
          errors.push(statusAnchorCheck.reason ?? "Bitcoin status anchor could not be verified");
        }

        const valid =
          result.valid
          && result.checks.signature
          && result.checks.structure
          && !!result.checks.issuer
          && !!result.checks.schema
          && (request.resolveStatus === false || !!result.checks.status)
          && !!result.checks.trust;

        return {
          ...result,
          valid,
          errors,
        };
      },
    };
  }

  private async verifyBitcoinTrustAnchor(issuerDid: string) {
    const records = (await this.baseDomainServices.trustRegistry.query?.({
      did: issuerDid,
      entityType: "issuer",
    })) as TrustRegistryRecord[] | undefined;

    if (!records || records.length === 0) {
      return { ok: true, mode: "unavailable" as const };
    }

    const activeRecords = records.filter((record) => record.status === "active");
    if (activeRecords.length === 0) {
      return { ok: false, mode: "anchor-required" as const, reason: "Issuer is not active in trust registry" };
    }

    const bitcoinRecords = activeRecords.filter((record) => this.hasBitcoinAnchorState(record.anchors, record.metadata));
    if (bitcoinRecords.length === 0) {
      return { ok: true, mode: "unavailable" as const };
    }

    let firstFailure: string | undefined;
    for (const record of bitcoinRecords) {
      const verification = await this.anchorIndexer!.verifyCommitment({
        sourceKind: "trust-registry",
        sourceId: record.id,
        tenantId: record.tenantId,
        subjectId: record.entityId,
        anchorType: "approval",
        payload: buildTrustCommitmentPayload(record),
      });
      if (verification.ok) {
        return { ok: true, mode: "confirmed" as const, anchor: verification.anchor };
      }
      firstFailure ??= verification.reason;
    }

    return {
      ok: false,
      mode: "anchor-required" as const,
      reason: firstFailure ?? `No confirmed Bitcoin trust anchor was found for issuer '${issuerDid}'`,
    };
  }

  private async verifyBitcoinStatusAnchor(credentialId?: string, listId?: string) {
    if (!credentialId) {
      return { ok: true, mode: "unavailable" as const };
    }

    const lists = await StatusListModel.find(
      listId ? { statusListId: listId } : { "entries.credentialId": credentialId },
    ).lean();

    if (lists.length === 0) {
      return { ok: true, mode: "unavailable" as const };
    }

    let firstFailure: string | undefined;

    for (const list of lists) {
      const entry = list.entries.find((candidate: any) => candidate.credentialId === credentialId);
      if (!entry) {
        continue;
      }

      if (entry.status !== "valid") {
        return {
          ok: false,
          mode: "anchor-required" as const,
          reason: `Credential status is ${entry.status}`,
        };
      }

      if (!this.hasBitcoinAnchorState(list.chainAnchors as GovernanceAnchor[] | undefined, list.metadata)) {
        continue;
      }

      const verification = await this.anchorIndexer!.verifyCommitment({
        sourceKind: "status-list",
        sourceId: list.statusListId,
        tenantId: list.tenantId,
        subjectId: list.statusListId,
        anchorType: "status-root",
        payload: buildStatusCommitmentPayload({
          id: list.statusListId,
          tenantId: list.tenantId,
          issuerDid: list.issuerDid,
          listUri: list.listUri,
          rootHash: list.rootHash,
          purpose: list.purpose,
          profile: list.profile,
        }),
      });

      if (verification.ok) {
        return { ok: true, mode: "confirmed" as const, anchor: verification.anchor };
      }

      firstFailure ??= verification.reason;
    }

    if (firstFailure) {
      return {
        ok: false,
        mode: "anchor-required" as const,
        reason: firstFailure,
      };
    }

    return { ok: true, mode: "unavailable" as const };
  }

  private hasBitcoinAnchorState(
    anchors?: GovernanceAnchor[],
    metadata?: Metadata,
  ) {
    return Boolean(
      anchors?.some((anchor) => anchor.driver === "bitcoin")
      || metadata?.driver === "bitcoin"
      || metadata?.bitcoinAnchor,
    );
  }
}
