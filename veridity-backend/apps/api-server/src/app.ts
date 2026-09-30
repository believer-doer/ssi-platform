import Fastify, { FastifyPluginAsync } from "fastify";
import cors from "@fastify/cors";
import { registerPlugins } from "./plugins";

import {
  issuerModule,
  schemaModule,
  credentialModule,
  presentationModule,
  verifierModule,
  walletModule,
  verificationModule,
  templateModule,
  revocationModule,
  tenantModule,
  trustModule,
  governanceModule,
  protocolModule,
  auditModule,
  systemModule,
} from "@ssi/modules";

export async function buildApp() {
  // Fastify's built-in logger handles request/response tracing for the API layer.
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });
  const appLogger = fastify.log.child({ component: "app" });
  appLogger.info("Registering API plugins and modules");

  // Shared plugins run before domain modules so auth and tenant context are available everywhere.
  await fastify.register(cors as any, { origin: "*" });
  await registerPlugins(fastify);

  // Domain modules stay mounted under /v1 to keep transport concerns outside the business packages.
  await fastify.register(issuerModule as unknown as FastifyPluginAsync, { prefix: "/v1" });
  await fastify.register(schemaModule as unknown as FastifyPluginAsync, { prefix: "/v1" });
  await fastify.register(credentialModule as unknown as FastifyPluginAsync, { prefix: "/v1" });
  await fastify.register(presentationModule as unknown as FastifyPluginAsync, { prefix: "/v1" });
  await fastify.register(verifierModule as unknown as FastifyPluginAsync, { prefix: "/v1" });
  await fastify.register(walletModule as unknown as FastifyPluginAsync, { prefix: "/v1" });
  await fastify.register(verificationModule as unknown as FastifyPluginAsync, { prefix: "/v1" });
  await fastify.register(templateModule as unknown as FastifyPluginAsync, { prefix: "/v1" });
  await fastify.register(tenantModule as unknown as FastifyPluginAsync, { prefix: "/v1" });
  await fastify.register(trustModule as unknown as FastifyPluginAsync, { prefix: "/v1" });
  await fastify.register(governanceModule as unknown as FastifyPluginAsync, {
    prefix: "/v1",
  });
  await fastify.register(protocolModule as unknown as FastifyPluginAsync, { prefix: "/v1" });
  await fastify.register(auditModule as unknown as FastifyPluginAsync, { prefix: "/v1" });
  await fastify.register(systemModule as unknown as FastifyPluginAsync, { prefix: "/v1" });
  await fastify.register(revocationModule as unknown as FastifyPluginAsync, {
    prefix: "/v1/revocation",
  });

  appLogger.info("API application registration complete");
  return fastify;
}
