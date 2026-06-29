import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { SESSION_PATH_HEADER, verifySignedSessionCookieValue } from "@/lib/auth/security";
import type { AppSession } from "@/lib/auth/session";

async function isValidSession(request: NextRequest) {
  const cookieName = process.env.SESSION_COOKIE_NAME ?? "school_erp_session";
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    return false;
  }

  const raw = request.cookies.get(cookieName)?.value;
  if (!raw) {
    return false;
  }

  const session = await verifySignedSessionCookieValue<AppSession>(raw, secret);
  return Boolean(session);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const authenticated = await isValidSession(request);

  if (authenticated) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(SESSION_PATH_HEADER, pathname);
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
