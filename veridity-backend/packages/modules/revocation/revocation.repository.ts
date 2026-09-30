import RevocationList, {
  IRevocationList,
  RevocationEntry,
} from "./revocation.model";
import { logger } from "@ssi/utils";

interface QueryOptions {
  skip?: number;
  limit?: number;
}

export interface RevocationListPage {
  items: IRevocationList[];
  total: number;
}

const revocationRepositoryLogger = logger.child("revocation-repository");

export async function createRevocationList(data: Partial<IRevocationList>) {
  revocationRepositoryLogger.info("Persisting revocation list", {
    listId: data.listId,
    issuerDid: data.issuerDid,
    tenantId: data.tenantId,
  });
  return RevocationList.create({
    ...data,
    revokedEntries: data.revokedEntries ?? [],
  });
}

export async function appendEntry(listId: string, entry: RevocationEntry) {
  revocationRepositoryLogger.info("Appending revocation entry", {
    listId,
    credentialId: entry.credentialId,
  });
  return RevocationList.findOneAndUpdate(
    { listId },
    { $push: { revokedEntries: entry } },
    { new: true },
  );
}

export async function listRevocationLists(options: QueryOptions = {}): Promise<RevocationListPage> {
  revocationRepositoryLogger.debug("Listing revocation lists", {
    skip: options.skip ?? 0,
    limit: options.limit ?? 20,
  });
  const [items, total] = await Promise.all([
    RevocationList.find()
      .sort({ createdAt: -1 })
      .skip(options.skip ?? 0)
      .limit(options.limit ?? 20),
    RevocationList.countDocuments(),
  ]);

  return { items, total };
}

export async function getRevocationList(listId: string) {
  revocationRepositoryLogger.debug("Fetching revocation list", { listId });
  return RevocationList.findOne({ listId });
}
