import { FastifyInstance } from "fastify";
import { resolveDriver } from "@ssi/plugins";
import { validateDto } from "@ssi/utils";
import { GovernanceApprovalDto, GovernanceProposalDto } from "../dtos/platform.dto";

export default async function governanceModule(fastify: FastifyInstance) {
  fastify.post("/:driver/governance/proposals", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const payload = await validateDto(GovernanceProposalDto, request.body, reply);
    if (!payload) return;

    try {
      const driver = resolveDriver(driverType);
      if (!driver.governance) {
        return reply.status(501).send({ error: "Governance is not supported by this driver" });
      }
      reply.send(await driver.governance.createProposal(payload as any));
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });
  
  fastify.get("/:driver/governance/proposals", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const { tenantId } = request.query as { tenantId?: string };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.governance?.listProposals) {
        return reply.status(501).send({ error: "Governance listing is not supported by this driver" });
      }
      reply.send(await driver.governance.listProposals(tenantId));
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/governance/proposals/:id", async (request, reply) => {
    const { driver: driverType, id } = request.params as {
      driver: keyof typeof resolveDriver;
      id: string;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.governance) {
        return reply.status(501).send({ error: "Governance is not supported by this driver" });
      }
      const proposal = await driver.governance.getProposal(id);
      if (!proposal) return reply.status(404).send({ error: "Governance proposal not found" });
      reply.send(proposal);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.post("/:driver/governance/proposals/:id/approve", async (request, reply) => {
    const { driver: driverType, id } = request.params as {
      driver: keyof typeof resolveDriver;
      id: string;
    };
    const payload = await validateDto(GovernanceApprovalDto, request.body, reply);
    if (!payload) return;

    try {
      const driver = resolveDriver(driverType);
      if (!driver.governance?.approve) {
        return reply.status(501).send({ error: "Governance approval is not supported by this driver" });
      }
      const proposal = await driver.governance.approve(
        id,
        payload.approverDid,
        payload.signature,
      );
      if (!proposal) return reply.status(404).send({ error: "Governance proposal not found" });
      reply.send(proposal);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });
}
