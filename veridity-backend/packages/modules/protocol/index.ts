import { createHash, generateKeyPairSync, randomUUID } from "crypto";
import { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { resolveDriver } from "@ssi/plugins";
import { protocolJobs, sendValidationError, validateDto } from "@ssi/utils";
import {
  ProtocolSessionCreateDto,
  hasNonEmptyString,
  isNonEmptyObject,
} from "../dtos/platform.dto";

type DriverName = keyof typeof resolveDriver;
type ProtocolSessionDoc = {
  id: string;
  protocol: string;
  tenantId?: string;
  issuerDid?: string;
  verifierDid?: string;
  holderDid?: string;
  walletId?: string;
  state: string;
  challenge?: string;
  nonce?: string;
  authorizationCode?: string;
  preAuthorizedCode?: string;
  deepLink?: string;
  qrPayload?: string;
  callbackUrl?: string;
  requestObject?: Record<string, unknown>;
  responseObject?: unknown;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
};


type OAuthErrorCode =
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "invalid_token"
  | "invalid_or_missing_proof"
  | "unsupported_grant_type"
  | "unsupported_credential_type"
  | "access_denied"
  | "server_error"
  | "temporarily_unavailable";

type PublicJwk = JsonWebKey & { use?: string; alg?: string; kid: string };

type RateLimitBucket = { count: number; resetAt: number };
const protocolJwtSecret =
  process.env.PROTOCOL_ACCESS_TOKEN_SECRET ||
  process.env.CONTROL_PLANE_JWT_SECRET ||
  process.env.JWT_SIGNING_KEY ||
  "dev-control-plane-secret";
const protocolIssuer = process.env.PROTOCOL_ISSUER || "ssi-platform";
const protocolAccessTokenTtlSeconds = Number(process.env.PROTOCOL_ACCESS_TOKEN_TTL_SECONDS || 600);
const protocolNonceTtlSeconds = Number(process.env.PROTOCOL_NONCE_TTL_SECONDS || 300);
const publicRateLimitWindowMs = Number(process.env.PUBLIC_PROTOCOL_RATE_LIMIT_WINDOW_MS || 60_000);
const publicRateLimitMax = Number(process.env.PUBLIC_PROTOCOL_RATE_LIMIT_MAX || 120);
const publicTokenRateLimitMax = Number(process.env.PUBLIC_PROTOCOL_TOKEN_RATE_LIMIT_MAX || 30);
const rateLimitBuckets = new Map<string, RateLimitBucket>();

const activeProtocolKeyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const activeProtocolKid = process.env.PROTOCOL_JWKS_ACTIVE_KID || "phase4-rs256-active";
const activePublicJwk = activeProtocolKeyPair.publicKey.export({ format: "jwk" }) as PublicJwk;
const additionalPublicJwks: PublicJwk[] = (() => {
  const parsed: PublicJwk[] = [];
  const configured = process.env.PROTOCOL_JWKS_ADDITIONAL_PUBLIC_KEYS_JSON;
  if (configured) {
    try {
      const candidate = JSON.parse(configured);
      if (Array.isArray(candidate)) {
        for (const entry of candidate) {
          if (entry && typeof entry === "object" && typeof entry.kid === "string") {
            parsed.push(entry as PublicJwk);
          }
        }
      }
    } catch {
      // Ignore malformed optional configuration and fall back to generated keys only.
    }
  }
  if (String(process.env.PROTOCOL_JWKS_ROTATION_ENABLED || "false").toLowerCase() === "true") {
    const nextKeyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
    parsed.push({
      ...(nextKeyPair.publicKey.export({ format: "jwk" }) as PublicJwk),
      use: "sig",
      alg: "RS256",
      kid: process.env.PROTOCOL_JWKS_NEXT_KID || "phase4-rs256-next",
    });
  }
  return parsed;
})();

const protocolJwks = {
  keys: [
    {
      ...activePublicJwk,
      use: "sig",
      alg: "RS256",
      kid: activeProtocolKid,
    },
    ...additionalPublicJwks,
  ],
};

function oauthError(reply: any, statusCode: number, error: OAuthErrorCode, errorDescription: string, extras?: Record<string, unknown>) {
  return reply.status(statusCode).send({
    error,
    error_description: errorDescription,
    ...(extras ?? {}),
  });
}

function pruneRateLimitBuckets(now: number) {
  for (const [key, value] of rateLimitBuckets.entries()) {
    if (value.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

function applyPublicRateLimit(request: any, reply: any, limitType: "general" | "token" = "general") {
  const now = Date.now();
  pruneRateLimitBuckets(now);
  const max = limitType === "token" ? publicTokenRateLimitMax : publicRateLimitMax;
  const ip = String(request.ip || request.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  const key = `${limitType}:${ip}:${request.routerPath || request.url}`;
  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + publicRateLimitWindowMs });
    reply.header("x-ratelimit-limit", max);
    reply.header("x-ratelimit-remaining", Math.max(max - 1, 0));
    reply.header("x-ratelimit-reset", Math.ceil((now + publicRateLimitWindowMs) / 1000));
    return true;
  }
  current.count += 1;
  rateLimitBuckets.set(key, current);
  reply.header("x-ratelimit-limit", max);
  reply.header("x-ratelimit-remaining", Math.max(max - current.count, 0));
  reply.header("x-ratelimit-reset", Math.ceil(current.resetAt / 1000));
  if (current.count > max) {
    oauthError(reply, 429, "temporarily_unavailable", "Too many requests. Please retry later.");
    return false;
  }
  return true;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function sha256Base64Url(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

function verifyPkce(codeVerifier: string, codeChallenge: string, method: string) {
  if (method === "plain") return codeVerifier === codeChallenge;
  return sha256Base64Url(codeVerifier) === codeChallenge;
}

function isNonceFresh(session: ProtocolSessionDoc) {
  const issuedAt = Date.parse(String((session.metadata ?? {}).nonceIssuedAt || ""));
  if (!issuedAt) return true;
  return issuedAt + protocolNonceTtlSeconds * 1000 >= Date.now();
}

function extractProofJwt(body: Record<string, unknown>) {
  const proof = body.proof;
  if (proof && typeof proof === "object") {
    const maybeJwt = (proof as Record<string, unknown>).jwt;
    if (typeof maybeJwt === "string" && maybeJwt.trim()) return maybeJwt.trim();
  }
  const direct = body.proof_jwt;
  return typeof direct === "string" && direct.trim() ? direct.trim() : null;
}

function validateProofOfPossession(session: ProtocolSessionDoc, body: Record<string, unknown>) {
  const proofJwt = extractProofJwt(body);
  if (!proofJwt) {
    return { ok: false, error: "invalid_or_missing_proof" as OAuthErrorCode, description: "A proof JWT containing the session nonce is required" };
  }
  const payload = decodeJwtPayload(proofJwt);
  if (!payload) {
    return { ok: false, error: "invalid_or_missing_proof" as OAuthErrorCode, description: "The proof JWT could not be decoded" };
  }
  const nonce = typeof payload.nonce === "string" ? payload.nonce : null;
  if (!nonce || nonce !== session.nonce) {
    return { ok: false, error: "invalid_or_missing_proof" as OAuthErrorCode, description: "The proof JWT nonce does not match the active session nonce" };
  }
  if (!isNonceFresh(session)) {
    return { ok: false, error: "invalid_or_missing_proof" as OAuthErrorCode, description: "The proof JWT nonce has expired" };
  }
  const jti = typeof payload.jti === "string" ? payload.jti : null;
  const currentMetadata = session.metadata ?? {};
  if (jti && currentMetadata.proofJti && currentMetadata.proofJti === jti) {
    return { ok: false, error: "invalid_or_missing_proof" as OAuthErrorCode, description: "The proof JWT has already been used" };
  }
  const aud = typeof payload.aud === "string" ? payload.aud : null;
  return {
    ok: true,
    proofJwt,
    payload,
    metadataPatch: {
      proofJti: jti,
      proofNonceValidatedAt: new Date().toISOString(),
      proofAud: aud,
      proofIssuer: typeof payload.iss === "string" ? payload.iss : undefined,
      proofSubject: typeof payload.sub === "string" ? payload.sub : undefined,
    },
  };
}

function parseVerifierPresentation(body: Record<string, unknown>) {
  return body.presentation || body.vp_token || body.response;
}

function baseOrigin(request: any) {
  const configured = process.env.PUBLIC_BASE_URL || process.env.BASE_URL;
  if (configured && /^https?:\/\//.test(configured)) {
    return configured.replace(/\/$/, "");
  }
  const proto = String(request.headers["x-forwarded-proto"] || request.protocol || "http");
  const host = String(request.headers["x-forwarded-host"] || request.headers.host || "localhost:3000");
  return `${proto}://${host}`;
}

function getProtocolSessionModel() {
  try {
    return mongoose.model("ProtocolSession");
  } catch {
    return null;
  }
}

async function findSessionById(id: string): Promise<ProtocolSessionDoc | null> {
  const model = getProtocolSessionModel();
  if (!model) return null;
  return (await model.findOne({ id }).lean()) as ProtocolSessionDoc | null;
}

async function findSessionByCode(code: string): Promise<ProtocolSessionDoc | null> {
  const model = getProtocolSessionModel();
  if (!model) return null;
  return (await model.findOne({
    $or: [{ authorizationCode: code }, { preAuthorizedCode: code }],
  }).lean()) as ProtocolSessionDoc | null;
}

async function updateSession(id: string, patch: Record<string, unknown>) {
  const model = getProtocolSessionModel();
  if (!model) return null;
  return model.findOneAndUpdate({ id }, patch, { new: true }).lean();
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function signProtocolAccessToken(session: ProtocolSessionDoc) {
  return jwt.sign(
    {
      sub: session.holderDid || session.walletId || session.id,
      tenantId: session.tenantId,
      protocol: session.protocol,
      sessionId: session.id,
      issuerDid: session.issuerDid,
      verifierDid: session.verifierDid,
      scope: session.protocol === "oidc4vci" ? "credential:issue" : "presentation:submit",
      tokenUse: "protocol-access",
    },
    activeProtocolKeyPair.privateKey.export({ format: "pem", type: "pkcs8" }),
    {
      algorithm: "RS256",
      keyid: activeProtocolKid,
      issuer: protocolIssuer,
      audience: "ssi-public-protocol",
      expiresIn: protocolAccessTokenTtlSeconds,
    },
  );
}


function parseBearerToken(header: string | string[] | undefined) {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw || !raw.startsWith("Bearer ")) return null;
  return raw.slice("Bearer ".length).trim();
}

async function requireProtocolAccessToken(request: any, reply: any) {
  const token = parseBearerToken(request.headers.authorization);
  if (!token) {
    oauthError(reply, 401, "invalid_token", "Bearer access token is required");
    return null;
  }

  try {
    const decoded = jwt.verify(token, activeProtocolKeyPair.publicKey.export({ format: "pem", type: "spki" }), {
      issuer: protocolIssuer,
      audience: "ssi-public-protocol",
    }) as jwt.JwtPayload & { sessionId?: string; tokenUse?: string };
    if (decoded.tokenUse !== "protocol-access" || !decoded.sessionId) {
      oauthError(reply, 401, "invalid_token", "Protocol access token is invalid");
      return null;
    }
    const session = await findSessionById(decoded.sessionId);
    if (!session) {
      oauthError(reply, 401, "invalid_token", "Session for access token was not found");
      return null;
    }
    const tokenHash = hashToken(token);
    const storedHash = String((session.metadata ?? {}).accessTokenHash || "");
    if (storedHash && storedHash !== tokenHash) {
      oauthError(reply, 401, "invalid_token", "Access token does not match the active session token");
      return null;
    }
    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
      return oauthError(reply, 401, "invalid_token", "Session has expired");
    }
    const tokenExpiresAt = Date.parse(String((session.metadata ?? {}).accessTokenExpiresAt || ""));
    if (tokenExpiresAt && tokenExpiresAt < Date.now()) {
      return oauthError(reply, 401, "invalid_token", "Access token has expired");
    }
    return { token, session };
  } catch (error) {
    oauthError(reply, 401, "invalid_token", (error as Error).message);
    return null;
  }
}

function isSessionExpired(session: ProtocolSessionDoc | null) {
  return !!session?.expiresAt && new Date(session.expiresAt).getTime() < Date.now();
}

function normalizeFormat(format: unknown) {
  const value = String(format || "vc-jwt").trim();
  if (["vc-jwt", "jwt_vc", "jwt-vc"].includes(value)) return "vc-jwt";
  if (["sd-jwt-vc", "sd_jwt_vc", "dc+sd-jwt"].includes(value)) return "sd-jwt-vc";
  return value;
}

function buildIssuerWellKnown(request: any, driverType: string) {
  const origin = baseOrigin(request);
  const base = `${origin}/v1/${driverType}/protocols/oidc4vci`;
  return {
    credential_issuer: base,
    authorization_servers: [`${base}/.well-known/openid-configuration`],
    credential_endpoint: `${base}/credential`,
    deferred_credential_endpoint: `${base}/credential/deferred`,
    credential_configurations_supported: {
      jwt_vc_json: {
        format: "vc-jwt",
        scope: "credential:issue",
        proof_types_supported: {
          jwt: { proof_signing_alg_values_supported: ["EdDSA", "ES256K", "RS256"] },
        },
      },
      sd_jwt_vc: {
        format: "sd-jwt-vc",
        scope: "credential:issue",
        proof_types_supported: {
          jwt: { proof_signing_alg_values_supported: ["EdDSA", "ES256K", "RS256"] },
        },
      },
    },
    jwks_uri: `${base}/jwks`,
  };
}

function buildAuthorizationServerMetadata(request: any, driverType: string) {
  const origin = baseOrigin(request);
  const base = `${origin}/v1/${driverType}/protocols/oidc4vci`;
  return {
    issuer: `${base}`,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    credential_endpoint: `${base}/credential`,
    deferred_credential_endpoint: `${base}/credential/deferred`,
    jwks_uri: `${base}/jwks`,
    response_types_supported: ["code"],
    grant_types_supported: [
      "authorization_code",
      "urn:ietf:params:oauth:grant-type:pre-authorized_code",
    ],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
    code_challenge_methods_supported: ["S256", "plain"],
    scopes_supported: ["credential:issue"],
  };
}

function buildVerifierMetadata(request: any, driverType: string) {
  const origin = baseOrigin(request);
  const base = `${origin}/v1/${driverType}/protocols/oidc4vp`;
  return {
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    response_endpoint: `${base}/callback`,
    request_uri_parameter_supported: true,
    jwks_uri: `${base}/jwks`,
    vp_formats_supported: {
      jwt_vp_json: { alg_values_supported: ["EdDSA", "ES256K", "RS256"] },
      sd_jwt_vp: { alg_values_supported: ["EdDSA", "ES256K", "RS256"] },
    },
  };
}

export default async function protocolModule(fastify: FastifyInstance) {
  fastify.get("/:driver/protocols/:protocol/metadata", async (request, reply) => {
    const { driver: driverType, protocol } = request.params as {
      driver: DriverName;
      protocol: any;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.protocol) {
        return reply.status(501).send({ error: "Protocol layer is not supported by this driver" });
      }
      request.log.debug({
        driver: driverType,
        protocol,
      }, "Fetching protocol metadata");
      const metadata = await driver.protocol.metadata(protocol);
      if (!metadata) return reply.status(404).send({ error: "Protocol metadata not found" });
      reply.send(metadata);
    } catch (err) {
      request.log.error({
        driver: driverType,
        protocol,
        error: err,
      }, "Protocol metadata lookup failed");
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.post("/:driver/protocols/:protocol/sessions", async (request, reply) => {
    const { driver: driverType, protocol } = request.params as {
      driver: DriverName;
      protocol: any;
    };
    const payload = await validateDto(ProtocolSessionCreateDto, request.body, reply);
    if (!payload) return;

    try {
      const protocolName = String(protocol);
      const credentialFormat = payload.credentialFormat ?? payload.format;
      const requestObject = isNonEmptyObject(payload.requestObject) ? payload.requestObject : undefined;

      if (protocolName === "oidc4vci") {
        if (!hasNonEmptyString(payload.issuerDid)) {
          return sendValidationError(reply, "issuerDid is required for oidc4vci sessions");
        }
        if (!hasNonEmptyString(credentialFormat)) {
          return sendValidationError(reply, "credentialFormat or format is required for oidc4vci sessions");
        }
      }

      if (["oidc4vp", "siopv2", "dcql"].includes(protocolName) && !hasNonEmptyString(payload.verifierDid)) {
        return sendValidationError(reply, `verifierDid is required for ${protocolName} sessions`);
      }

      if (["didcomm-v2", "aries"].includes(protocolName)) {
        const hasActorContext =
          hasNonEmptyString(payload.issuerDid) ||
          hasNonEmptyString(payload.verifierDid) ||
          hasNonEmptyString(payload.holderDid) ||
          hasNonEmptyString(payload.walletId);
        if (!hasActorContext) {
          return sendValidationError(
            reply,
            `At least one of issuerDid, verifierDid, holderDid, or walletId is required for ${protocolName} sessions`,
          );
        }
      }

      const driver = resolveDriver(driverType);
      if (!driver.protocol) {
        return reply.status(501).send({ error: "Protocol layer is not supported by this driver" });
      }
      request.log.info({
        driver: driverType,
        protocol: protocolName,
        tenantId: payload.tenantId ?? (request as any).tenantId,
      }, "Creating protocol session");
      const session = await driver.protocol.createSession(protocol, {
        ...(requestObject ?? {}),
        ...payload,
        credentialFormat,
        format: credentialFormat ?? payload.format,
        tenantId: payload.tenantId ?? (request as any).tenantId,
        authContext: (request as any).authContext,
      });
      const shouldEnqueue = payload.enqueue !== false;

      if (!shouldEnqueue) {
        request.log.info({
          driver: driverType,
          protocol: protocolName,
          sessionId: session.id,
        }, "Created protocol session without enqueueing worker job");
        reply.send(session);
        return;
      }

      const job = await protocolJobs.enqueue({
        driver: String(driverType),
        protocol: String(protocol),
        sessionId: session.id,
        tenantId: session.tenantId,
        payload: {
          sessionId: session.id,
          processImmediately: true,
        },
      });

      request.log.info({
        driver: driverType,
        protocol: protocolName,
        sessionId: session.id,
        jobId: job.id,
      }, "Created protocol session and enqueued worker job");
      reply.status(202).send({
        ...session,
        metadata: {
          ...(session.metadata ?? {}),
          workerJobId: job.id,
          workerQueue: "ssi:protocol-jobs",
        },
      });
    } catch (err) {
      request.log.error({
        driver: driverType,
        protocol,
        error: err,
      }, "Protocol session creation failed");
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/protocols/sessions/:id", async (request, reply) => {
    const { driver: driverType, id } = request.params as {
      driver: DriverName;
      id: string;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.protocol?.getSession) {
        return reply.status(501).send({ error: "Protocol session lookup is not supported by this driver" });
      }
      request.log.debug({
        driver: driverType,
        sessionId: id,
      }, "Fetching protocol session");
      const session = await driver.protocol.getSession(id);
      if (!session) return reply.status(404).send({ error: "Protocol session not found" });
      reply.send(session);
    } catch (err) {
      request.log.error({
        driver: driverType,
        sessionId: id,
        error: err,
      }, "Protocol session lookup failed");
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  fastify.get("/:driver/protocols/deferred/:transactionId", async (request, reply) => {
    const { driver: driverType, transactionId } = request.params as {
      driver: DriverName;
      transactionId: string;
    };

    try {
      const driver = resolveDriver(driverType);
      if (!driver.protocol?.getDeferredExchange) {
        return reply.status(501).send({ error: "Deferred exchange lookup is not supported by this driver" });
      }
      request.log.debug({
        driver: driverType,
        transactionId,
      }, "Fetching deferred protocol exchange");
      const exchange = await driver.protocol.getDeferredExchange(transactionId);
      if (!exchange) return reply.status(404).send({ error: "Deferred exchange not found" });
      reply.send(exchange);
    } catch (err) {
      request.log.error({
        driver: driverType,
        transactionId,
        error: err,
      }, "Deferred protocol exchange lookup failed");
      reply.status(500).send({ error: (err as Error).message });
    }
  });

  // Public OIDC4VCI discovery and runtime endpoints.
  fastify.get("/:driver/protocols/oidc4vci/.well-known/openid-credential-issuer", async (request, reply) => {
    if (!applyPublicRateLimit(request, reply)) return;
    const { driver: driverType } = request.params as { driver: DriverName };
    reply.send(buildIssuerWellKnown(request, String(driverType)));
  });

  fastify.get("/:driver/protocols/oidc4vci/.well-known/openid-configuration", async (request, reply) => {
    if (!applyPublicRateLimit(request, reply)) return;
    const { driver: driverType } = request.params as { driver: DriverName };
    reply.send(buildAuthorizationServerMetadata(request, String(driverType)));
  });

  fastify.get("/:driver/protocols/oidc4vci/jwks", async (request, reply) => {
    if (!applyPublicRateLimit(request, reply)) return;
    reply.send(protocolJwks);
  });

  fastify.post("/:driver/protocols/oidc4vci/authorize", async (request, reply) => {
    if (!applyPublicRateLimit(request, reply)) return;
    const { driver: driverType } = request.params as { driver: DriverName };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const issuerDid = String(body.issuerDid || "").trim();
    const format = normalizeFormat(body.credentialFormat || body.format);
    const schemaId = String(body.schemaId || body.schema || "").trim();
    const claims = typeof body.claims === "object" && body.claims ? (body.claims as Record<string, unknown>) : {};
    const tenantId = String(body.tenantId || (request as any).tenantId || "").trim() || undefined;

    if (!issuerDid) return sendValidationError(reply, "issuerDid is required");
    if (!schemaId) return sendValidationError(reply, "schemaId is required");

    try {
      const driver = resolveDriver(driverType);
      if (!driver.protocol?.createSession) {
        return reply.status(501).send({ error: "Protocol layer is not supported by this driver" });
      }
      const session = await driver.protocol.createSession("oidc4vci", {
        tenantId,
        issuerDid,
        holderDid: body.holderDid,
        walletId: body.walletId,
        format,
        credentialFormat: format,
        schema: { id: schemaId },
        claims,
        proofType: body.proofType,
        defer: body.defer,
        metadata: {
          publicFlow: true,
          clientId: body.client_id,
          redirectUri: body.redirect_uri,
          codeChallenge: body.code_challenge,
          codeChallengeMethod: body.code_challenge_method,
          grantType: body.grant_type,
          nonceIssuedAt: new Date().toISOString(),
          authorizationCodeIssuedAt: new Date().toISOString(),
          allowedGrantTypes: ["authorization_code", "urn:ietf:params:oauth:grant-type:pre-authorized_code"],
        },
      });
      reply.send({
        session_id: session.id,
        authorization_code: session.authorizationCode,
        pre_authorized_code: session.preAuthorizedCode,
        c_nonce: session.nonce,
        c_nonce_expires_in: protocolNonceTtlSeconds,
        expires_in: protocolAccessTokenTtlSeconds,
        issuer: buildAuthorizationServerMetadata(request, String(driverType)).issuer,
      });
    } catch (error) {
      reply.status(500).send({ error: "server_error", error_description: (error as Error).message });
    }
  });

  fastify.post("/:driver/protocols/oidc4vci/token", async (request, reply) => {
    if (!applyPublicRateLimit(request, reply, "token")) return;

    const body = (request.body ?? {}) as Record<string, unknown>;
    const grantType = String(body.grant_type || "authorization_code").trim();
    if (!["authorization_code", "urn:ietf:params:oauth:grant-type:pre-authorized_code"].includes(grantType)) {
      return oauthError(reply, 400, "unsupported_grant_type", `Unsupported grant_type: ${grantType || "(empty)"}`);
    }

    const code = String(
      grantType === "urn:ietf:params:oauth:grant-type:pre-authorized_code"
        ? (body["pre-authorized_code"] || body.pre_authorized_code || body["urn:ietf:params:oauth:grant-type:pre-authorized_code"] || "")
        : (body.code || ""),
    ).trim();
    if (!code) {
      return oauthError(reply, 400, "invalid_request", grantType === "authorization_code"
        ? "code is required for the authorization_code grant"
        : "pre_authorized_code is required for the pre-authorized_code grant");
    }

    const session = await findSessionByCode(code);
    if (!session || session.protocol !== "oidc4vci") {
      return oauthError(reply, 400, "invalid_grant", "Authorization code is invalid");
    }
    if (isSessionExpired(session)) {
      await updateSession(session.id, { state: "expired" });
      return oauthError(reply, 400, "invalid_grant", "Session has expired");
    }
    if ((session.metadata ?? {}).usedAuthorizationCodeAt && grantType === "authorization_code") {
      return oauthError(reply, 400, "invalid_grant", "Authorization code has already been used");
    }
    const expectedChallenge = String((session.metadata ?? {}).codeChallenge || "").trim();
    if (grantType === "authorization_code" && expectedChallenge) {
      const verifier = String(body.code_verifier || "").trim();
      if (!verifier) {
        return oauthError(reply, 400, "invalid_request", "code_verifier is required for PKCE-bound authorization codes");
      }
      const method = String((session.metadata ?? {}).codeChallengeMethod || "S256").trim() || "S256";
      if (!verifyPkce(verifier, expectedChallenge, method)) {
        return oauthError(reply, 400, "invalid_grant", "code_verifier does not match the stored PKCE challenge");
      }
    }

    const requestedClientId = String(body.client_id || "").trim();
    const storedClientId = String((session.metadata ?? {}).clientId || "").trim();
    if (storedClientId && requestedClientId && storedClientId !== requestedClientId) {
      return oauthError(reply, 400, "invalid_client", "client_id does not match the session");
    }

    const accessToken = signProtocolAccessToken(session);
    await updateSession(session.id, {
      state: "authorized",
      metadata: {
        ...(session.metadata ?? {}),
        usedAuthorizationCodeAt: new Date().toISOString(),
        accessTokenHash: hashToken(accessToken),
        accessTokenKid: activeProtocolKid,
        accessTokenIssuedAt: new Date().toISOString(),
        accessTokenExpiresAt: new Date(Date.now() + protocolAccessTokenTtlSeconds * 1000).toISOString(),
      },
    });

    reply.send({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: protocolAccessTokenTtlSeconds,
      c_nonce: session.nonce,
      c_nonce_expires_in: protocolNonceTtlSeconds,
      authorization_details: [
        {
          type: "openid_credential",
          format: normalizeFormat(session.requestObject?.format || session.requestObject?.credentialFormat),
        },
      ],
    });
  });

  const issueCredentialHandler = async (request: any, reply: any) => {
    const { driver: driverType } = request.params as { driver: DriverName };
    const auth = await requireProtocolAccessToken(request, reply);
    if (!auth) return;

    const { session } = auth;
    if (!applyPublicRateLimit(request, reply)) return;
    if (session.protocol !== "oidc4vci") {
      return oauthError(reply, 400, "invalid_request", "Session is not an OIDC4VCI session");
    }
    if (!isNonceFresh(session)) {
      return oauthError(reply, 400, "invalid_or_missing_proof", "The active credential issuance nonce has expired");
    }

    const body = (request.body ?? {}) as Record<string, unknown>;
    const driver = resolveDriver(driverType);
    if (!driver.credential?.issue) {
      return reply.status(501).send({ error: "Credential issuance is not supported by this driver" });
    }

    const requestedFormat = normalizeFormat(
      body.format || body.credential_format || session.requestObject?.format || session.requestObject?.credentialFormat,
    );
    if (!["vc-jwt", "sd-jwt-vc"].includes(requestedFormat)) {
      return oauthError(reply, 400, "unsupported_credential_type", `Unsupported credential format: ${requestedFormat}`);
    }
    const proofValidation = validateProofOfPossession(session, body);
    if (!proofValidation.ok) {
      return oauthError(reply, 400, proofValidation.error, proofValidation.description);
    }
    const schema =
      (typeof session.requestObject?.schema === "object" && session.requestObject?.schema)
        ? session.requestObject.schema as Record<string, unknown>
        : { id: String(session.requestObject?.schema || "") };
    const claims = {
      ...((typeof session.requestObject?.claims === "object" && session.requestObject?.claims)
        ? session.requestObject.claims as Record<string, unknown>
        : {}),
      ...((typeof body.claims === "object" && body.claims)
        ? body.claims as Record<string, unknown>
        : {}),
    };

    try {
      const issued = await driver.credential.issue({
        tenantId: session.tenantId,
        issuerDid: String(session.issuerDid || session.requestObject?.issuerDid || ""),
        holderDid: String(session.holderDid || session.requestObject?.holderDid || ""),
        walletId: String(session.walletId || session.requestObject?.walletId || ""),
        subjectId: String(session.holderDid || session.requestObject?.subjectId || session.requestObject?.holderDid || ""),
        format: requestedFormat as any,
        schema: { id: String(schema.id || body.schemaId || "") },
        templateId: session.requestObject?.templateId as string | undefined,
        claims,
        proofType: String(body.proof?.proof_type || body.proof_type || session.requestObject?.proofType || "jwt") || undefined,
        defer: Boolean(body.defer ?? session.requestObject?.defer ?? false),
        metadata: {
          oidc4vci: true,
          sessionId: session.id,
          proof: body.proof,
          proofPayload: proofValidation.payload,
        },
      });

      await updateSession(session.id, {
        state: issued.deferred ? "authorized" : "issued",
        responseObject: issued.credential,
        metadata: {
          ...(session.metadata ?? {}),
          ...(proofValidation.ok ? proofValidation.metadataPatch : {}),
          issuedCredentialId: issued.record.id,
          issuedFormat: issued.format,
          deferredTransactionId: issued.deferred?.transactionId,
          nonceConsumedAt: new Date().toISOString(),
        },
      });

      if (issued.deferred) {
        reply.status(202).send({
          transaction_id: issued.deferred.transactionId,
          c_nonce: session.nonce,
          c_nonce_expires_in: protocolNonceTtlSeconds,
        });
        return;
      }

      reply.send({
        format: issued.format,
        credential: issued.credential,
        c_nonce: session.nonce,
        c_nonce_expires_in: protocolNonceTtlSeconds,
      });
    } catch (error) {
      reply.status(500).send({ error: "server_error", error_description: (error as Error).message });
    }
  };

  fastify.post("/:driver/protocols/oidc4vci/credential", issueCredentialHandler);
  fastify.post("/:driver/protocols/oidc4vci/credentials", issueCredentialHandler);

  const deferredCredentialHandler = async (request: any, reply: any) => {
    if (!applyPublicRateLimit(request, reply)) return;
    const auth = await requireProtocolAccessToken(request, reply);
    if (!auth) return;
    const transactionId = String(
      request.params?.transactionId || request.query?.transaction_id || request.body?.transaction_id || "",
    ).trim();
    if (!transactionId) {
      return reply.status(400).send({ error: "invalid_request", error_description: "transaction_id is required" });
    }

    const model = getProtocolSessionModel();
    const session = model
      ? await model.findOne({
          $or: [
            { authorizationCode: transactionId },
            { "metadata.deferredTransactionId": transactionId },
          ],
        }).lean() as ProtocolSessionDoc | null
      : null;

    if (!session) {
      return oauthError(reply, 404, "invalid_request", "Deferred transaction was not found");
    }
    if (session.id !== auth.session.id) {
      return oauthError(reply, 403, "access_denied", "Deferred transaction does not belong to the active access token session");
    }

    if (session.responseObject) {
      return reply.send({
        format: normalizeFormat(session.metadata?.issuedFormat),
        credential: session.responseObject,
      });
    }

    return reply.status(202).send({
      transaction_id: transactionId,
      status: session.state,
    });
  };

  fastify.get("/:driver/protocols/oidc4vci/deferred", deferredCredentialHandler);
  fastify.post("/:driver/protocols/oidc4vci/credential/deferred", deferredCredentialHandler);

  fastify.post("/:driver/protocols/oidc4vci/callback", async (_request, reply) => {
    reply.send({ acknowledged: true });
  });

  // Public OIDC4VP discovery and runtime endpoints.
  fastify.get("/:driver/protocols/oidc4vp/.well-known/openid-configuration", async (request, reply) => {
    if (!applyPublicRateLimit(request, reply)) return;
    const { driver: driverType } = request.params as { driver: DriverName };
    reply.send(buildVerifierMetadata(request, String(driverType)));
  });

  fastify.get("/:driver/protocols/oidc4vp/jwks", async (request, reply) => {
    if (!applyPublicRateLimit(request, reply)) return;
    reply.send(protocolJwks);
  });

  fastify.post("/:driver/protocols/oidc4vp/authorize", async (request, reply) => {
    if (!applyPublicRateLimit(request, reply)) return;
    const { driver: driverType } = request.params as { driver: DriverName };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const verifierDid = String(body.verifierDid || "").trim();
    const tenantId = String(body.tenantId || (request as any).tenantId || "").trim() || undefined;
    if (!verifierDid) return sendValidationError(reply, "verifierDid is required");

    try {
      const driver = resolveDriver(driverType);
      if (!driver.protocol?.createSession) {
        return reply.status(501).send({ error: "Protocol layer is not supported by this driver" });
      }
      const session = await driver.protocol.createSession("oidc4vp", {
        tenantId,
        verifierDid,
        holderDid: body.holderDid,
        walletId: body.walletId,
        challenge: body.nonce || randomUUID(),
        requestObject: {
          presentation_definition: body.presentation_definition,
          input_descriptors: body.input_descriptors,
          client_id: body.client_id,
          response_uri: body.response_uri,
          response_mode: body.response_mode,
          redirect_uri: body.redirect_uri,
          format: normalizeFormat(body.format || "vc-jwt"),
        },
        metadata: {
          publicFlow: true,
          state: body.state || randomUUID(),
          nonceIssuedAt: new Date().toISOString(),
        },
      });
      const origin = baseOrigin(request);
      reply.send({
        request_uri: `${origin}/v1/${driverType}/protocols/oidc4vp/requests/${encodeURIComponent(session.id)}`,
        nonce: session.nonce,
        state: session.metadata?.state || session.id,
        expires_in: protocolAccessTokenTtlSeconds,
        presentation_definition: body.presentation_definition,
      });
    } catch (error) {
      reply.status(500).send({ error: "server_error", error_description: (error as Error).message });
    }
  });

  fastify.get("/:driver/protocols/oidc4vp/requests/:id", async (request, reply) => {
    if (!applyPublicRateLimit(request, reply)) return;
    const { id } = request.params as { id: string };
    const session = await findSessionById(id);
    if (!session || session.protocol !== "oidc4vp") {
      return reply.status(404).send({ error: "Presentation request not found" });
    }
    reply.send({
      client_id: session.verifierDid,
      nonce: session.nonce,
      state: session.metadata?.state,
      presentation_definition: session.requestObject?.presentation_definition ?? session.requestObject,
      response_uri: `${baseOrigin(request)}/v1/${(request.params as any).driver}/protocols/oidc4vp/callback`,
    });
  });

  fastify.get("/:driver/protocols/oidc4vp/qr", async (request, reply) => {
    if (!applyPublicRateLimit(request, reply)) return;
    const sessionId = String((request.query as any)?.sessionId || "").trim();
    if (!sessionId) {
      return reply.status(400).send({ error: "sessionId is required" });
    }
    const session = await findSessionById(sessionId);
    if (!session || session.protocol !== "oidc4vp") {
      return reply.status(404).send({ error: "Protocol session not found" });
    }
    reply.send({
      sessionId,
      qrPayload: session.qrPayload || JSON.stringify({ request_uri: `${baseOrigin(request)}${request.url}` }),
      deepLink: session.deepLink,
    });
  });

  const vpSubmissionHandler = async (request: any, reply: any) => {
    const { driver: driverType } = request.params as { driver: DriverName };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const sessionId = String(body.sessionId || body.state || body.request_id || "").trim();
    if (!sessionId) {
      return reply.status(400).send({ error: "invalid_request", error_description: "sessionId or state is required" });
    }

    if (!applyPublicRateLimit(request, reply)) return;
    const session = await findSessionById(sessionId);
    if (!session || session.protocol !== "oidc4vp") {
      return oauthError(reply, 404, "invalid_request", "Presentation session was not found");
    }
    if (isSessionExpired(session)) {
      await updateSession(session.id, { state: "expired" });
      return oauthError(reply, 400, "invalid_request", "Presentation session has expired");
    }
    const expectedState = String((session.metadata ?? {}).state || session.id).trim();
    const submittedState = String(body.state || body.request_id || sessionId).trim();
    if (expectedState && submittedState && expectedState !== submittedState) {
      return oauthError(reply, 400, "invalid_request", "state does not match the active presentation session");
    }
    if (!isNonceFresh(session)) {
      return oauthError(reply, 400, "invalid_request", "Presentation request nonce has expired");
    }

    const driver = resolveDriver(driverType);
    if (!driver.presentation?.verify) {
      return reply.status(501).send({ error: "Presentation verification is not supported by this driver" });
    }

    const presentation = parseVerifierPresentation(body);
    if (!presentation) {
      return reply.status(400).send({ error: "invalid_request", error_description: "presentation or vp_token is required" });
    }

    try {
      const result = await driver.presentation.verify({
        presentation,
        format: normalizeFormat(body.format || session.requestObject?.format || "vc-jwt") as any,
        challenge: String(session.challenge || session.nonce || ""),
        domain: typeof body.client_id === "string" ? body.client_id : undefined,
        resolveStatus: true,
        verifyTrustChain: true,
        metadata: {
          sessionId: session.id,
          oidc4vp: true,
        },
      });

      await updateSession(session.id, {
        state: result.valid ? "verified" : "failed",
        responseObject: presentation,
        metadata: {
          ...(session.metadata ?? {}),
          verificationResult: result,
          presentationSubmittedAt: new Date().toISOString(),
        },
      });

      reply.send({
        presentation_submission: result,
        state: session.metadata?.state,
      });
    } catch (error) {
      reply.status(500).send({ error: "server_error", error_description: (error as Error).message });
    }
  };

  fastify.post("/:driver/protocols/oidc4vp/presentations", vpSubmissionHandler);
  fastify.post("/:driver/protocols/oidc4vp/callback", vpSubmissionHandler);
}
