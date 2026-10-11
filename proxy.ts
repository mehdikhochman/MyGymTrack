import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, tokenOk } from './lib/auth';

export function proxy(req: NextRequest) {
  if (tokenOk(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/api/')) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  return NextResponse.redirect(new URL('/login', req.url));
}

// Everything except the login page, the cron route (checks CRON_SECRET itself) and PWA assets.
export const config = {
  matcher: ['/((?!login|api/cron|_next/static|_next/image|manifest.webmanifest|icon|apple-icon).*)'],
};
