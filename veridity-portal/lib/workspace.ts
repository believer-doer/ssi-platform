import { getSessionContext } from "@/lib/session-context";
import { getCapabilities, getPrimaryRole, normalizeRoles } from "@/lib/capabilities";

export type PortalRole =
  | "platform-admin"
  | "tenant-admin"
  | "issuer"
  | "verifier"
  | "wallet"
  | "auditor"
  | "worker";

export const TENANT_OPERATOR_ROLES: PortalRole[] = [
  "tenant-admin",
  "issuer",
  "verifier",
  "wallet",
  "auditor",
];

export function isPlatformAdmin(roles: string[]) {
  return roles.includes("platform-admin");
}

export function isTenantOperator(roles: string[]) {
  return roles.some((role) => TENANT_OPERATOR_ROLES.includes(role as PortalRole));
}

export function tenantBasePath(tenantId?: string | null) {
  return tenantId ? `/tenant/${tenantId}` : "/tenant";
}

export async function getWorkspaceContext() {
  const session = await getSessionContext();
  const normalizedRoles = normalizeRoles(session.roles);
  const primaryRole = getPrimaryRole(normalizedRoles);
  const capabilities = getCapabilities(normalizedRoles);

  return {
    ...session,
    roles: normalizedRoles,
    primaryRole,
    capabilities,
    isPlatformAdmin: isPlatformAdmin(normalizedRoles),
    isTenantOperator: isTenantOperator(normalizedRoles),
    baseTenantPath: tenantBasePath(session.tenantId),
    driver: "internal",
  };
}
