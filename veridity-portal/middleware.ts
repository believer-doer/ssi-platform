import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const jwt = request.cookies.get('veridity_jwt')?.value;
  const { pathname } = request.nextUrl;

  // Paths that require authentication
  if (pathname.startsWith('/platform-admin') || pathname.startsWith('/tenant')) {
    if (!jwt) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If already logged in, redirect away from auth pages
  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    if (jwt) {
      // Redirect to home or dashboard if already authenticated
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/platform-admin/:path*', '/tenant/:path*', '/login', '/auth'],
};
