import { redis } from "@ssi/utils/src/cache/redis";

const OFFER_PREFIX = "oidc:offer:";
const OFFER_TTL = 600; // seconds

interface OfferRecord {
  templateId: string;
  subject?: Record<string, unknown>;
  format?: string;
  credential_configuration_id: string;
  // TODOD: expiresAt: number
  user_pin_required?: boolean;
  user_pin?: string;
}

/**
 * Save offer.
 * @param code Input used by saveOffer.
 * @param data Input used by saveOffer.
 * @returns The result of saveOffer.
 */
export async function saveOffer(code: string, data: OfferRecord) {
  await redis.set(OFFER_PREFIX + code, JSON.stringify(data), "EX", OFFER_TTL);
}

/**
 * Get offer.
 * @param code Input used by getOffer.
 * @returns The result of getOffer.
 */
export async function getOffer(code: string): Promise<OfferRecord | null> {
  const data = await redis.get(OFFER_PREFIX + code);

  if (!data) return null;

  return JSON.parse(data);
}

/**
 * revokeOffer asynchronously handles its module-specific operation.
 * @param code Input used to execute revokeOffer.
 * @returns The result of revokeOffer.
 */
export async function revokeOffer(code: string) {
  await redis.del(OFFER_PREFIX + code);
}
