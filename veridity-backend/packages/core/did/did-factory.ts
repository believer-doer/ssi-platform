import bs58 from "bs58";
import { v4 as uuidv4 } from "uuid";

type DidInput =
  | string
  | {
      publicKey?: string;
      publicKeyJwk?: Record<string, unknown>;
      domain?: string;
      address?: string;
      network?: string;
    };

function asObject(input: DidInput | undefined) {
  if (!input) return {};
  if (typeof input === "string") {
    return { publicKey: input };
  }
  return input;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

export function createDID(method: string, input?: DidInput) {
  const normalizedMethod = method.replace(/^did:/, "");
  const options = asObject(input);

  switch (normalizedMethod) {
    case "key": {
      const publicKey = options.publicKey ?? uuidv4().replace(/-/g, "");
      return `did:key:z${bs58.encode(Buffer.from(publicKey))}`;
    }
    case "jwk": {
      const jwk = options.publicKeyJwk ?? {
        kty: "OKP",
        crv: "Ed25519",
        x: base64UrlEncode(uuidv4()),
      };
      return `did:jwk:${base64UrlEncode(JSON.stringify(jwk))}`;
    }
    case "web": {
      const domain = (options.domain ?? "localhost").replace(/^https?:\/\//, "");
      return `did:web:${domain.replace(/\//g, ":")}`;
    }
    case "ethr": {
      const address = options.address ?? `0x${uuidv4().replace(/-/g, "").slice(0, 40)}`;
      return options.network
        ? `did:ethr:${options.network}:${address}`
        : `did:ethr:${address}`;
    }
    case "pkh": {
      const network = options.network ?? "eip155:1";
      const address = options.address ?? `0x${uuidv4().replace(/-/g, "").slice(0, 40)}`;
      return `did:pkh:${network}:${address}`;
    }
    case "internal":
      return `did:internal:${uuidv4()}`;
    default:
      return `did:${normalizedMethod}:${uuidv4()}`;
  }
}
