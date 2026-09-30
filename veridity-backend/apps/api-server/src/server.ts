import path from "path";
import dotenv from "dotenv";
import { logger } from "@ssi/utils";

// load .env from workspace root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { buildApp } from "./app";
import { env } from "@ssi/config";
import { connectDB } from "../../../packages/drivers/internal/src/db";

const serverLogger = logger.child("api-server");

async function main() {
  try {
    serverLogger.info("Starting API server bootstrap", {
      host: env.host,
      port: env.port,
    });
    const mongoUri = env.mongoUri;
    if (!mongoUri) {
      serverLogger.error("API server startup aborted: missing MONGO_URI");
      throw new Error("MONGO_URI is not defined in .env");
    }

    await connectDB(mongoUri);

    // Fastify is built after infrastructure is ready so plugin registration can use live dependencies.
    const app = await buildApp();
    await app.listen({ port: env.port, host: env.host });
    serverLogger.info("API server is listening", {
      url: `http://${env.host}:${env.port}`,
    });
  } catch (err) {
    serverLogger.error("Failed to start API server", { error: err });
    process.exit(1);
  }
}

main();
