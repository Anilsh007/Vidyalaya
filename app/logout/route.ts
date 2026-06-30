import { NextResponse } from "next/server";

import { clearSessionCookie, getOptionalSession } from "@/lib/auth/session";
import { recordSecurityAuditEvent } from "@/lib/audit/audit.service";

async function handleLogout(request: Request) {
  const session = await getOptionalSession();

  if (session) {
    await recordSecurityAuditEvent({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "auth.logout",
      entityType: "User",
      entityId: session.userId
    });
  }

  await clearSessionCookie();

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const loginUrl = host ? new URL(`${protocol}://${host}/login`) : new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(process.env.SESSION_COOKIE_NAME ?? "school_erp_session");
  return response;
}

export async function GET(request: Request) {
  return handleLogout(request);
}

export async function POST(request: Request) {
  return handleLogout(request);
}
