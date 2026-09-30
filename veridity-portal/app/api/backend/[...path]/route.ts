import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function getBackendBaseUrl() {
  return (
    process.env.BACKEND_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:4000/v1'
  ).replace(/\/$/, '');
}

async function proxy(request: NextRequest, pathSegments: string[]) {
  if (!ALLOWED_METHODS.has(request.method.toUpperCase())) {
    return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
  }

  const session = await getSession();
  if (!session.jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const incomingUrl = new URL(request.url);
  const queryString = incomingUrl.search;
  const target = `${getBackendBaseUrl()}/${pathSegments.map(encodeURIComponent).join('/')}${queryString}`;

  const headers = new Headers();
  headers.set('Accept', 'application/json');
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  const protocolAccessToken = request.headers.get('x-protocol-access-token');
  headers.set('Authorization', protocolAccessToken ? `Bearer ${protocolAccessToken}` : `Bearer ${session.jwt}`);
  if (session.tenantId) headers.set('x-tenant-id', session.tenantId);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    init.body = await request.text();
  }

  const response = await fetch(target, init);
  const bodyText = await response.text();
  const responseHeaders = new Headers();
  const responseContentType = response.headers.get('content-type');
  if (responseContentType) responseHeaders.set('Content-Type', responseContentType);

  return new NextResponse(bodyText, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}
