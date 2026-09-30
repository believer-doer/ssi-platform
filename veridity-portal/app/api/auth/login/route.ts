import { NextRequest, NextResponse } from 'next/server';
import { setSession } from '@/lib/session';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.CONTROL_PLANE_JWT_SECRET || 'dev-control-plane-secret';
const AUTH_MODE = process.env.AUTH_MODE || 'mock';

function getMockSession(email: string, password: string) {
  if (email === 'admin@veridity.local' && password === 'admin') {
    return { sub: 'admin@veridity.local', tenantId: 'platform', roles: ['platform-admin'] };
  }
  if (email === 'tenant@veridity.local' && password === 'tenant') {
    return { sub: 'tenant@veridity.local', tenantId: 'tenant-001', roles: ['tenant-admin'] };
  }
  if (email === 'issuer@veridity.local' && password === 'issuer') {
    return { sub: 'issuer@veridity.local', tenantId: 'tenant-001', roles: ['issuer'] };
  }
  if (email === 'verifier@veridity.local' && password === 'verifier') {
    return { sub: 'verifier@veridity.local', tenantId: 'tenant-001', roles: ['verifier'] };
  }
  if (email === 'wallet@veridity.local' && password === 'wallet') {
    return { sub: 'wallet@veridity.local', tenantId: 'tenant-001', roles: ['wallet'] };
  }
  if (email === 'auditor@veridity.local' && password === 'auditor') {
    return { sub: 'auditor@veridity.local', tenantId: 'tenant-001', roles: ['auditor'] };
  }
  if (email === 'worker@veridity.local' && password === 'worker') {
    return { sub: 'worker@veridity.local', tenantId: 'tenant-001', roles: ['worker'] };
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (AUTH_MODE !== 'mock') {
    return NextResponse.json(
      { success: false, error: `Portal auth mode '${AUTH_MODE}' is not implemented in this phase.` },
      { status: 501 },
    );
  }

  const { email, password } = await req.json();
  const sessionData = getMockSession(email, password);

  if (!sessionData) {
    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
  }

  const token = jwt.sign(sessionData, JWT_SECRET, { expiresIn: '8h' });
  await setSession({ jwt: token, tenantId: sessionData.tenantId, roles: sessionData.roles });

  return NextResponse.json({
    success: true,
    role: sessionData.roles[0],
    tenantId: sessionData.tenantId,
    authMode: AUTH_MODE,
  });
}
