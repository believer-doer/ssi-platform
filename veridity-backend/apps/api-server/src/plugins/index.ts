import { FastifyInstance } from "fastify";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ControlPlaneRole, RequestAuthContext } from "@ssi/plugins";

interface ControlPlaneClaims extends JwtPayload {
  sub?: string;
  tenantId?: string;
  roles?: string[];
  scope?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    _authContext?: RequestAuthContext;
    authContext: RequestAuthContext;
    tenantId?: string;
  }
}

interface RouteRolePolicy {
  methods: string[];
  routePattern: RegExp;
  roles: ControlPlaneRole[];
}

const routeRolePolicies: RouteRolePolicy[] = [
  { methods: ["POST"], routePattern: /^\/:driver\/issuers$/, roles: ["tenant-admin"] },
  { methods: ["GET"], routePattern: /^\/:driver\/issuers$/, roles: ["tenant-admin", "auditor"] },
  { methods: ["GET"], routePattern: /^\/:driver\/issuers\/[^/]+$/, roles: ["tenant-admin", "issuer", "auditor"] },
  { methods: ["POST"], routePattern: /^\/:driver\/issuers\/[^/]+\/activate$/, roles: ["tenant-admin"] },

  { methods: ["POST"], routePattern: /^\/:driver\/verifiers$/, roles: ["tenant-admin"] },
  { methods: ["GET"], routePattern: /^\/:driver\/verifiers$/, roles: ["tenant-admin", "auditor"] },
  { methods: ["GET"], routePattern: /^\/:driver\/verifiers\/[^/]+$/, roles: ["tenant-admin", "verifier", "auditor"] },
  { methods: ["POST"], routePattern: /^\/:driver\/verifiers\/[^/]+\/activate$/, roles: ["tenant-admin"] },

  { methods: ["POST"], routePattern: /^\/:driver\/wallets$/, roles: ["tenant-admin", "wallet"] },
  { methods: ["GET"], routePattern: /^\/:driver\/wallets$/, roles: ["tenant-admin", "wallet", "auditor"] },
  { methods: ["GET"], routePattern: /^\/:driver\/wallets\/[^/]+$/, roles: ["tenant-admin", "wallet", "auditor"] },

  { methods: ["POST"], routePattern: /^\/:driver\/schemas$/, roles: ["tenant-admin", "issuer"] },
  { methods: ["GET"], routePattern: /^\/:driver\/schemas$/, roles: ["tenant-admin", "issuer", "verifier", "wallet", "auditor"] },
  { methods: ["GET"], routePattern: /^\/:driver\/schemas\/[^/]+$/, roles: ["tenant-admin", "issuer", "verifier", "wallet", "auditor"] },
  { methods: ["POST"], routePattern: /^\/:driver\/schemas\/[^/]+\/activate$/, roles: ["tenant-admin"] },

  { methods: ["POST"], routePattern: /^\/:driver\/templates$/, roles: ["tenant-admin", "issuer"] },
  { methods: ["GET"], routePattern: /^\/:driver\/templates$/, roles: ["tenant-admin", "issuer", "auditor"] },
  { methods: ["GET"], routePattern: /^\/:driver\/templates\/[^/]+$/, roles: ["tenant-admin", "issuer", "auditor"] },
  { methods: ["POST"], routePattern: /^\/:driver\/templates\/[^/]+\/activate$/, roles: ["tenant-admin"] },

  { methods: ["POST"], routePattern: /^\/:driver\/credentials$/, roles: ["tenant-admin", "issuer"] },
  { methods: ["GET"], routePattern: /^\/:driver\/credentials$/, roles: ["tenant-admin", "issuer", "auditor"] },
  { methods: ["POST"], routePattern: /^\/:driver\/(credentials\/verify|verify-credential)$/, roles: ["tenant-admin", "verifier", "wallet"] },

  { methods: ["POST"], routePattern: /^\/:driver\/presentations$/, roles: ["tenant-admin", "wallet"] },
  { methods: ["POST"], routePattern: /^\/:driver\/(presentations\/verify|verify-presentation)$/, roles: ["tenant-admin", "verifier"] },

  { methods: ["POST"], routePattern: /^\/:driver\/tenants$/, roles: ["platform-admin"] },
  { methods: ["GET"], routePattern: /^\/:driver\/tenants$/, roles: ["platform-admin", "auditor"] },
  { methods: ["GET"], routePattern: /^\/:driver\/tenants\/[^/]+$/, roles: ["platform-admin", "tenant-admin", "auditor"] },
  { methods: ["POST"], routePattern: /^\/:driver\/tenants\/[^/]+\/policies$/, roles: ["platform-admin", "tenant-admin"] },

  { methods: ["POST"], routePattern: /^\/:driver\/(trust-registry|trust)$/, roles: ["tenant-admin"] },
  { methods: ["GET"], routePattern: /^\/:driver\/(trust-registry|trust)$/, roles: ["tenant-admin", "issuer", "verifier", "auditor"] },
  { methods: ["GET"], routePattern: /^\/:driver\/trust-registry\/[^/]+$/, roles: ["tenant-admin", "issuer", "verifier", "auditor"] },
  { methods: ["POST"], routePattern: /^\/:driver\/trust-registry\/[^/]+\/activate$/, roles: ["tenant-admin"] },

  { methods: ["POST"], routePattern: /^\/:driver\/governance\/proposals$/, roles: ["tenant-admin"] },
  { methods: ["GET"], routePattern: /^\/:driver\/governance\/proposals$/, roles: ["tenant-admin", "auditor"] },
  { methods: ["GET"], routePattern: /^\/:driver\/governance\/proposals\/[^/]+$/, roles: ["tenant-admin", "auditor"] },
  { methods: ["POST"], routePattern: /^\/:driver\/governance\/proposals\/[^/]+\/approve$/, roles: ["tenant-admin"] },

  { methods: ["POST"], routePattern: /^\/:driver\/protocols\/[^/]+\/sessions$/, roles: ["tenant-admin", "issuer", "verifier", "wallet", "worker"] },
  { methods: ["GET"], routePattern: /^\/:driver\/protocols\/sessions\/[^/]+$/, roles: ["tenant-admin", "issuer", "verifier", "wallet", "worker", "auditor"] },
  { methods: ["GET"], routePattern: /^\/:driver\/protocols\/deferred\/[^/]+$/, roles: ["tenant-admin", "issuer", "verifier", "wallet", "worker"] },

  { methods: ["GET"], routePattern: /^\/:driver\/audit$/, roles: ["tenant-admin", "auditor"] },
  { methods: ["GET"], routePattern: /^\/:driver\/audit\/[^/]+$/, roles: ["tenant-admin", "auditor"] },

  { methods: ["GET"], routePattern: /^\/revocation\/lists$/, roles: ["tenant-admin", "issuer", "verifier", "auditor"] },
  { methods: ["POST"], routePattern: /^\/revocation\/lists$/, roles: ["tenant-admin", "issuer", "worker"] },
  { methods: ["GET"], routePattern: /^\/revocation\/lists\/[^/]+$/, roles: ["tenant-admin", "issuer", "verifier", "auditor"] },
  { methods: ["POST"], routePattern: /^\/revocation\/lists\/[^/]+\/revoke$/, roles: ["tenant-admin", "issuer", "worker"] },

  { methods: ["GET"], routePattern: /^\/system\/status$/, roles: ["platform-admin", "tenant-admin", "worker", "auditor"] },
];

