// packages/modules/verifier/index.ts
import { FastifyInstance } from "fastify";
import { resolveDriver } from "@ssi/plugins";
import { sendValidationError, validateDto } from "@ssi/utils";
import { VerifierOnboardingDto } from "../dtos/platform.dto";

export default async function verifierModule(fastify: FastifyInstance) {
  fastify.post("/:driver/verifiers", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const payload = await validateDto(VerifierOnboardingDto, request.body, reply);
    if (!payload) return;

    try {
      const driver = resolveDriver(driverType);
      if (!payload.did && !payload.publicKey && !payload.publicKeyJwk && payload.didMethod === "did:jwk") {
        return sendValidationError(reply, "publicKeyJwk is required when didMethod is 'did:jwk'");
      }
      const did =
        payload.did ??
        (await driver.createDid({
          method: payload.didMethod ?? "key",
          publicKey: payload.publicKey ?? payload.name,
          publicKeyJwk: payload.publicKeyJwk,
        }));

      if (driver.verifier) {
        const verifier = await driver.verifier.onboard({
          id: `verifier:${Date.now()}`,
          name: payload.name,
          did,
          didMethod: payload.didMethod,
          tenantId: payload.tenantId,
          registryType: "internal",
          status: "pending",
          supportedPresentationProfiles: payload.supportedPresentationProfiles,
          trustFrameworkMemberships: payload.trustFrameworkMemberships,
          publicKeyJwk: payload.publicKeyJwk,
          metadata: payload.metadata,
        } as any);
        reply.send(verifier);
        return;
      }

      reply.send({ name: payload.name, did });
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/verifiers", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const { tenantId: queryTenantId } = request.query as { tenantId?: string };
    const tenantId = request.tenantId ?? queryTenantId;

    try {
      const driver = resolveDriver(driverType);
      if (!driver.verifier?.list) {
        return reply.status(501).send({ error: "Verifier onboarding is not supported by this driver" });
      }
      reply.send(await driver.verifier.list(tenantId));
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/verifiers/:did", async (request, reply) => {
    const { driver: driverType, did } = request.params as {
      driver: keyof typeof resolveDriver;
      did: string;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.verifier) {
        return reply.status(501).send({ error: "Verifier onboarding is not supported by this driver" });
      }
      const verifier = await driver.verifier.getByDid(did);
      if (!verifier) return reply.status(404).send({ error: "Verifier not found" });
      reply.send(verifier);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.post("/:driver/verifiers/:did/activate", async (request, reply) => {
    const { driver: driverType, did } = request.params as {
      driver: keyof typeof resolveDriver;
      did: string;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.verifier?.updateStatus) {
        return reply.status(501).send({ error: "Verifier activation is not supported by this driver" });
      }
      const verifier = await driver.verifier.updateStatus(did, "active");
      if (!verifier) return reply.status(404).send({ error: "Verifier not found" });
      reply.send(verifier);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });
}
