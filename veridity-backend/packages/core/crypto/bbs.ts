import { createHash } from "crypto";
import { signJWT, verifyJWT } from "./jwt";

function digest(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

export async function signBBS(vc: any, key: string) {
  const base = { ...vc };
  delete base.proof;

  return {
    ...base,
    proof: {
      type: "BbsBlsSignature2020",
      created: new Date().toISOString(),
      proofPurpose: "assertionMethod",
      proofValue: signJWT(
        { digest: digest(base), selectiveDisclosure: true },
        key,
        { algorithm: "HS256" },
      ),
    },
  };
}

export async function verifyBBS(vc: any, key: string) {
  try {
    const base = { ...vc };
    delete base.proof;
    const decoded = verifyJWT(vc?.proof?.proofValue, key) as { digest?: string };
    return (
      vc?.proof?.type === "BbsBlsSignature2020" &&
      decoded?.digest === digest(base)
    );
  } catch {
    return false;
  }
}