function extractBearerToken(header: string | undefined) {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

function toRoles(claims?: ControlPlaneClaims): ControlPlaneRole[] {
  const scopedRoles =
    typeof claims?.scope === "string"
      ? claims.scope.split(/\s+/).filter(Boolean)
      : [];
  const roles = [...(claims?.roles ?? []), ...scopedRoles];
  return Array.from(new Set(roles)) as ControlPlaneRole[];
}

function isTenantExempt(method: string, path: string) {
  if (/\/tenants(?:\/|$)/.test(path)) {
    return true;
  }
  if (method === "GET" && /\/protocols\/[^/]+\/metadata$/.test(path)) {
    return true;
  }
  if (/\/protocols\/oidc4vci\/(\.well-known\/openid-credential-issuer|\.well-known\/openid-configuration|jwks|authorize|token|credential(?:s)?(?:\/deferred)?|deferred|callback)$/.test(path)) {
    return true;
  }
  if (/\/protocols\/oidc4vp\/(\.well-known\/openid-configuration|jwks|authorize|callback|presentations|qr|requests\/[^/]+)$/.test(path)) {
    return true;
  }
  if (method === "GET" && /\/system\/(health|status|session)$/.test(path)) {
    return true;
  }
  return false;
}

function isPlatformAdmin(request: { authContext?: RequestAuthContext }) {
  return request.authContext?.roles.includes("platform-admin") ?? false;
}

function hasTenantField(value: unknown): value is { tenantId?: unknown } {
  return !!value && typeof value === "object" && "tenantId" in value;
}

function normalizeRoutePattern(route: string) {
  const withoutQuery = route.split("?")[0] || "/";
  const withoutVersionPrefix = withoutQuery.replace(/^\/v\d+/, "") || "/";
  return withoutVersionPrefix.startsWith("/") ? withoutVersionPrefix : `/${withoutVersionPrefix}`;
}

function findRoutePolicy(method: string, route: string) {
  const normalizedRoute = normalizeRoutePattern(route);
  return routeRolePolicies.find(
    (policy) => policy.methods.includes(method) && policy.routePattern.test(normalizedRoute),
  );
}

export async function registerPlugins(fastify: FastifyInstance) {
  const authLogger = fastify.log.child({ component: "auth" });

  fastify.decorateRequest("authContext", {
    getter(this: { _authContext?: RequestAuthContext }) {
      if (!this._authContext) {
        this._authContext = {
          authenticated: false,
          roles: [],
        };
      }
      return this._authContext;
    },
    setter(this: { _authContext?: RequestAuthContext }, value: RequestAuthContext) {
      this._authContext = value;
    },
  });
  fastify.decorateRequest("tenantId", undefined);

  fastify.addHook("onRequest", async (request, reply) => {
    const authRequired = process.env.CONTROL_PLANE_AUTH_REQUIRED === "true";
    const authHeader = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      request.authContext = { authenticated: false, roles: [] };
      if (authRequired && !isTenantExempt(request.method, request.url.split("?")[0])) {
        authLogger.warn({
          method: request.method,
          path: request.url.split("?")[0],
        }, "Rejected request without bearer token");
        return reply.status(401).send({ error: "Bearer token is required" });
      }
      return;
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.CONTROL_PLANE_JWT_SECRET || process.env.JWT_SIGNING_KEY || "dev-control-plane-secret",
      ) as ControlPlaneClaims;
      request.authContext = {
        authenticated: true,
        subject: decoded.sub,
        tenantId: decoded.tenantId,
        roles: toRoles(decoded),
        claims: decoded,
      };
      authLogger.debug({
        method: request.method,
        path: request.url.split("?")[0],
        subject: decoded.sub,
        tenantId: decoded.tenantId,
      }, "Authenticated request");
    } catch (error) {
      authLogger.warn({
        method: request.method,
        path: request.url.split("?")[0],
        error,
      }, "Rejected request with invalid bearer token");
      return reply.status(401).send({ error: `Invalid bearer token: ${(error as Error).message}` });
    }
  });

  fastify.addHook("preValidation", async (request, reply) => {
    const tenantRequired = process.env.CONTROL_PLANE_TENANT_REQUIRED !== "false";
    const path = request.url.split("?")[0];
    const tenantExempt = isTenantExempt(request.method, path);

    const body = request.body && typeof request.body === "object"
      ? (request.body as Record<string, unknown>)
      : undefined;
    const query = request.query && typeof request.query === "object"
      ? (request.query as Record<string, unknown>)
      : undefined;

    const headerTenant = Array.isArray(request.headers["x-tenant-id"])
      ? request.headers["x-tenant-id"][0]
      : request.headers["x-tenant-id"];
    const requestedTenant = String(
      body?.tenantId ??
        query?.tenantId ??
        headerTenant ??
        request.authContext.tenantId ??
        "",
    ).trim();

    if (requestedTenant) {
      request.tenantId = requestedTenant;
      if (body && hasTenantField(body) && !body.tenantId) {
        body.tenantId = requestedTenant;
      }
      if (query && hasTenantField(query) && !query.tenantId) {
        query.tenantId = requestedTenant;
      }
    }

    if (
      tenantRequired &&
      !tenantExempt &&
      !request.tenantId
    ) {
      authLogger.warn({
        method: request.method,
        path,
      }, "Rejected request without tenant context");
      return reply.status(400).send({ error: "tenantId is required for this route" });
    }

    if (
      request.authContext.authenticated &&
      request.authContext.tenantId &&
      request.tenantId &&
      request.authContext.tenantId !== request.tenantId &&
      !isPlatformAdmin(request)
    ) {
      authLogger.warn({
        method: request.method,
        path,
        authenticatedTenantId: request.authContext.tenantId,
        requestedTenantId: request.tenantId,
      }, "Rejected cross-tenant request");
      return reply.status(403).send({ error: "Tenant access denied for the authenticated principal" });
    }
  });

  fastify.addHook("preHandler", async (request, reply) => {
    const route = request.routeOptions.url ?? request.url.split("?")[0];
    const policy = findRoutePolicy(request.method, route);
    if (!policy) {
      return;
    }

    const authRequired = process.env.CONTROL_PLANE_AUTH_REQUIRED === "true";
    if (!request.authContext.authenticated) {
      if (!authRequired) {
        return;
      }
      authLogger.warn({
        method: request.method,
        path: route,
        requiredRoles: policy.roles,
      }, "Rejected unauthorized request for protected role-bound route");
      return reply.status(401).send({
        error: "Bearer token is required for this route",
        requiredRoles: [...new Set(["platform-admin", ...policy.roles])],
      });
    }

    const allowedRoles = new Set<ControlPlaneRole>(["platform-admin", ...policy.roles]);
    const hasRole = request.authContext.roles.some((role) => allowedRoles.has(role));
    if (hasRole) {
      return;
    }

    authLogger.warn({
      method: request.method,
      path: route,
      authenticatedRoles: request.authContext.roles,
      requiredRoles: [...allowedRoles],
    }, "Rejected request due to missing route role");
    return reply.status(403).send({
      error: "The authenticated principal is not allowed to invoke this route",
      requiredRoles: [...allowedRoles],
      authenticatedRoles: request.authContext.roles,
    });
  });
}
