import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session';

// POST /api/auth/logout
export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true });
}
