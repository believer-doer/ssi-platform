import { FastifyInstance } from "fastify";
import { resolveDriver } from "@ssi/plugins";
import { sendValidationError, validateDto } from "@ssi/utils";
import { TrustRegistryCreateDto } from "../dtos/platform.dto";

export default async function trustModule(fastify: FastifyInstance) {
  fastify.post("/:driver/trust-registry", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const payload = await validateDto(TrustRegistryCreateDto, request.body, reply);
    if (!payload) return;

    try {
      if (!payload.did && !payload.name) {
        return sendValidationError(reply, "Either did or name is required for trust registry registration");
      }
      const driver = resolveDriver(driverType);
      if (!driver.trustRegistry) {
        return reply.status(501).send({ error: "Trust registry is not supported by this driver" });
      }
      reply.send(await driver.trustRegistry.register({
        ...payload,
        status: payload.status ?? "pending",
      } as any));
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.post("/:driver/trust", async (request, reply) => {
    return (fastify as any).inject({
      method: "POST",
      url: request.url.replace("/trust", "/trust-registry"),
      payload: request.body,
      headers: request.headers,
    });
  });

  fastify.get("/:driver/trust-registry", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.trustRegistry?.query) {
        return reply.status(501).send({ error: "Trust registry is not supported by this driver" });
      }
      reply.send(await driver.trustRegistry.query(request.query as any));
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/trust", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.trustRegistry?.query) {
        return reply.status(501).send({
          error: "Trust registry is not supported by this driver",
        });
      }
      reply.send(await driver.trustRegistry.query(request.query as any));
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/trust-registry/:id", async (request, reply) => {
    const { driver: driverType, id } = request.params as {
      driver: keyof typeof resolveDriver;
      id: string;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.trustRegistry) {
        return reply.status(501).send({ error: "Trust registry is not supported by this driver" });
      }
      const record = await driver.trustRegistry.get(id);
      if (!record) return reply.status(404).send({ error: "Trust registry record not found" });
      reply.send(record);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.post("/:driver/trust-registry/:id/activate", async (request, reply) => {
    const { driver: driverType, id } = request.params as {
      driver: keyof typeof resolveDriver;
      id: string;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.trustRegistry?.updateStatus) {
        return reply.status(501).send({ error: "Trust registry activation is not supported by this driver" });
      }
      const record = await driver.trustRegistry.updateStatus(id, "active");
      if (!record) return reply.status(404).send({ error: "Trust registry record not found" });
      reply.send(record);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });
}
