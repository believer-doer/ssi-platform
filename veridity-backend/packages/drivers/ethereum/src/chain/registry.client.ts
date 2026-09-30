import { ethers } from "ethers";
import { UNIVERSAL_REGISTRY_ABI } from "./abi/universalRegistry";
import type {
  EthereumContractWriteResult,
  EthereumGovernanceChainRecord,
  EthereumRegistryEvent,
  EthereumRegistryEventName,
  EthereumGovernanceStatus,
  EthereumIssuerChainRecord,
  EthereumRecordStatus,
  EthereumRegistryClientOptions,
  EthereumSchemaChainRecord,
  EthereumStatusRootChainRecord,
  EthereumTemplateChainRecord,
  EthereumTrustChainRecord,
  EthereumVerifierChainRecord,
} from "./config";

const REGISTRY_EVENT_NAMES: EthereumRegistryEventName[] = [
  "IssuerUpserted",
  "IssuerStatusUpdated",
  "IssuerRegistered",
  "IssuerRevoked",
  "VerifierUpserted",
  "VerifierStatusUpdated",
  "VerifierRegistered",
  "VerifierRevoked",
  "SchemaUpserted",
  "SchemaStatusUpdated",
  "SchemaRegistered",
  "SchemaRevoked",
  "TemplateUpserted",
  "TemplateStatusUpdated",
  "TemplateRegistered",
  "TemplateRevoked",
  "TrustRecordUpserted",
  "TrustRecordStatusUpdated",
  "GovernanceProposalUpserted",
  "GovernanceProposalApproved",
  "StatusRootUpserted",
];

const RECORD_STATUS_TO_ENUM: Record<EthereumRecordStatus, number> = {
  unknown: 0,
  pending: 1,
  active: 2,
  suspended: 3,
  revoked: 4,
};

const ENUM_TO_RECORD_STATUS: Record<number, EthereumRecordStatus> = {
  0: "unknown",
  1: "pending",
  2: "active",
  3: "suspended",
  4: "revoked",
};

const GOVERNANCE_STATUS_TO_ENUM: Record<EthereumGovernanceStatus, number> = {
  unknown: 0,
  pending: 1,
  approved: 2,
  rejected: 3,
  executed: 4,
  cancelled: 5,
};

const ENUM_TO_GOVERNANCE_STATUS: Record<number, EthereumGovernanceStatus> = {
  0: "unknown",
  1: "pending",
  2: "approved",
  3: "rejected",
  4: "executed",
  5: "cancelled",
};

type UniversalRegistryContract = ethers.Contract & {
  upsertIssuer(did: string, metadataURI: string, status: number): Promise<ethers.ContractTransactionResponse>;
  setIssuerStatus(did: string, status: number): Promise<ethers.ContractTransactionResponse>;
  registerIssuer(did: string, metadataURI: string): Promise<ethers.ContractTransactionResponse>;
  revokeIssuer(did: string): Promise<ethers.ContractTransactionResponse>;
  getIssuer(did: string): Promise<[number, string, bigint]>;
  upsertVerifier(did: string, metadataURI: string, status: number): Promise<ethers.ContractTransactionResponse>;
  setVerifierStatus(did: string, status: number): Promise<ethers.ContractTransactionResponse>;
  registerVerifier(did: string, metadataURI: string): Promise<ethers.ContractTransactionResponse>;
  revokeVerifier(did: string): Promise<ethers.ContractTransactionResponse>;
  getVerifier(did: string): Promise<[number, string, bigint]>;
  upsertSchema(schemaId: string, uri: string, status: number): Promise<ethers.ContractTransactionResponse>;
  setSchemaStatus(schemaId: string, status: number): Promise<ethers.ContractTransactionResponse>;
  registerSchema(schemaId: string, uri: string): Promise<ethers.ContractTransactionResponse>;
  revokeSchema(schemaId: string): Promise<ethers.ContractTransactionResponse>;
  getSchema(schemaId: string): Promise<[string, number, bigint]>;
  upsertTemplate(templateId: string, uri: string, status: number): Promise<ethers.ContractTransactionResponse>;
  setTemplateStatus(templateId: string, status: number): Promise<ethers.ContractTransactionResponse>;
  registerTemplate(templateId: string, uri: string): Promise<ethers.ContractTransactionResponse>;
  revokeTemplate(templateId: string): Promise<ethers.ContractTransactionResponse>;
  getTemplate(templateId: string): Promise<[string, number, bigint]>;
  upsertTrustRecord(
    recordId: string,
    registryId: string,
    entityType: string,
    entityId: string,
    did: string,
    metadataURI: string,
    status: number,
  ): Promise<ethers.ContractTransactionResponse>;
  setTrustRecordStatus(recordId: string, status: number): Promise<ethers.ContractTransactionResponse>;
  getTrustRecord(recordId: string): Promise<[string, string, string, string, string, number, bigint]>;
  upsertGovernanceProposal(
    proposalId: string,
    issuerDid: string,
    governanceType: string,
    subjectType: string,
    subjectId: string,
    requiredApprovals: bigint | number,
    status: number,
    policyRef: string,
    metadataURI: string,
  ): Promise<ethers.ContractTransactionResponse>;
  approveGovernanceProposal(proposalId: string): Promise<ethers.ContractTransactionResponse>;
  getGovernanceProposal(proposalId: string): Promise<[string, string, string, string, bigint, bigint, number, string, string, bigint]>;
  upsertStatusRoot(statusListId: string, listUri: string, rootHash: string): Promise<ethers.ContractTransactionResponse>;
  getStatusRoot(statusListId: string): Promise<[string, string, bigint]>;
};

