import CryptoJS from "crypto-js";
import { createVerify, createPublicKey, KeyObject } from "crypto";
import { logger } from "../logger";

/** Symmetric AES for encrypt/decrypt */
const SECRET = process.env.KEY_SECRET || "secret";
const encryptionLogger = logger.child("encryption");

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, SECRET).toString();
}

export function decrypt(cipher: string): string {
  const bytes = CryptoJS.AES.decrypt(cipher, SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Converts a JWK (Ed25519 or secp256k1) to a Node.js KeyObject
 * Supports publicKeyJwk objects from DID Documents
 */
function jwkToKeyObject(jwk: any): KeyObject {
  if (!jwk || !jwk.kty) throw new Error("Invalid JWK");

  switch (jwk.kty) {
    case "OKP": // Ed25519 / Ed448
      if (jwk.crv !== "Ed25519")
        throw new Error(`Unsupported curve: ${jwk.crv}`);
      // Node >= v20 supports KeyObject.fromJwk
      return createPublicKey({ key: jwk, format: "jwk" });
    case "EC": // secp256k1 / secp256r1
      if (!["secp256k1", "P-256"].includes(jwk.crv))
        throw new Error(`Unsupported EC curve: ${jwk.crv}`);
      return createPublicKey({ key: jwk, format: "jwk" });
    default:
      throw new Error(`Unsupported JWK key type: ${jwk.kty}`);
  }
}

/**
 * Verifies a digital signature of a message using a public key (PEM or JWK)
 * @param message - stringified message (VP JSON without proof)
 * @param signature - base64 encoded signature
 * @param publicKey - PEM string or JWK object
 * @param algorithm - optional, default: 'SHA256'
 */
export function verifySignature(
  message: string,
  signature: string,
  publicKey: string | object,
  algorithm: string = "SHA256",
): boolean {
  try {
    let keyObj: KeyObject;

    if (typeof publicKey === "object") {
      keyObj = jwkToKeyObject(publicKey);
    } else {
      keyObj = createPublicKey(publicKey);
    }

    const verifier = createVerify(algorithm);
    verifier.update(message);
    verifier.end();

    return verifier.verify(keyObj, Buffer.from(signature, "base64"));
  } catch (err) {
    encryptionLogger.warn("Signature verification failed", { error: err });
    return false;
  }
}
