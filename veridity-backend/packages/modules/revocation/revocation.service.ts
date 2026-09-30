import { v4 as uuidv4 } from "uuid";
import * as revocationRepository from "./revocation.repository";
import { StatusListModel } from "@ssi/driver-internal";
import { logger } from "@ssi/utils";

const revocationServiceLogger = logger.child("revocation-service");

export async function createRevocationList(
  issuerDid: string,
  tenantId?: string,
  statusListUri?: string,
) {
  // We keep a dedicated revocation aggregate and a status-list document in sync
  // because other driver flows already read from StatusListModel directly.
  const listId = `revoc:${uuidv4()}`;
  revocationServiceLogger.info("Creating revocation list", {
    listId,
    issuerDid,
    tenantId,
  });
  const created = await revocationRepository.createRevocationList({
    listId,
    issuerDid,
    tenantId,
    statusListUri,
  });
  await StatusListModel.findOneAndUpdate(
    { statusListId: listId },
    {
      statusListId: listId,
      issuerDid,
      tenantId,
      profile: "statuslist2021",
      purpose: "revocation",
      listUri: statusListUri,
      entries: [],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return created;
}

export async function revokeCredential(listId: string, credentialId: string) {
  revocationServiceLogger.info("Revoking credential", {
    listId,
    credentialId,
  });
  const updated = await revocationRepository.appendEntry(listId, {
    credentialId,
    revokedAt: new Date(),
  });
  await StatusListModel.findOneAndUpdate(
    {
      statusListId: listId,
      "entries.credentialId": { $ne: credentialId },
    },
    {
      $push: {
        entries: {
          credentialId,
          status: "revoked",
          updatedAt: new Date(),
        },
      },
    },
    { new: true },
  );
  return updated;
}

export async function listRevocationLists(page = 1, limit = 20) {
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  revocationServiceLogger.debug("Listing revocation lists", {
    page: normalizedPage,
    limit: normalizedLimit,
  });

  const { items, total } = await revocationRepository.listRevocationLists({
    skip: (normalizedPage - 1) * normalizedLimit,
    limit: normalizedLimit,
  });

  return {
    items,
    page: normalizedPage,
    limit: normalizedLimit,
    total,
  };
}

export async function getRevocationList(listId: string) {
  revocationServiceLogger.debug("Fetching revocation list", { listId });
  return revocationRepository.getRevocationList(listId);
}
