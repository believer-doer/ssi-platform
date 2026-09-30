import { walletEnv } from "@/config/env";

type JsonRecord = Record<string, unknown>;

const DEFAULT_CLIENT_ID = "veridity-wallet-holder";
const DEFAULT_VERIFIER_ID = "did:example:veridity-wallet-holder";

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function resolveProtocolUrl(urlOrPath: string) {
  const trimmed = urlOrPath.trim();
  if (!trimmed) {
    throw new Error("A protocol URL is required");
  }

  if (isAbsoluteUrl(trimmed)) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${walletEnv.backendOrigin}${normalizedPath}`;
}

function parseJsonResponse(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function protocolFetchJson(urlOrPath: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(resolveProtocolUrl(urlOrPath), {
    ...init,
    headers,
  });
  const text = await response.text();
  const payload = parseJsonResponse(text);

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : payload?.error_description || payload?.error || payload?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function randomId(prefix: string) {
  const randomBits =
    typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
      ? Array.from(crypto.getRandomValues(new Uint8Array(8)), (value) => value.toString(16).padStart(2, "0")).join("")
      : Math.random().toString(16).slice(2, 10);

  return `${prefix}_${Date.now().toString(36)}_${randomBits}`;
}

function utf8ToBytes(value: string) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value);
  }

  const escaped = unescape(encodeURIComponent(value));
  const bytes = new Uint8Array(escaped.length);
  for (let index = 0; index < escaped.length; index += 1) {
    bytes[index] = escaped.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  const table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index] ?? 0;
    const byte2 = bytes[index + 1] ?? 0;
    const byte3 = bytes[index + 2] ?? 0;

    const triplet = (byte1 << 16) | (byte2 << 8) | byte3;
    output += table[(triplet >> 18) & 0x3f];
    output += table[(triplet >> 12) & 0x3f];
    output += index + 1 < bytes.length ? table[(triplet >> 6) & 0x3f] : "=";
    output += index + 2 < bytes.length ? table[triplet & 0x3f] : "=";
  }

  return output;
}

function base64UrlEncode(value: string) {
  return bytesToBase64(utf8ToBytes(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function toJsonRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

export function parseMaybeJson(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

export function extractRequestUri(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("{")) {
    const parsed = parseMaybeJson(trimmed);
    const record = toJsonRecord(parsed);
    if (record?.request_uri && typeof record.request_uri === "string") {
      return record.request_uri.trim();
    }
  }

  if (isAbsoluteUrl(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const requestUri = parsed.searchParams.get("request_uri");
      return requestUri?.trim() || trimmed;
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export function extractSessionIdFromRequestUri(value: string) {
  const requestUri = extractRequestUri(value);
  if (!requestUri) {
    return "";
  }

  try {
    const parsed = new URL(requestUri);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    const parts = requestUri.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }
}

export function createPkcePair() {
  const codeVerifier = randomId("pkce");
  return {
    codeVerifier,
    codeChallenge: codeVerifier,
    codeChallengeMethod: "plain" as const,
  };
}

export function createUnsignedJwt(payload: JsonRecord) {
  const header = { alg: "none", typ: "JWT" };
  return `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}.`;
}

export function createIssuanceProofJwt(input: {
  nonce: string;
  issuerDid?: string;
  subjectDid?: string;
  audience?: string;
}) {
  return createUnsignedJwt({
    iss: input.subjectDid || DEFAULT_VERIFIER_ID,
    sub: input.subjectDid || DEFAULT_VERIFIER_ID,
    aud: input.audience || "ssi-public-protocol",
    nonce: input.nonce,
    jti: randomId("proof"),
    iat: Math.floor(Date.now() / 1000),
    act: {
      issuerDid: input.issuerDid,
    },
  });
}

export function buildPresentationToken(input: {
  nonce: string;
  verifierDid?: string;
  holderDid?: string;
  credential: unknown;
  presentationDefinitionId?: string;
}) {
  return createUnsignedJwt({
    iss: input.holderDid || DEFAULT_VERIFIER_ID,
    sub: input.holderDid || DEFAULT_VERIFIER_ID,
    aud: input.verifierDid || "ssi-public-protocol",
    nonce: input.nonce,
    jti: randomId("vp"),
    iat: Math.floor(Date.now() / 1000),
    vp: {
      holder: input.holderDid || DEFAULT_VERIFIER_ID,
      verifiableCredential: [input.credential],
    },
    presentation_submission: {
      definition_id: input.presentationDefinitionId || "wallet-presentation",
      descriptor_map: [
        {
          id: "credential",
          format: "jwt_vp_json",
          path: "$.vp.verifiableCredential[0]",
        },
      ],
    },
  });
}

export function defaultWalletHolderDid() {
  return DEFAULT_VERIFIER_ID;
}

export function defaultWalletClientId() {
  return DEFAULT_CLIENT_ID;
}
