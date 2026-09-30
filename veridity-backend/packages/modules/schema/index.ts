// packages/modules/schema/index.ts
import { FastifyInstance } from "fastify";
import { resolveDriver } from "@ssi/plugins";
import { validateDto } from "@ssi/utils";
import { SchemaRegistrationDto } from "../dtos/platform.dto";

export default async function schemaModule(fastify: FastifyInstance) {
  fastify.post("/:driver/schemas", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const payload = await validateDto(SchemaRegistrationDto, request.body, reply);
    if (!payload) return;

    try {
      const driver = resolveDriver(driverType);
      if (driver.schemaRegistry) {
        reply.send(await driver.schemaRegistry.register({
          id: payload.id,
          tenantId: payload.tenantId,
          name: payload.name,
          version: payload.version,
          format: payload.format,
          definition: payload.definition,
          uri: payload.uri,
          registryType: "internal",
          active: false,
          metadata: payload.metadata,
        } as any));
        return;
      }
      const schema = await driver.registerSchema(payload);
      reply.send(schema);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/schemas", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const { tenantId: queryTenantId } = request.query as { tenantId?: string };
    const tenantId = request.tenantId ?? queryTenantId;

    try {
      const driver = resolveDriver(driverType);
      if (!driver.schemaRegistry?.list) {
        return reply.status(501).send({ error: "Schema registry is not supported by this driver" });
      }
      reply.send(await driver.schemaRegistry.list(tenantId));
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/schemas/:id", async (request, reply) => {
    const { driver: driverType, id } = request.params as { driver: keyof typeof resolveDriver; id: string };

    try {
      const driver = resolveDriver(driverType);
      if (driver.schemaRegistry) {
        const schema = await driver.schemaRegistry.get(id);
        if (!schema) return reply.status(404).send({ error: "Schema not found" });
        reply.send(schema);
        return;
      }
      const schema = await driver.getSchema(id);
      if (!schema) return reply.status(404).send({ error: "Schema not found" });
      reply.send(schema);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.post("/:driver/schemas/:id/activate", async (request, reply) => {
    const { driver: driverType, id } = request.params as { driver: keyof typeof resolveDriver; id: string };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.schemaRegistry?.activate) {
        return reply.status(501).send({ error: "Schema activation is not supported by this driver" });
      }
      const schema = await driver.schemaRegistry.activate(id);
      if (!schema) return reply.status(404).send({ error: "Schema not found" });
      reply.send(schema);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });
}