export class EthereumRegistryClient {
  readonly provider: ethers.JsonRpcProvider;
  readonly signer: ethers.Signer;
  readonly registryAddress: string;
  readonly chainId?: number;
  private readonly contract: UniversalRegistryContract;

  constructor(options: EthereumRegistryClientOptions) {
    this.provider = options.provider;
    this.signer = options.signer;
    this.registryAddress = options.registryAddress;
    this.chainId = options.chainId;
    this.contract = new ethers.Contract(
      this.registryAddress,
      UNIVERSAL_REGISTRY_ABI,
      this.signer,
    ) as UniversalRegistryContract;
  }

  async getSignerAddress() {
    return this.signer.getAddress();
  }

  async getNetworkChainId() {
    if (this.chainId) {
      return this.chainId;
    }

    const network = await this.provider.getNetwork();
    return Number(network.chainId);
  }

  async getAdmin() {
    return this.contract.admin();
  }

  async getLatestBlockNumber() {
    return this.provider.getBlockNumber();
  }

  async queryRegistryEvents(fromBlock: number, toBlock: number): Promise<EthereumRegistryEvent[]> {
    if (fromBlock > toBlock) {
      return [];
    }

    const eventGroups = await Promise.all(
      REGISTRY_EVENT_NAMES.map(async (eventName) => {
        const logs = await this.contract.queryFilter(eventName, fromBlock, toBlock);
        return logs.map((log) => this.toRegistryEvent(log as ethers.EventLog, eventName));
      }),
    );

    return eventGroups
      .flat()
      .sort((left, right) => {
        if (left.blockNumber !== right.blockNumber) {
          return left.blockNumber - right.blockNumber;
        }
        return left.logIndex - right.logIndex;
      });
  }

  watchRegistryEvents(
    listener: (event: EthereumRegistryEvent) => void | Promise<void>,
  ) {
    const cleanups = REGISTRY_EVENT_NAMES.map((eventName) => {
      const handler = (...args: unknown[]) => {
        const log = args[args.length - 1] as ethers.EventLog;
        void listener(this.toRegistryEvent(log, eventName));
      };

      this.contract.on(eventName, handler);
      return () => this.contract.off(eventName, handler);
    });

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }

  async upsertIssuer(did: string, metadataURI: string, status: EthereumRecordStatus) {
    return this.sendWrite(() => this.contract.upsertIssuer(did, metadataURI, this.toRecordStatusEnum(status)));
  }

  async setIssuerStatus(did: string, status: EthereumRecordStatus) {
    return this.sendWrite(() => this.contract.setIssuerStatus(did, this.toRecordStatusEnum(status)));
  }

  async registerIssuer(did: string, metadataURI: string) {
    return this.sendWrite(() => this.contract.registerIssuer(did, metadataURI));
  }

  async revokeIssuer(did: string) {
    return this.sendWrite(() => this.contract.revokeIssuer(did));
  }

  async getIssuer(did: string): Promise<EthereumIssuerChainRecord> {
    const [status, metadataURI, updatedAt] = await this.contract.getIssuer(did);
    return {
      status: this.fromRecordStatusEnum(status),
      metadataURI,
      updatedAt,
    };
  }

