// packages/modules/template/index.ts
import { FastifyInstance } from "fastify";
import { resolveDriver } from "@ssi/plugins";
import { sendValidationError, validateDto } from "@ssi/utils";
import { TemplateRegistrationDto } from "../dtos/platform.dto";

export default async function templateModule(fastify: FastifyInstance) {
  fastify.post("/:driver/templates", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const payload = await validateDto(TemplateRegistrationDto, request.body, reply);
    if (!payload) return;

    try {
      if (!payload.title && !payload.name) {
        return sendValidationError(reply, "Either title or name is required for template registration");
      }
      const driver = resolveDriver(driverType);
      if (driver.templateRegistry) {
        const template = await driver.templateRegistry.register({
          id: payload.id,
          tenantId: payload.tenantId,
          title: payload.title ?? payload.name ?? "Template",
          description: payload.description,
          schemaId: payload.schemaId,
          format: payload.format,
          defaults: payload.defaults,
          registryType: "internal",
          enabled: false,
          metadata: payload.metadata,
        } as any);
        reply.send(template);
        return;
      }
      reply.send({
        id: `tpl-${Date.now()}`,
        name: payload.name,
        schemaId: payload.schemaId,
        createdAt: new Date(),
      });
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/templates", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const { tenantId } = request.query as { tenantId?: string };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.templateRegistry?.list) {
        return reply.status(501).send({ error: "Template registry is not supported by this driver" });
      }
      reply.send(await driver.templateRegistry.list(tenantId));
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/templates/:id", async (request, reply) => {
    const { driver: driverType, id } = request.params as {
      driver: keyof typeof resolveDriver;
      id: string;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.templateRegistry) {
        return reply.status(501).send({ error: "Template registry is not supported by this driver" });
      }
      const template = await driver.templateRegistry.get(id);
      if (!template) return reply.status(404).send({ error: "Template not found" });
      reply.send(template);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.post("/:driver/templates/:id/activate", async (request, reply) => {
    const { driver: driverType, id } = request.params as {
      driver: keyof typeof resolveDriver;
      id: string;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.templateRegistry?.activate) {
        return reply.status(501).send({ error: "Template activation is not supported by this driver" });
      }
      const template = await driver.templateRegistry.activate(id);
      if (!template) return reply.status(404).send({ error: "Template not found" });
      reply.send(template);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });
}
