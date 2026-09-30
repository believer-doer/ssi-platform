import { FastifyInstance } from "fastify";
import { resolveDriver } from "@ssi/plugins";
import { validateDto } from "@ssi/utils";
import { TenantCreateDto, TenantPolicyDto } from "../dtos/platform.dto";

export default async function tenantModule(fastify: FastifyInstance) {
  fastify.post("/:driver/tenants", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const payload = await validateDto(TenantCreateDto, request.body, reply);
    if (!payload) return;

    try {
      const driver = resolveDriver(driverType);
      if (!driver.tenant) {
        return reply.status(501).send({ error: "Tenant control plane is not supported by this driver" });
      }
      reply.send(await driver.tenant.create(payload as any));
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/tenants", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.tenant?.list) {
        return reply.status(501).send({ error: "Tenant control plane is not supported by this driver" });
      }
      reply.send(await driver.tenant.list());
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/tenants/:id", async (request, reply) => {
    const { driver: driverType, id } = request.params as {
      driver: keyof typeof resolveDriver;
      id: string;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.tenant) {
        return reply.status(501).send({ error: "Tenant control plane is not supported by this driver" });
      }
      const tenant = await driver.tenant.get(id);
      if (!tenant) return reply.status(404).send({ error: "Tenant not found" });
      reply.send(tenant);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.post("/:driver/tenants/:id/policies", async (request, reply) => {
    const { driver: driverType, id } = request.params as {
      driver: keyof typeof resolveDriver;
      id: string;
    };
    const payload = await validateDto(TenantPolicyDto, request.body, reply);
    if (!payload) return;

    try {
      const driver = resolveDriver(driverType);
      if (!driver.tenant?.applyPolicy) {
        return reply.status(501).send({ error: "Tenant policy management is not supported by this driver" });
      }
      const tenant = await driver.tenant.applyPolicy(id, payload as any);
      if (!tenant) return reply.status(404).send({ error: "Tenant not found" });
      reply.send(tenant);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });
}
