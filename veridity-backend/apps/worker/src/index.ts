import * as path from "path";
import * as dotenv from "dotenv";
import { BitcoinDriver } from "@ssi/driver-bitcoin";
import { EthereumDriver } from "@ssi/driver-ethereum";
import { logger } from "@ssi/utils";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { env } from "@ssi/config";
import { connectDB } from "../../../packages/drivers/internal/src/db";
import { ProtocolSessionModel } from "../../../packages/drivers/internal/src/models/protocolSession.model";
import { resolveDriver } from "../../../packages/plugins";
import { protocolJobs } from "@ssi/utils";

const workerLogger = logger.child("worker");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateSession(
  sessionId: string,
  patch: Record<string, unknown>,
) {
  await ProtocolSessionModel.findOneAndUpdate(
    { id: sessionId },
    patch,
    { new: true },
  );
}

async function processOidc4VciSession(driver: any, session: any) {
  const payload = (session.requestObject ?? {}) as Record<string, unknown>;

  if (!driver.credential) {
    workerLogger.warn("Driver does not support credential issuance for OIDC4VCI session", {
      driver: driver.name,
      sessionId: session.id,
    });
    await updateSession(session.id, {
      state: "failed",
      responseObject: { error: "Credential service is not supported by this driver" },
    });
    return;
  }

  if (!payload.issuerDid || !(payload.schema || payload.schemaId)) {
    workerLogger.warn("OIDC4VCI session is missing issuance payload details", {
      driver: driver.name,
      sessionId: session.id,
    });
    await updateSession(session.id, {
      state: "authorized",
      responseObject: {
        authorizationCode: session.authorizationCode,
        message: "Session authorized but issuance payload is incomplete",
      },
    });
    return;
  }

  const issued = await driver.credential.issue({
    tenantId: session.tenantId,
    issuerDid: String(payload.issuerDid),
    holderDid: (payload.holderDid as string | undefined) ?? session.holderDid,
    subjectId: payload.subjectId as string | undefined,
    walletId: payload.walletId as string | undefined,
    format: (payload.format as any) ?? "vc-jwt",
    schema: (payload.schema as any) ?? { id: String(payload.schemaId) },
    templateId: payload.templateId as string | undefined,
    claims: (payload.claims as Record<string, unknown>) ?? (payload.subject as Record<string, unknown>) ?? {},
    proofType: payload.proofType as string | undefined,
    status: payload.status as any,
    issuanceProtocol: "oidc4vci",
    defer: Boolean(payload.defer),
    metadata: {
      ...((payload.metadata as Record<string, unknown> | undefined) ?? {}),
      protocolSessionId: session.id,
      protocolWorker: true,
    },
  });

  await updateSession(session.id, {
    state: "issued",
    responseObject: {
      credentialId: issued.record.id,
      format: issued.format,
      deferred: issued.deferred,
      authorizationCode: session.authorizationCode,
    },
  });
}

async function processVerificationSession(driver: any, session: any) {
  const payload = (session.requestObject ?? {}) as Record<string, unknown>;
  const presentation = payload.presentation ?? payload.responseObject;

  if (!presentation || !driver.presentation) {
    workerLogger.debug("Verification session is still waiting for a presentation payload", {
      driver: driver.name,
      sessionId: session.id,
      protocol: session.protocol,
    });
    await updateSession(session.id, {
      state: "pending",
      responseObject: {
        message: "Waiting for wallet or holder presentation payload",
      },
    });
    return;
  }

  const verified = await driver.presentation.verify({
    presentation,
    format: (payload.format as any) ?? "mixed",
    challenge: (payload.challenge as string | undefined) ?? session.challenge,
    domain: (payload.domain as string | undefined) ?? undefined,
    resolveStatus: true,
    verifyTrustChain: true,
    metadata: {
      protocolSessionId: session.id,
      protocolWorker: true,
    },
  });

  await updateSession(session.id, {
    state: verified.valid ? "verified" : "failed",
    responseObject: verified,
  });
}

async function processDidcommSession(session: any) {
  const payload = (session.requestObject ?? {}) as Record<string, unknown>;
  await updateSession(session.id, {
    state: payload.message ? "presented" : "pending",
    responseObject: {
      transport: "didcomm-v2",
      messageId: payload.messageId ?? null,
      acknowledgedAt: new Date().toISOString(),
    },
  });
  workerLogger.info("Acknowledged DIDComm session", {
    sessionId: session.id,
    protocol: session.protocol,
  });
}

