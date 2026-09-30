// packages/modules/presentation/index.ts
import { FastifyInstance } from "fastify";
import { resolveDriver } from "@ssi/plugins";
import { sendValidationError, validateDto } from "@ssi/utils";
import {
  CreatePresentationDto,
  VerifyPresentationDto,
  hasNonEmptyString,
} from "../dtos/platform.dto";

export default async function presentationModule(fastify: FastifyInstance) {
  fastify.post("/:driver/presentations", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const payload = await validateDto(CreatePresentationDto, request.body, reply);
    if (!payload) return;

    try {
      const holderDid = payload.holderDid ?? payload.holder;
      if (!hasNonEmptyString(holderDid)) {
        return sendValidationError(reply, "holderDid or holder is required");
      }

      const driver = resolveDriver(driverType);
      if (driver.presentation) {
        const vp = await driver.presentation.create({
          tenantId: payload.tenantId,
          verifierDid: payload.verifierDid,
          holderDid,
          challenge: payload.challenge ?? `${Date.now()}`,
          domain: payload.domain,
          metadata: {
            ...(payload.metadata ?? {}),
            credentialIds: payload.credentialIds ?? [],
          },
        });
        reply.send(vp);
        return;
      }
      const vp = await driver.createPresentation(payload);
      reply.send(vp);
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.post("/:driver/presentations/verify", async (request, reply) => {
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
        const result = await driver.presentation.verify({
          presentation,
          format: payload.format ?? "mixed",
          challenge: payload.challenge,
          domain: payload.domain,
          resolveStatus: payload.resolveStatus ?? true,
          verifyTrustChain: payload.verifyTrustChain ?? true,
        });
        reply.send(result);
        return;
      }
      const verified = await driver.verifyPresentation(presentation);
      reply.send({ verified });
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });
}
