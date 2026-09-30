import { redirect } from 'next/navigation';

export default async function TenantWorkspaceIndex({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  redirect(`/tenant/${tenantId}/dashboard`);
}
