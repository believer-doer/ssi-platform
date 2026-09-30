import { FastifyReply, FastifyRequest } from "fastify";
import * as revocationService from "./revocation.service";
import {
  CreateRevocationListDto,
  RevokeCredentialDto,
  ListIdParamsDto,
  ListRevocationQueryDto,
} from "./dtos/revocation.dto";
import { validateDto } from "@ssi/utils";

/**
 * Creates a revocation list record and initializes its status list companion document.
 */
export async function createList(req: FastifyRequest, reply: FastifyReply) {
  const dto = await validateDto(CreateRevocationListDto, req.body, reply);
  if (!dto) return;

  req.log.info({
    issuerDid: dto.issuerDid,
    tenantId: dto.tenantId,
  }, "Creating revocation list");
  const list = await revocationService.createRevocationList(
    dto.issuerDid,
    dto.tenantId,
    dto.statusListUri,
  );

  reply.status(201).send(list);
}

/**
 * Records a revocation entry in both the list aggregate and the driver's status list model.
 */
export async function revoke(req: FastifyRequest, reply: FastifyReply) {
  const params = await validateDto(ListIdParamsDto, req.params, reply);
  if (!params) return;

  const body = await validateDto(RevokeCredentialDto, req.body, reply);
  if (!body) return;

  req.log.info({
    listId: params.listId,
    credentialId: body.credentialId,
  }, "Revoking credential");
  const list = await revocationService.revokeCredential(
    params.listId,
    body.credentialId,
  );

  if (!list) {
    reply.status(404).send({ error: "list not found" });
    return;
  }

  reply.send(list);
}

/**
 * Returns revocation lists in reverse chronological order for basic operational browsing.
 */
export async function listLists(req: FastifyRequest, reply: FastifyReply) {
  const dto = await validateDto(ListRevocationQueryDto, req.query, reply);
  if (!dto) return;

  req.log.debug({
    page: dto.page ?? 1,
    limit: dto.limit ?? 20,
  }, "Listing revocation lists");
  const lists = await revocationService.listRevocationLists(
    dto.page ?? 1,
    dto.limit ?? 20,
  );

  reply.send(lists);
}

/**
 * Fetches a single revocation list by its external identifier.
 */
export async function getList(req: FastifyRequest, reply: FastifyReply) {
  const params = await validateDto(ListIdParamsDto, req.params, reply);
  if (!params) return;

  req.log.debug({
    listId: params.listId,
  }, "Fetching revocation list");
  const list = await revocationService.getRevocationList(params.listId);

  if (!list) {
    reply.status(404).send({ error: "list not found" });
    return;
  }

  reply.send(list);
}
