import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Read expected credentials from environment variables.
  // We provide a fallback for local development testing, but you should 
  // set these in your Vercel Environment Variables dashboard!
  const expectedUser = process.env.APP_USERNAME || 'admin';
  const expectedPass = process.env.APP_PASSWORD || 'secret';

  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    
    // atob is available in Next.js Edge Runtime
    const [user, pwd] = atob(authValue).split(':');

    if (user === expectedUser && pwd === expectedPass) {
      return NextResponse.next();
    }
  }

  // If unauthorized, prompt the browser's native login modal
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Tracker Area"',
    },
  });
}

// Protect all routes except static assets
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|sw.js).*)'],
};
