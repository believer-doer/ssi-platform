import { cookies } from 'next/headers';

const ONE_DAY = 60 * 60 * 24;
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: ONE_DAY,
};

const CONTEXT_COOKIE_OPTIONS = {
  httpOnly: false,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: ONE_DAY,
};

export async function getSession() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('veridity_jwt')?.value;
  const tenantId = cookieStore.get('tenant_id')?.value;
  const roles = cookieStore.get('roles')?.value?.split(',').filter(Boolean) ?? [];
  return { jwt, tenantId, roles };
}

export async function setSession({ jwt, tenantId, roles }: { jwt: string; tenantId: string; roles: string[] }) {
  const cookieStore = await cookies();
  cookieStore.set('veridity_jwt', jwt, SESSION_COOKIE_OPTIONS);
  cookieStore.set('tenant_id', tenantId, CONTEXT_COOKIE_OPTIONS);
  cookieStore.set('roles', roles.join(','), CONTEXT_COOKIE_OPTIONS);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('veridity_jwt');
  cookieStore.delete('tenant_id');
  cookieStore.delete('roles');
}
