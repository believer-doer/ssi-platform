import { createHash } from "crypto";
import { signJWT, verifyJWT } from "./jwt";

function digest(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

export async function signJSONLD(vc: any, key: string) {
  const base = { ...vc };
  delete base.proof;

  return {
    ...base,
    proof: {
      type: "Ed25519Signature2020",
      created: new Date().toISOString(),
      proofPurpose: "assertionMethod",
      jws: signJWT({ digest: digest(base) }, key, { algorithm: "HS256" }),
    },
  };
}

export async function verifyJSONLD(vc: any, key: string) {
  try {
    const base = { ...vc };
    delete base.proof;
    const decoded = verifyJWT(vc?.proof?.jws, key) as { digest?: string };
    return decoded?.digest === digest(base);
  } catch {
    return false;
  }
}
