import { getWorkspaceContext } from '@/lib/workspace';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export default async function TenantWorkspaceLayout({ children, params }: { children: ReactNode; params: Promise<{ tenantId: string }> }) {
  const { tenantId: sessionTenantId, isPlatformAdmin, isTenantOperator, roles } = await getWorkspaceContext();
  const { tenantId } = await params;

  if (roles.includes('worker')) {
    redirect('/');
  }

  if (!isPlatformAdmin && !isTenantOperator) {
    redirect('/');
  }

  if (!isPlatformAdmin && sessionTenantId && tenantId !== sessionTenantId) {
    redirect(`/tenant/${sessionTenantId}/dashboard`);
  }

  return <>{children}</>;
}
