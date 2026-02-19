import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Proxy (formerly Middleware)
 *
 * Note: Authentication checks are done client-side in the layouts because
 * tokens are stored in localStorage, which is not accessible server-side.
 * The layouts handle redirecting unauthenticated users.
 */

export function proxy(request: NextRequest) {
  // Just pass through - auth is handled client-side in layouts
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
