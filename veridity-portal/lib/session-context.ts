import { cookies } from 'next/headers';

export async function getSessionContext() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('veridity_jwt')?.value;
  const tenantId = cookieStore.get('tenant_id')?.value;
  const roles = cookieStore.get('roles')?.value?.split(',') ?? [];
  return { jwt, tenantId, roles };
}
