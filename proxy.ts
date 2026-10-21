import { NextResponse, type NextRequest } from 'next/server';

// Fast first gate: no session cookie → login page. Pages and actions then check the session in the database.
export function proxy(req: NextRequest) {
  if (req.cookies.has('gym_session')) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/api/')) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  return NextResponse.redirect(new URL('/login', req.url));
}

// Everything except the public pages (sign-in, sign-up, password reset), cron routes (they check CRON_SECRET) and static assets.
export const config = {
  matcher: ['/((?!login|inscription|mot-de-passe|api/cron|_next/static|_next/image|manifest.webmanifest|sw.js|icon|apple-icon|badge-96.png|logo.svg).*)'],
};
