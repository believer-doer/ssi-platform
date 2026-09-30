import { redirect } from 'next/navigation';
import { getWorkspaceContext } from '@/lib/workspace';

export default async function TenantPage() {
  const { baseTenantPath, tenantId } = await getWorkspaceContext();
  redirect(tenantId ? `${baseTenantPath}/dashboard` : '/');
}
