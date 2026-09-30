import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import type { GovernanceAnchor } from "@ssi/core/types";
import { AuditEventModel } from "../../../internal/src/models/auditEvent.model";
import { BitcoinAnchorBatchModel } from "../../../internal/src/models/bitcoinAnchorBatch.model";
import {
  BitcoinAnchorCommitmentModel,
  type BitcoinCommitmentSourceKind,
} from "../../../internal/src/models/bitcoinAnchorCommitment.model";
import GovernanceModel from "../../../internal/src/models/governance.model";
import StatusListModel from "../../../internal/src/models/status.model";
import { TrustRegistryModel } from "../../../internal/src/models/trustRegistry.model";
import type { BitcoinAnchorClient } from "./bitcoin-anchor.client";
import { buildMerkleTreeFromLeafHashes, hashCommitment, verifyMerkleProof } from "./merkle";

function hashValue(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function anchorStateSummary(anchor: GovernanceAnchor) {
  return {
    commitmentId: anchor.commitmentId,
    batchId: anchor.batchId,
    txid: anchor.transactionHash,
    rootHash: anchor.rootHash,
    confirmationStatus: anchor.confirmationStatus,
    confirmations: anchor.confirmations,
    blockHash: anchor.blockHash,
    blockHeight: anchor.blockNumber,
    error: anchor.error,
    updatedAt: new Date().toISOString(),
  };
}

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

export interface QueueBitcoinCommitmentInput {
  sourceKind: BitcoinCommitmentSourceKind;
  sourceId: string;
  tenantId?: string;
  subjectId?: string;
  anchorType: GovernanceAnchor["anchorType"];
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface BitcoinAnchorVerificationResult {
  ok: boolean;
  state: "missing" | "pending" | "confirmed" | "invalid" | "failed";
  anchor?: GovernanceAnchor;
  reason?: string;
}

export class BitcoinAnchorIndexer {
  private static readonly TARGET_CONFIRMATIONS = 6;

  constructor(
    private readonly client: BitcoinAnchorClient,
    private readonly network?: string,
  ) {}

  async queueCommitment(input: QueueBitcoinCommitmentInput): Promise<GovernanceAnchor> {
    const payloadHash = hashValue(input.payload);
    const commitmentKey = this.createCommitmentKey({
      sourceKind: input.sourceKind,
      sourceId: input.sourceId,
      anchorType: input.anchorType,
      payload: input.payload,
    });
    let commitment = await BitcoinAnchorCommitmentModel.findOne({ commitmentKey });

    if (!commitment) {
      commitment = await BitcoinAnchorCommitmentModel.create({
        commitmentId: `btc:commit:${uuidv4()}`,
        commitmentKey,
        driver: "bitcoin",
        network: this.network,
        sourceKind: input.sourceKind,
        sourceId: input.sourceId,
        tenantId: input.tenantId,
        subjectId: input.subjectId,
        anchorType: input.anchorType,
        payload: input.payload,
        payloadHash,
        leafHash: hashCommitment(JSON.stringify(input.payload)).toString("hex"),
        confirmationStatus: "queued",
        confirmations: 0,
        merkleProof: [],
        metadata: input.metadata ?? {},
      });
    }

    return this.toAnchor(commitment);
  }

  async verifyCommitment(
    input: QueueBitcoinCommitmentInput,
    options: { minimumConfirmations?: number } = {},
  ): Promise<BitcoinAnchorVerificationResult> {
    const commitmentKey = this.createCommitmentKey(input);
    const commitment = await BitcoinAnchorCommitmentModel.findOne({ commitmentKey }).lean();
    if (!commitment) {
      return {
        ok: false,
        state: "missing",
        reason: `No Bitcoin anchor commitment exists for ${input.sourceKind} '${input.sourceId}'`,
      };
    }

    const anchor = this.toAnchor(commitment);
    const minimumConfirmations = options.minimumConfirmations ?? 1;

    if (!commitment.rootHash || !commitment.txid) {
      return {
        ok: false,
        state: "pending",
        anchor,
        reason: "Bitcoin anchor batch has not been broadcast yet",
      };
    }

    if (
      commitment.confirmationStatus !== "confirmed"
      || commitment.confirmations < minimumConfirmations
    ) {
      return {
        ok: false,
        state: commitment.confirmationStatus === "failed" || commitment.confirmationStatus === "stale"
          ? "failed"
          : "pending",
        anchor,
        reason: commitment.confirmationStatus === "failed" || commitment.confirmationStatus === "stale"
          ? commitment.error ?? "Bitcoin anchor is not in a usable confirmation state"
          : `Bitcoin anchor has ${commitment.confirmations} confirmation(s); ${minimumConfirmations} required`,
      };
    }

    const proofOk = verifyMerkleProof(
      commitment.leafHash,
      commitment.merkleProof as Array<{ position: "left" | "right"; hash: string }> | undefined,
      commitment.rootHash,
    );
    if (!proofOk) {
      return {
        ok: false,
        state: "invalid",
        anchor,
        reason: "Stored Bitcoin Merkle proof does not match the anchored root hash",
      };
    }

    if (commitment.batchId) {
      const batch = await BitcoinAnchorBatchModel.findOne({ batchId: commitment.batchId }).lean();
      if (!batch) {
        return {
          ok: false,
          state: "invalid",
          anchor,
          reason: `Bitcoin anchor batch '${commitment.batchId}' could not be found`,
        };
      }

      if (
        batch.txid !== commitment.txid
        || batch.rootHash !== commitment.rootHash
        || batch.confirmationStatus !== "confirmed"
      ) {
        return {
          ok: false,
          state: "invalid",
          anchor,
          reason: "Bitcoin commitment state does not match its persisted batch state",
        };
      }
    }

    return {
      ok: true,
      state: "confirmed",
      anchor,
    };
  }

  async processNextBatch(limit = 25) {
    const commitments = await BitcoinAnchorCommitmentModel.find({
      driver: "bitcoin",
      confirmationStatus: "queued",
    })
      .sort({ createdAt: 1 })
      .limit(limit);

    if (commitments.length === 0) {
      return null;
    }

    const batchId = `btc:batch:${uuidv4()}`;
    const tree = buildMerkleTreeFromLeafHashes(commitments.map((commitment) => commitment.leafHash));
    const batch = await BitcoinAnchorBatchModel.create({
      batchId,
      driver: "bitcoin",
      network: this.network,
      rootHash: tree.rootHash,
      leafCount: commitments.length,
      confirmationStatus: "building",
      confirmations: 0,
      commitmentIds: commitments.map((commitment) => commitment.commitmentId),
    });

    for (let index = 0; index < commitments.length; index += 1) {
      commitments[index].batchId = batchId;
      commitments[index].rootHash = tree.rootHash;
      commitments[index].merkleProof = tree.proofs[index] as any;
      commitments[index].confirmationStatus = "batched";
      commitments[index].lastCheckedAt = new Date();
      await commitments[index].save();
      await this.applyCommitmentState(commitments[index]);
    }

    try {
      const tx = await this.client.commitRoot(tree.rootHash);
      const broadcastAt = new Date();

      batch.txid = tx.txid;
      batch.rawTxHex = tx.hex;
      batch.broadcastAt = broadcastAt;
      batch.lastCheckedAt = broadcastAt;
      batch.confirmationStatus = "mempool";
      await batch.save();

      for (const commitment of commitments) {
        commitment.txid = tx.txid;
        commitment.anchoredAt = broadcastAt;
        commitment.lastCheckedAt = broadcastAt;
        commitment.confirmationStatus = "mempool";
        commitment.error = undefined;
        await commitment.save();
        await this.applyCommitmentState(commitment);
      }

      return {
        batchId,
        txid: tx.txid,
        leafCount: commitments.length,
      };
    } catch (error) {
      const message = (error as Error).message;

      batch.confirmationStatus = "failed";
      batch.error = message;
      batch.lastCheckedAt = new Date();
      await batch.save();

      for (const commitment of commitments) {
        commitment.confirmationStatus = "failed";
        commitment.error = message;
        commitment.lastCheckedAt = new Date();
        await commitment.save();
        await this.applyCommitmentState(commitment);
      }

      return {
        batchId,
        leafCount: commitments.length,
        error: message,
      };
    }
  }

  async reconcilePendingBatches(mempoolTimeoutMs = 30 * 60 * 1000) {
    const batches = await BitcoinAnchorBatchModel.find({
      driver: "bitcoin",
      confirmationStatus: { $in: ["mempool", "confirmed"] },
    }).sort({ updatedAt: 1 });

    let reconciled = 0;
    for (const batch of batches) {
      if (
        batch.confirmationStatus === "confirmed"
        && batch.confirmations >= BitcoinAnchorIndexer.TARGET_CONFIRMATIONS
      ) {
        continue;
      }

      if (!batch.txid) {
        continue;
      }

      try {
        const receipt = await this.client.getTransactionReceipt(batch.txid);
        const nextStatus =
          receipt.status === "confirmed"
            ? "confirmed"
            : receipt.status === "conflicted"
              ? "stale"
              : "mempool";

        batch.confirmationStatus = nextStatus;
        batch.confirmations = receipt.confirmations;
        batch.blockhash = receipt.blockhash;
        batch.blockheight = receipt.blockheight;
        batch.lastCheckedAt = new Date();
        if (nextStatus === "confirmed" && !batch.confirmedAt) {
          batch.confirmedAt = receipt.blocktime
            ? new Date(receipt.blocktime * 1000)
            : new Date();
        }
        await batch.save();

        const commitments = await BitcoinAnchorCommitmentModel.find({ batchId: batch.batchId });
        for (const commitment of commitments) {
          commitment.confirmationStatus = nextStatus;
          commitment.confirmations = receipt.confirmations;
          commitment.blockhash = receipt.blockhash;
          commitment.blockheight = receipt.blockheight;
          commitment.lastCheckedAt = new Date();
          commitment.error = nextStatus === "stale" ? "Bitcoin transaction became conflicted" : undefined;
          await commitment.save();
          await this.applyCommitmentState(commitment);
          reconciled += 1;
        }
      } catch (error) {
        const shouldMarkStale = Boolean(
          batch.broadcastAt
            && Date.now() - batch.broadcastAt.getTime() > mempoolTimeoutMs,
        );
        if (!shouldMarkStale) {
          continue;
        }

        const message = (error as Error).message;
        batch.confirmationStatus = "stale";
        batch.error = message;
        batch.lastCheckedAt = new Date();
        await batch.save();

        const commitments = await BitcoinAnchorCommitmentModel.find({ batchId: batch.batchId });
        for (const commitment of commitments) {
          commitment.confirmationStatus = "stale";
          commitment.error = message;
          commitment.lastCheckedAt = new Date();
          await commitment.save();
          await this.applyCommitmentState(commitment);
          reconciled += 1;
        }
      }
    }

    return { reconciled };
  }

  private toAnchor(commitment: {
    commitmentId: string;
    batchId?: string;
    txid?: string;
    blockheight?: number;
    blockhash?: string;
    confirmations: number;
    confirmationStatus: string;
    rootHash?: string;
    leafHash: string;
    merkleProof?: Array<{ position: "left" | "right"; hash: string }>;
    error?: string;
    anchorType: GovernanceAnchor["anchorType"];
    anchoredAt?: Date;
  }): GovernanceAnchor {
    return {
      driver: "bitcoin",
      network: this.network,
      commitmentId: commitment.commitmentId,
      batchId: commitment.batchId,
      transactionHash: commitment.txid,
      blockNumber: commitment.blockheight,
      blockHash: commitment.blockhash,
      confirmations: commitment.confirmations,
      confirmationStatus: commitment.confirmationStatus as GovernanceAnchor["confirmationStatus"],
      rootHash: commitment.rootHash,
      leafHash: commitment.leafHash,
      merkleProof: commitment.merkleProof,
      error: commitment.error,
      anchorType: commitment.anchorType,
      anchoredAt: commitment.anchoredAt,
    };
  }

  private createCommitmentKey(input: Pick<QueueBitcoinCommitmentInput, "sourceKind" | "sourceId" | "anchorType" | "payload">) {
    return hashValue({
      sourceKind: input.sourceKind,
      sourceId: input.sourceId,
      anchorType: input.anchorType,
      payloadHash: hashValue(input.payload),
    });
  }

  private async applyCommitmentState(commitment: {
    sourceKind: BitcoinCommitmentSourceKind;
    sourceId: string;
    commitmentId: string;
    batchId?: string;
    txid?: string;
    blockheight?: number;
    blockhash?: string;
    confirmations: number;
    confirmationStatus: string;
    rootHash?: string;
    leafHash: string;
    merkleProof?: Array<{ position: "left" | "right"; hash: string }>;
    error?: string;
    anchorType: GovernanceAnchor["anchorType"];
    anchoredAt?: Date;
  }) {
    const anchor = this.toAnchor(commitment);

    if (commitment.sourceKind === "trust-registry") {
      const record = await TrustRegistryModel.findOne({ id: commitment.sourceId });
      if (!record) return;
      record.anchors = appendOrReplaceAnchor(record.anchors as GovernanceAnchor[] | undefined, anchor) as any;
      record.metadata = {
        ...(record.metadata ?? {}),
        bitcoinAnchor: anchorStateSummary(anchor),
      };
      await record.save();
      return;
    }

    if (commitment.sourceKind === "governance") {
      const record = await GovernanceModel.findOne({ proposalId: commitment.sourceId });
      if (!record) return;
      record.chainAnchors = appendOrReplaceAnchor(record.chainAnchors as GovernanceAnchor[] | undefined, anchor) as any;
      record.metadata = {
        ...(record.metadata ?? {}),
        bitcoinAnchor: anchorStateSummary(anchor),
      };
      await record.save();
      return;
    }

    if (commitment.sourceKind === "status-list") {
      const list = await StatusListModel.findOne({ statusListId: commitment.sourceId });
      if (!list) return;
      list.chainAnchors = appendOrReplaceAnchor(list.chainAnchors as GovernanceAnchor[] | undefined, anchor) as any;
      list.metadata = {
        ...(list.metadata ?? {}),
        bitcoinAnchor: anchorStateSummary(anchor),
      };
      await list.save();
      return;
    }

    if (commitment.sourceKind === "audit") {
      const event = await AuditEventModel.findOne({ id: commitment.sourceId });
      if (!event) return;
      event.anchor = anchor as any;
      event.details = {
        ...(event.details ?? {}),
        anchor,
      };
      await event.save();
    }
  }
}
