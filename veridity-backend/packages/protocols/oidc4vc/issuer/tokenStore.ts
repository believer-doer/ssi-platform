interface TokenRecord {
  preAuthorizedCode: string;
  expiresAt: number;
}

const tokens = new Map<string, TokenRecord>();

const TOKEN_TTL = 600 * 1000; // 10 minutes

/**
 * Save token.
 * @param accessToken Input used by saveToken.
 * @param preAuthorizedCode Input used by saveToken.
 * @returns The result of saveToken.
 */
export function saveToken(accessToken: string, preAuthorizedCode: string) {
  tokens.set(accessToken, {
    preAuthorizedCode,
    expiresAt: Date.now() + TOKEN_TTL,
  });
}

/**
 * Get token.
 * @param accessToken Input used by getToken.
 * @returns The result of getToken.
 */
export function getToken(accessToken: string): TokenRecord | null {
  const record = tokens.get(accessToken);

  if (!record) return null;

  if (Date.now() > record.expiresAt) {
    tokens.delete(accessToken);
    return null;
  }

  return record;
}

/**
 * revokeToken handles its module-specific operation.
 * @param accessToken Input used to execute revokeToken.
 * @returns The result of revokeToken.
 */
export function revokeToken(accessToken: string) {
  tokens.delete(accessToken);
}
