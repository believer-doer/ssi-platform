import { FastifyInstance } from "fastify";
import { resolveDriver } from "@ssi/plugins";

export default async function auditModule(fastify: FastifyInstance) {
  fastify.get("/:driver/audit", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const { tenantId: queryTenantId } = request.query as { tenantId?: string };
    const tenantId = request.tenantId ?? queryTenantId;

    try {
      const driver = resolveDriver(driverType);
      if (!driver.audit?.list) {
        return reply.status(501).send({ error: "Audit log is not supported by this driver" });
      }
      reply.send(await driver.audit.list(tenantId));
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/audit/:id", async (request, reply) => {
    const { driver: driverType, id } = request.params as {
      driver: keyof typeof resolveDriver;
      id: string;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.audit) {
        return reply.status(501).send({ error: "Audit log is not supported by this driver" });
      }
      const event = await driver.audit.get(id);
      if (!event) return reply.status(404).send({ error: "Audit event not found" });
      reply.send(event);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });
}
