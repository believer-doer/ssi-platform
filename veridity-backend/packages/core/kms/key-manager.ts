import { createHash, randomBytes } from "crypto";

interface KeyRecord {
  id: string;
  type: "Ed25519" | "Secp256k1";
  privateKey: string;
  publicKey: string;
}

export class KeyManager {
  private keys: Record<string, KeyRecord> = {};

  createKey(type: "Ed25519" | "Secp256k1" = "Ed25519") {
    const id = `key-${Date.now()}`;
    const privateKey = randomBytes(32).toString("hex");
    const publicKey = createHash("sha256").update(privateKey).digest("hex");
    const key: KeyRecord = { id, type, privateKey, publicKey };
    this.keys[id] = key;
    return key;
  }

  getKey(id: string) {
    return this.keys[id] || null;
  }

  listKeys() {
    return Object.values(this.keys);
  }
}
