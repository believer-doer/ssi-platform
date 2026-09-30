import { FastifyPluginAsync } from "fastify";
import { resolveDriver } from "@ssi/plugins";
import { sendValidationError, validateDto } from "@ssi/utils";
import { IssuerOnboardingDto } from "../dtos/platform.dto";

const issuerModule: FastifyPluginAsync = async (fastify) => {
  fastify.post("/:driver/issuers", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const payload = await validateDto(IssuerOnboardingDto, request.body, reply);
    if (!payload) return;

    try {
      const driver = resolveDriver(driverType);
      if (!payload.did && !payload.publicKey && !payload.publicKeyJwk && payload.didMethod === "did:jwk") {
        return sendValidationError(reply, "publicKeyJwk is required when didMethod is 'did:jwk'");
      }
      const did =
        payload.did ??
        (await driver.createDid({
          method: payload.didMethod ?? (payload as any).type ?? "key",
          publicKey: payload.publicKey ?? payload.name,
          publicKeyJwk: payload.publicKeyJwk,
        }));

      if (driver.issuer) {
        request.log.info({
          driver: driverType,
          tenantId: payload.tenantId,
          did,
        }, "Onboarding issuer");
        const issuer = await driver.issuer.onboard({
          id: `issuer:${Date.now()}`,
          name: payload.name,
          did,
          didMethod: payload.didMethod,
          tenantId: payload.tenantId,
          registryType: "internal",
          status: "pending",
          supportedFormats: payload.supportedFormats,
          supportedProtocols: payload.supportedProtocols,
          trustFrameworkMemberships: payload.trustFrameworkMemberships,
          publicKeyJwk: payload.publicKeyJwk,
          metadata: payload.metadata,
        } as any);
        request.log.info({
          driver: driverType,
          tenantId: payload.tenantId,
          did: issuer.did,
        }, "Issuer onboarded");
        reply.send(issuer);
        return;
      }

      request.log.info({
        driver: driverType,
        tenantId: payload.tenantId,
        did,
      }, "Generated issuer DID through fallback flow");
      reply.send({ name: payload.name, did });
    } catch (err) {
      request.log.error({
        driver: driverType,
        error: err,
      }, "Issuer onboarding failed");
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/issuers", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const { tenantId: queryTenantId } = request.query as { tenantId?: string };
    const tenantId = request.tenantId ?? queryTenantId;

    try {
      const driver = resolveDriver(driverType);
      if (!driver.issuer?.list) {
        return reply.status(501).send({ error: "Issuer onboarding is not supported by this driver" });
      }
      request.log.debug({
        driver: driverType,
        tenantId,
      }, "Listing issuers");
      reply.send(await driver.issuer.list(tenantId));
    } catch (err) {
      request.log.error({
        driver: driverType,
        error: err,
      }, "Issuer listing failed");
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/issuers/:did", async (request, reply) => {
    const { driver: driverType, did } = request.params as {
      driver: keyof typeof resolveDriver;
      did: string;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.issuer) {
        return reply.status(501).send({ error: "Issuer onboarding is not supported by this driver" });
      }
      request.log.debug({
        driver: driverType,
        did,
      }, "Fetching issuer by DID");
      const issuer = await driver.issuer.getByDid(did);
      if (!issuer) return reply.status(404).send({ error: "Issuer not found" });
      reply.send(issuer);
    } catch (err) {
      request.log.error({
        driver: driverType,
        did,
        error: err,
      }, "Issuer lookup failed");
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.post("/:driver/issuers/:did/activate", async (request, reply) => {
    const { driver: driverType, did } = request.params as {
      driver: keyof typeof resolveDriver;
      did: string;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.issuer?.updateStatus) {
        return reply.status(501).send({ error: "Issuer activation is not supported by this driver" });
      }
      const issuer = await driver.issuer.updateStatus(did, "active");
      if (!issuer) return reply.status(404).send({ error: "Issuer not found" });
      reply.send(issuer);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });
};

export default issuerModule;
