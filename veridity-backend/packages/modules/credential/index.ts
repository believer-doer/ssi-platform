import { FastifyInstance } from "fastify";
import { resolveDriver } from "@ssi/plugins";
import { sendValidationError, validateDto } from "@ssi/utils";
import {
  IssueCredentialDto,
  VerifyCredentialDto,
  hasNonEmptyString,
  isNonEmptyObject,
} from "../dtos/platform.dto";

export default async function credentialModule(fastify: FastifyInstance) {
  fastify.post("/:driver/credentials", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const payload = await validateDto(IssueCredentialDto, request.body, reply);
    if (!payload) return;

    try {
      // The transport DTO supports both legacy and normalized field names, so we normalize once here.
      const issuerDid = payload.issuerDid ?? payload.issuer;
      const schema = payload.schema ?? (payload.schemaId ? { id: payload.schemaId } : undefined);
      const claims = payload.claims ?? payload.subject;

      if (!hasNonEmptyString(issuerDid)) {
        return sendValidationError(reply, "issuerDid or issuer is required");
      }
      if (!schema?.id) {
        return sendValidationError(reply, "schema.id or schemaId is required");
      }
      if (!isNonEmptyObject(claims)) {
        return sendValidationError(reply, "claims or subject must be a non-empty object");
      }
      if ((payload.format ?? "vc-jwt") === "sd-jwt-vc" && !hasNonEmptyString(payload.holderDid)) {
        return sendValidationError(reply, "holderDid is required for sd-jwt-vc issuance");
      }

      const driver = resolveDriver(driverType);
      if (driver.credential) {
        request.log.info({
          driver: driverType,
          tenantId: payload.tenantId,
          issuerDid,
          format: payload.format ?? "vc-jwt",
        }, "Issuing credential");
        const credential = await driver.credential.issue({
          tenantId: payload.tenantId,
          issuerDid,
          holderDid: payload.holderDid,
          format: payload.format ?? "vc-jwt",
          schema,
          templateId: payload.templateId,
          claims,
          proofType: payload.proofType,
          status: payload.status,
          metadata: payload.metadata,
        });
        request.log.info({
          driver: driverType,
          tenantId: payload.tenantId,
          credentialId: credential.record.id,
          format: credential.format,
        }, "Credential issued");
        reply.send(credential);
        return;
      }
      const credential = await driver.issueCredential(payload);
      request.log.info({
        driver: driverType,
        tenantId: payload.tenantId,
      }, "Credential issued through legacy driver interface");
      reply.send(credential);
    } catch (err) {
      request.log.error({
        driver: driverType,
        error: err,
      }, "Credential issuance failed");
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/credentials", async (request, reply) => {
    const { driver: driverType } = request.params as { driver: keyof typeof resolveDriver };
    const { tenantId: queryTenantId } = request.query as { tenantId?: string };
    const tenantId = (request as any).tenantId ?? queryTenantId;

    try {
      const driver = resolveDriver(driverType);
      if (!driver.credential?.list) {
        return reply.status(501).send({
          error: "Credential listing is not supported by this driver",
        });
      }
      reply.send(await driver.credential.list(tenantId));
    } catch (err) {
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.post("/:driver/credentials/verify", async (request, reply) => {
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
          expectedIssuerDid: payload.expectedIssuerDid,
          format: payload.format,
        }, "Verifying credential");
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
        }, "Credential verification finished");
        reply.send(result);
        return;
      }
      const verified = await driver.verifyCredential(credential);
      request.log.info({
        driver: driverType,
        verified,
      }, "Credential verified through legacy driver interface");
      reply.send({ verified });
    } catch (err) {
      request.log.error({
        driver: driverType,
        error: err,
      }, "Credential verification failed");
      reply.status(500).send({ error: (err as Error).message });
    }
  });
}
