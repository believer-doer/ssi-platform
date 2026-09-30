import { FastifyInstance } from "fastify";
import { resolveDriver } from "@ssi/plugins";
import { sendValidationError, validateDto } from "@ssi/utils";
import { VerifyCredentialDto, VerifyPresentationDto } from "../dtos/platform.dto";

export default async function verificationModule(fastify: FastifyInstance) {
  fastify.post("/:driver/verify-credential", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const payload = await validateDto(VerifyCredentialDto, request.body, reply);
    if (!payload) return;

    try {
      const credential = payload.credential ?? payload.vc;
      if (credential === undefined) {
        return sendValidationError(reply, "credential or vc is required");
      }

      const driver = resolveDriver(driverType);
      if (driver.credential) {
        request.log.info({
          driver: driverType,
          format: payload.format,
        }, "Running credential verification endpoint");
        const result = await driver.credential.verify({
          credential,
          format: payload.format as any,
          challenge: payload.challenge,
          domain: payload.domain,
          expectedIssuerDid: payload.expectedIssuerDid,
          resolveStatus: payload.resolveStatus ?? true,
        });
        request.log.info({
          driver: driverType,
          valid: result.valid,
          format: result.format,
        }, "Credential verification endpoint completed");
        reply.send(result);
        return;
      }
      const verified = await driver.verifyCredential(credential);
      request.log.info({
        driver: driverType,
        verified,
      }, "Credential verification completed through legacy driver interface");
      reply.send({ verified });
    } catch (err) {
      request.log.error({
        driver: driverType,
        error: err,
      }, "Credential verification endpoint failed");
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.post("/:driver/verify-presentation", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const payload = await validateDto(VerifyPresentationDto, request.body, reply);
    if (!payload) return;

    try {
      const presentation = payload.presentation ?? payload.vp;
      if (presentation === undefined) {
        return sendValidationError(reply, "presentation or vp is required");
      }

      const driver = resolveDriver(driverType);
      if (driver.presentation) {
        request.log.info({
          driver: driverType,
          format: payload.format ?? "mixed",
        }, "Running presentation verification endpoint");
        const result = await driver.presentation.verify({
          presentation,
          format: payload.format ?? "mixed",
          challenge: payload.challenge,
          domain: payload.domain,
          resolveStatus: payload.resolveStatus ?? true,
          verifyTrustChain: payload.verifyTrustChain ?? true,
        });
        request.log.info({
          driver: driverType,
          valid: result.valid,
          format: result.format,
        }, "Presentation verification endpoint completed");
        reply.send(result);
        return;
      }
      const verified = await driver.verifyPresentation(presentation);
      request.log.info({
        driver: driverType,
        verified,
      }, "Presentation verification completed through legacy driver interface");
      reply.send({ verified });
    } catch (err) {
      request.log.error({
        driver: driverType,
        error: err,
      }, "Presentation verification endpoint failed");
      reply.status(500).send({ error: (err as Error).message });
    }
  });
}