  async upsertVerifier(did: string, metadataURI: string, status: EthereumRecordStatus) {
    return this.sendWrite(() => this.contract.upsertVerifier(did, metadataURI, this.toRecordStatusEnum(status)));
  }

  async setVerifierStatus(did: string, status: EthereumRecordStatus) {
    return this.sendWrite(() => this.contract.setVerifierStatus(did, this.toRecordStatusEnum(status)));
  }

  async registerVerifier(did: string, metadataURI: string) {
    return this.sendWrite(() => this.contract.registerVerifier(did, metadataURI));
  }

  async revokeVerifier(did: string) {
    return this.sendWrite(() => this.contract.revokeVerifier(did));
  }

  async getVerifier(did: string): Promise<EthereumVerifierChainRecord> {
    const [status, metadataURI, updatedAt] = await this.contract.getVerifier(did);
    return {
      status: this.fromRecordStatusEnum(status),
      metadataURI,
      updatedAt,
    };
  }

  async upsertSchema(schemaId: string, uri: string, status: EthereumRecordStatus) {
    return this.sendWrite(() => this.contract.upsertSchema(this.toBytes32Id(schemaId), uri, this.toRecordStatusEnum(status)));
  }

  async setSchemaStatus(schemaId: string, status: EthereumRecordStatus) {
    return this.sendWrite(() => this.contract.setSchemaStatus(this.toBytes32Id(schemaId), this.toRecordStatusEnum(status)));
  }

  async registerSchema(schemaId: string, uri: string) {
    return this.sendWrite(() => this.contract.registerSchema(this.toBytes32Id(schemaId), uri));
  }

  async revokeSchema(schemaId: string) {
    return this.sendWrite(() => this.contract.revokeSchema(this.toBytes32Id(schemaId)));
  }

  async getSchema(schemaId: string): Promise<EthereumSchemaChainRecord> {
    const [uri, status, updatedAt] = await this.contract.getSchema(this.toBytes32Id(schemaId));
    return {
      status: this.fromRecordStatusEnum(status),
      uri,
      updatedAt,
    };
  }

  async upsertTemplate(templateId: string, uri: string, status: EthereumRecordStatus) {
    return this.sendWrite(() => this.contract.upsertTemplate(this.toBytes32Id(templateId), uri, this.toRecordStatusEnum(status)));
  }

  async setTemplateStatus(templateId: string, status: EthereumRecordStatus) {
    return this.sendWrite(() => this.contract.setTemplateStatus(this.toBytes32Id(templateId), this.toRecordStatusEnum(status)));
  }

  async registerTemplate(templateId: string, uri: string) {
    return this.sendWrite(() => this.contract.registerTemplate(this.toBytes32Id(templateId), uri));
  }

  async revokeTemplate(templateId: string) {
    return this.sendWrite(() => this.contract.revokeTemplate(this.toBytes32Id(templateId)));
  }

  async getTemplate(templateId: string): Promise<EthereumTemplateChainRecord> {
    const [uri, status, updatedAt] = await this.contract.getTemplate(this.toBytes32Id(templateId));
    return {
      status: this.fromRecordStatusEnum(status),
      uri,
      updatedAt,
    };
  }

  async upsertTrustRecord(
    recordId: string,
    registryId: string,
    entityType: string,
    entityId: string,
    did: string,
    metadataURI: string,
    status: EthereumRecordStatus,
  ) {
    return this.sendWrite(
      () => this.contract.upsertTrustRecord(
        this.toBytes32Id(recordId),
        registryId,
        entityType,
        entityId,
        did,
        metadataURI,
        this.toRecordStatusEnum(status),
      ),
    );
  }

  async setTrustRecordStatus(recordId: string, status: EthereumRecordStatus) {
    return this.sendWrite(
      () => this.contract.setTrustRecordStatus(this.toBytes32Id(recordId), this.toRecordStatusEnum(status)),
    );
  }

  async getTrustRecord(recordId: string): Promise<EthereumTrustChainRecord> {
    const [registryId, entityType, entityId, did, metadataURI, status, updatedAt] =
      await this.contract.getTrustRecord(this.toBytes32Id(recordId));
    return {
      registryId,
      entityType,
      entityId,
      did,
      metadataURI,
      status: this.fromRecordStatusEnum(status),
      updatedAt,
    };
  }

