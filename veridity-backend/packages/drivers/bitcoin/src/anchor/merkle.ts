import { createHash } from "crypto";
import type { BitcoinMerkleProofNode, BitcoinMerkleTree } from "./config";

function sha256(value: Buffer) {
  return Buffer.from(createHash("sha256").update(value).digest());
}

function normalizeCommitment(commitment: Buffer | string) {
  if (Buffer.isBuffer(commitment)) {
    return commitment;
  }

  const normalized = commitment.startsWith("0x") ? commitment.slice(2) : commitment;
  const isHex = /^[0-9a-fA-F]+$/.test(normalized) && normalized.length % 2 === 0;
  return isHex
    ? Buffer.from(normalized, "hex")
    : Buffer.from(commitment, "utf8");
}

export function hashCommitment(commitment: Buffer | string) {
  return sha256(normalizeCommitment(commitment));
}

export function computeMerkleRoot(commitments: Array<Buffer | string>) {
  if (commitments.length === 0) {
    return sha256(Buffer.from("")).toString("hex");
  }

  let level: Buffer[] = commitments.map((commitment) => hashCommitment(commitment));

  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] ?? left;
      next.push(sha256(Buffer.concat([left, right])));
    }
    level = next;
  }

  return level[0].toString("hex");
}

function normalizeLeafHash(value: string) {
  const normalized = value.startsWith("0x") ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(`Invalid Merkle leaf hash '${value}'`);
  }

  return Buffer.from(normalized, "hex");
}

export function buildMerkleTreeFromLeafHashes(leafHashes: string[]): BitcoinMerkleTree {
  if (leafHashes.length === 0) {
    const rootHash = sha256(Buffer.from("")).toString("hex");
    return {
      rootHash,
      leafHashes: [],
      proofs: [],
    };
  }

  const proofs: BitcoinMerkleProofNode[][] = leafHashes.map(() => []);
  let level: Array<{ hash: Buffer; indices: number[] }> = leafHashes.map((hash, index) => ({
    hash: normalizeLeafHash(hash),
    indices: [index],
  }));

  while (level.length > 1) {
    const nextLevel: Array<{ hash: Buffer; indices: number[] }> = [];

    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] ?? left;
      const isDuplicatedNode = level[index + 1] === undefined;

      for (const leafIndex of left.indices) {
        proofs[leafIndex].push({
          position: "right",
          hash: right.hash.toString("hex"),
        });
      }

      if (!isDuplicatedNode) {
        for (const leafIndex of right.indices) {
          proofs[leafIndex].push({
            position: "left",
            hash: left.hash.toString("hex"),
          });
        }
      }

      nextLevel.push({
        hash: sha256(Buffer.concat([left.hash, right.hash])),
        indices: [...left.indices, ...right.indices],
      });
    }

    level = nextLevel;
  }

  return {
    rootHash: level[0].hash.toString("hex"),
    leafHashes,
    proofs,
  };
}

export function verifyMerkleProof(
  leafHash: string,
  proof: BitcoinMerkleProofNode[] | undefined,
  expectedRootHash: string,
) {
  if (!expectedRootHash) {
    return false;
  }

  let current = normalizeLeafHash(leafHash);
  for (const node of proof ?? []) {
    const sibling = normalizeLeafHash(node.hash);
    current = node.position === "left"
      ? sha256(Buffer.concat([sibling, current]))
      : sha256(Buffer.concat([current, sibling]));
  }

  return current.toString("hex") === normalizeLeafHash(expectedRootHash).toString("hex");
}
