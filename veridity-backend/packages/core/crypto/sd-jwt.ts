import { createHash } from "crypto";
import { signJWT, verifyJWT } from "./jwt";

function digest(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

export function signSDJWT(vc: Record<string, unknown>, secret: string) {
  const disclosures = Object.entries(vc).map(([key, value]) => [key, value]);
  const token = signJWT(
    {
      _sd_alg: "sha-256",
      _sd: disclosures.map((entry) => digest(entry)),
    },
    secret,
    { algorithm: "HS256" },
  );
  return { compact: token, disclosures };
}

export function verifySDJWT(
  token: string | { compact: string; disclosures?: unknown[] },
  secret: string,
) {
  try {
    const compact = typeof token === "string" ? token : token.compact;
    const disclosures = typeof token === "string" ? [] : token.disclosures ?? [];
    const decoded = verifyJWT(compact, secret) as { _sd?: string[] };
    return disclosures.every((entry) => decoded._sd?.includes(digest(entry)));
  } catch {
    return false;
  }
}
