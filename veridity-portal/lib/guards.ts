import { redirect } from 'next/navigation';
import { getWorkspaceContext } from '@/lib/workspace';
import { Capability, hasAnyCapability, getPrimaryRole } from '@/lib/capabilities';

export async function requireAnyCapability(capabilities: Capability[], redirectTo?: string) {
  const ctx = await getWorkspaceContext();
  if (!hasAnyCapability(ctx.roles, capabilities)) {
    redirect(redirectTo ?? defaultRedirect(ctx.roles, ctx.baseTenantPath));
  }
  return ctx;
}

export async function requireAnyRole(roles: string[], redirectTo?: string) {
  const ctx = await getWorkspaceContext();
  if (!ctx.roles.some((role) => roles.includes(role))) {
    redirect(redirectTo ?? defaultRedirect(ctx.roles, ctx.baseTenantPath));
  }
  return ctx;
}

function defaultRedirect(roles: string[], baseTenantPath: string) {
  const primary = getPrimaryRole(roles);
  if (primary === 'platform-admin') return '/platform-admin/tenants';
  if (['tenant-admin', 'issuer', 'verifier', 'wallet', 'auditor'].includes(primary ?? '')) return `${baseTenantPath}/dashboard`;
  return '/';
}
