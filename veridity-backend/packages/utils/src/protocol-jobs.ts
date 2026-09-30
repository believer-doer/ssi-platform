import { v4 as uuidv4 } from "uuid";
import { redis } from "./cache/redis";
import { logger } from "../logger";

export interface ProtocolJob {
  id: string;
  type: "advance-protocol-session";
  driver: string;
  protocol: string;
  sessionId: string;
  tenantId?: string;
  createdAt: string;
  attempts: number;
  payload?: Record<string, unknown>;
}

const QUEUE_KEY = "ssi:protocol-jobs";
const localQueue: string[] = [];
const jobsLogger = logger.child("protocol-jobs", { queue: QUEUE_KEY });

function deserialize(value: string | null): ProtocolJob | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as ProtocolJob;
  } catch {
    return null;
  }
}

export const protocolJobs = {
  async enqueue(
    input: Omit<ProtocolJob, "id" | "createdAt" | "attempts" | "type"> & {
      type?: ProtocolJob["type"];
      attempts?: number;
    },
  ) {
    const job: ProtocolJob = {
      id: `job:${uuidv4()}`,
      type: input.type ?? "advance-protocol-session",
      driver: input.driver,
      protocol: input.protocol,
      sessionId: input.sessionId,
      tenantId: input.tenantId,
      createdAt: new Date().toISOString(),
      attempts: input.attempts ?? 0,
      payload: input.payload,
    };
    const serialized = JSON.stringify(job);
    const enqueued = await redis.lpush(QUEUE_KEY, serialized);
    if (enqueued === null) {
      localQueue.unshift(serialized);
      jobsLogger.warn("Queued protocol job in local fallback queue", {
        jobId: job.id,
        driver: job.driver,
        protocol: job.protocol,
        sessionId: job.sessionId,
      });
    } else {
      jobsLogger.info("Queued protocol job in Redis", {
        jobId: job.id,
        driver: job.driver,
        protocol: job.protocol,
        sessionId: job.sessionId,
      });
    }
    return job;
  },

  async poll(timeoutSeconds = 5) {
    const message = await redis.brpop(QUEUE_KEY, timeoutSeconds);
    if (message) {
      const job = deserialize(message);
      if (job) {
        jobsLogger.debug("Dequeued protocol job from Redis", {
          jobId: job.id,
          driver: job.driver,
          protocol: job.protocol,
          sessionId: job.sessionId,
        });
      }
      return job;
    }

    const fallback = localQueue.pop();
    const job = deserialize(fallback ?? null);
    if (job) {
      jobsLogger.warn("Dequeued protocol job from local fallback queue", {
        jobId: job.id,
        driver: job.driver,
        protocol: job.protocol,
        sessionId: job.sessionId,
      });
    }
    return job;
  },
};
