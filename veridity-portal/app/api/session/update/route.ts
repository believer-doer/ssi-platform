import { NextResponse } from 'next/server';
import { getSession, setSession } from '@/lib/session';

export async function POST(req: Request) {
  const { tenantId } = await req.json();
  const session = await getSession();

  if (!session.jwt) {
    return NextResponse.json({ success: false, error: 'No active session' }, { status: 401 });
  }

  await setSession({
    jwt: session.jwt,
    tenantId: tenantId || session.tenantId || 'tenant-001',
    roles: session.roles,
  });

  return NextResponse.json({ success: true });
}
