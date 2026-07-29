import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Lightweight edge guard for /admin: if there is no session cookie at all,
 * bounce to login immediately. The authoritative ADMIN role check happens in
 * the /admin layout and every admin server action (which have DB access).
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has('gs_session');
  if (!hasSession) {
    const url = new URL('/connexion', req.url);
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
