import { redis } from "@ssi/utils/src/cache/redis";

const NONCE_PREFIX = "issuer:oidc:nonce:";
const NONCE_TTL = 300; // seconds

/**
 * generateNonce asynchronously handles its module-specific operation.
 * @returns The result of generateNonce.
 */
export async function generateNonce(): Promise<string> {
  return crypto.randomUUID();
}

/**
 * Store nonce.
 * @param nonce Input used by storeNonce.
 * @param accessToken Input used by storeNonce.
 * @returns The result of storeNonce.
 */
export async function storeNonce(nonce: string, accessToken: string) {
  const key = NONCE_PREFIX + nonce;

  await redis.set(key, accessToken, "EX", NONCE_TTL);
}

/**
 * Get nonce.
 * @param nonce Input used by getNonce.
 * @returns The result of getNonce.
 */
export async function getNonce(nonce: string): Promise<string | null> {
  const key = NONCE_PREFIX + nonce;
  return redis.get(key);
}

/**
 * revokeNonce asynchronously handles its module-specific operation.
 * @param nonce Input used to execute revokeNonce.
 * @returns The result of revokeNonce.
 */
export async function revokeNonce(nonce: string) {
  const key = NONCE_PREFIX + nonce;
  await redis.del(key);
}