async function processJob(job: NonNullable<Awaited<ReturnType<typeof protocolJobs.poll>>>) {
  const driver = resolveDriver(job.driver as any);
  const session = await driver.protocol?.getSession?.(job.sessionId);

  if (!session) {
    workerLogger.warn("Skipping protocol job because the session no longer exists", {
      jobId: job.id,
      sessionId: job.sessionId,
      driver: job.driver,
      protocol: job.protocol,
    });
    return;
  }

  workerLogger.info("Processing protocol job", {
    jobId: job.id,
    sessionId: session.id,
    driver: driver.name,
    protocol: job.protocol,
  });

  await updateSession(session.id, {
    state: "pending",
    metadata: {
      ...(session.metadata ?? {}),
      workerJobId: job.id,
      processingStartedAt: new Date().toISOString(),
    },
  });

  try {
    if (job.protocol === "oidc4vci") {
      await processOidc4VciSession(driver, session);
    } else if (
      job.protocol === "oidc4vp" ||
      job.protocol === "siopv2" ||
      job.protocol === "dcql" ||
      job.protocol === "aries"
    ) {
      await processVerificationSession(driver, session);
    } else if (job.protocol === "didcomm-v2") {
      await processDidcommSession(session);
    } else {
      await updateSession(session.id, {
        state: "failed",
        responseObject: { error: `Unsupported protocol job '${job.protocol}'` },
      });
    }

    await driver.audit?.record({
      id: `audit:${job.id}:success`,
      tenantId: session.tenantId,
      actorDid: session.issuerDid ?? session.verifierDid ?? session.holderDid,
      driver: driver.name,
      protocol: session.protocol,
      eventType: "protocol.session.updated" as any,
      severity: "info",
      subjectType: "protocol-session",
      subjectId: session.id,
      action: "worker.process",
      status: "success",
      occurredAt: new Date(),
      details: {
        workerJobId: job.id,
        protocol: job.protocol,
      },
    });
    workerLogger.info("Protocol job completed", {
      jobId: job.id,
      sessionId: session.id,
      driver: driver.name,
      protocol: job.protocol,
    });
  } catch (error) {
    await updateSession(session.id, {
      state: "failed",
      responseObject: {
        error: (error as Error).message,
      },
    });
    await driver.audit?.record({
      id: `audit:${job.id}:failure`,
      tenantId: session.tenantId,
      actorDid: session.issuerDid ?? session.verifierDid ?? session.holderDid,
      driver: driver.name,
      protocol: session.protocol,
      eventType: "protocol.session.updated" as any,
      severity: "warning",
      subjectType: "protocol-session",
      subjectId: session.id,
      action: "worker.process",
      status: "failure",
      occurredAt: new Date(),
      details: {
        workerJobId: job.id,
        error: (error as Error).message,
      },
    });
    workerLogger.error("Protocol job failed", {
      jobId: job.id,
      sessionId: session.id,
      driver: driver.name,
      protocol: job.protocol,
      error,
    });
  }
}

async function startChainIndexers() {
  const ethereumDriver = env.enableEthereum ? resolveDriver("ethereum") : null;
  if (ethereumDriver instanceof EthereumDriver && ethereumDriver.hasRegistryClient) {
    const indexerLogger = workerLogger.child("ethereum-indexer");
    await ethereumDriver.startEventIndexer({
      onReady: ({ fromBlock, latestBlock }) => {
        indexerLogger.info("Ethereum event indexer is ready", {
          fromBlock,
          latestBlock,
        });
      },
      onEvent: (event) => {
        indexerLogger.debug("Processed Ethereum registry event", {
          event: event.name,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
        });
      },
      onError: (error, event) => {
        indexerLogger.error("Ethereum registry event processing failed", {
          error,
          event,
        });
      },
    });
  }

  const bitcoinDriver = env.enableBitcoin ? resolveDriver("bitcoin") : null;
  if (bitcoinDriver instanceof BitcoinDriver && bitcoinDriver.hasAnchorIndexer) {
    const indexerLogger = workerLogger.child("bitcoin-indexer");

    const runBitcoinIndexer = async () => {
      indexerLogger.info("Bitcoin anchor indexer loop started");

      while (true) {
        try {
          const batch = await bitcoinDriver.processAnchorBatch();
          if (batch) {
            indexerLogger.info("Processed Bitcoin anchor batch", batch);
          }

          const reconciliation = await bitcoinDriver.reconcileAnchorBatches();
          if (reconciliation.reconciled > 0) {
            indexerLogger.debug("Reconciled Bitcoin anchor confirmations", reconciliation);
          }
        } catch (error) {
          indexerLogger.error("Bitcoin anchor indexer iteration failed", { error });
        }

        await sleep(2_000);
      }
    };

    void runBitcoinIndexer();
  }
}

async function main() {
  if (!env.mongoUri) {
    workerLogger.error("Worker startup aborted: missing MONGO_URI");
    throw new Error("MONGO_URI is not defined in .env");
  }

  await connectDB(env.mongoUri);
  workerLogger.info("Worker started");
  await startChainIndexers();

  while (true) {
    const job = await protocolJobs.poll(5);
    if (!job) {
      await sleep(250);
      continue;
    }

    await processJob(job);
  }
}

main().catch((error) => {
  workerLogger.error("Worker failed to start", { error });
  process.exit(1);
});