  async upsertGovernanceProposal(input: {
    proposalId: string;
    issuerDid?: string;
    governanceType: string;
    subjectType: string;
    subjectId: string;
    requiredApprovals: number;
    status: EthereumGovernanceStatus;
    policyRef?: string;
    metadataURI: string;
  }) {
    return this.sendWrite(
      () => this.contract.upsertGovernanceProposal(
        this.toBytes32Id(input.proposalId),
        input.issuerDid ?? "",
        input.governanceType,
        input.subjectType,
        input.subjectId,
        input.requiredApprovals,
        this.toGovernanceStatusEnum(input.status),
        input.policyRef ?? "",
        input.metadataURI,
      ),
    );
  }

  async approveGovernanceProposal(proposalId: string) {
    return this.sendWrite(() => this.contract.approveGovernanceProposal(this.toBytes32Id(proposalId)));
  }

  async getGovernanceProposal(proposalId: string): Promise<EthereumGovernanceChainRecord> {
    const [
      issuerDid,
      governanceType,
      subjectType,
      subjectId,
      requiredApprovals,
      approvalCount,
      status,
      policyRef,
      metadataURI,
      updatedAt,
    ] = await this.contract.getGovernanceProposal(this.toBytes32Id(proposalId));

    return {
      issuerDid,
      governanceType,
      subjectType,
      subjectId,
      requiredApprovals,
      approvalCount,
      status: this.fromGovernanceStatusEnum(status),
      policyRef,
      metadataURI,
      updatedAt,
    };
  }

  async upsertStatusRoot(statusListId: string, listUri: string, rootHash: string) {
    return this.sendWrite(
      () => this.contract.upsertStatusRoot(this.toBytes32Id(statusListId), listUri, rootHash),
    );
  }

  async getStatusRoot(statusListId: string): Promise<EthereumStatusRootChainRecord> {
    const [listUri, rootHash, updatedAt] = await this.contract.getStatusRoot(this.toBytes32Id(statusListId));
    return {
      listUri,
      rootHash,
      updatedAt,
    };
  }

  private toBytes32Id(value: string) {
    return ethers.id(value);
  }

  private toRegistryEvent(
    log: ethers.EventLog,
    fallbackName?: EthereumRegistryEventName,
  ): EthereumRegistryEvent {
    const args = Object.fromEntries(
      log.fragment.inputs.map((input, index) => [
        input.name || `${index}`,
        log.args[index],
      ]),
    );

    return {
      name: (log.fragment.name as EthereumRegistryEventName | undefined) ?? fallbackName ?? "StatusRootUpserted",
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      logIndex: Number((log as unknown as { index?: number; logIndex?: number }).index ?? (log as unknown as { logIndex?: number }).logIndex ?? 0),
      args,
    };
  }

  private toRecordStatusEnum(status: EthereumRecordStatus) {
    return RECORD_STATUS_TO_ENUM[status];
  }

  private fromRecordStatusEnum(status: bigint | number) {
    return ENUM_TO_RECORD_STATUS[Number(status)] ?? "unknown";
  }

  private toGovernanceStatusEnum(status: EthereumGovernanceStatus) {
    return GOVERNANCE_STATUS_TO_ENUM[status];
  }

  private fromGovernanceStatusEnum(status: bigint | number) {
    return ENUM_TO_GOVERNANCE_STATUS[Number(status)] ?? "unknown";
  }

  private isNonceExpiredError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

    return code === "NONCE_EXPIRED"
      || message.includes("nonce has already been used")
      || message.includes("Nonce too low");
  }

  private async resetSignerNonce() {
    const maybeNonceManager = this.signer as ethers.Signer & {
      reset?: () => void | Promise<void>;
    };

    await maybeNonceManager.reset?.();
  }

  private async sendWrite(
    write: () => Promise<ethers.ContractTransactionResponse>,
  ): Promise<EthereumContractWriteResult> {
    let tx: ethers.ContractTransactionResponse;
    try {
      tx = await write();
    } catch (error) {
      if (!this.isNonceExpiredError(error)) {
        throw error;
      }

      await this.resetSignerNonce();
      tx = await write();
    }
    const receipt = await tx.wait();
    const chainId = await this.getNetworkChainId();

    return {
      txHash: tx.hash,
      chainId,
      blockNumber: receipt?.blockNumber ?? null,
      status: receipt?.status === 1 ? "confirmed" : "failed",
    };
  }
}
