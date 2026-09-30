import { getSessionContext } from '@/lib/session-context';

export async function getApiAuth() {
  // This can be used in server components/routes to get auth context
  const { jwt, tenantId } = await getSessionContext();
  return { jwt, tenantId };
}
