import { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";

export type ControlPlaneRole =
  | "platform-admin"
  | "tenant-admin"
  | "issuer"
  | "verifier"
  | "wallet"
  | "auditor"
  | "worker";

export interface RequestAuthContext {
  authenticated: boolean;
  subject?: string;
  tenantId?: string;
  roles: ControlPlaneRole[];
  claims?: Record<string, unknown>;
}

interface RoleGuardOptions {
  roles: ControlPlaneRole[];
  allowPlatformAdmin?: boolean;
  allowWhenAuthDisabled?: boolean;
}

function roleLabel(roles: ControlPlaneRole[]) {
  return roles.join(", ");
}

export function authorizeRoles(
  roles: ControlPlaneRole[],
  options: Omit<RoleGuardOptions, "roles"> = {},
): preHandlerHookHandler {
  const settings: RoleGuardOptions = {
    roles,
    allowPlatformAdmin: options.allowPlatformAdmin ?? true,
    allowWhenAuthDisabled: options.allowWhenAuthDisabled ?? true,
  };

  return async function roleGuard(request: FastifyRequest, reply: FastifyReply) {
    const authRequired = process.env.CONTROL_PLANE_AUTH_REQUIRED === "true";
    const context = (request as FastifyRequest & { authContext?: RequestAuthContext }).authContext;
    const routeRoles = new Set(settings.roles);
    if (settings.allowPlatformAdmin) {
      routeRoles.add("platform-admin");
    }

    if (!context?.authenticated) {
      if (!authRequired && settings.allowWhenAuthDisabled) {
        return;
      }
      return reply.status(401).send({
        error: "Bearer token is required for this route",
        requiredRoles: Array.from(routeRoles),
      });
    }

    const allowed = context.roles.some((role) => routeRoles.has(role));
    if (allowed) {
      return;
    }

    return reply.status(403).send({
      error: `This route requires one of the following roles: ${roleLabel(Array.from(routeRoles))}`,
      requiredRoles: Array.from(routeRoles),
      authenticatedRoles: context.roles,
    });
  };
}
