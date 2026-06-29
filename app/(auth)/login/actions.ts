"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { verifyPassword } from "@/lib/auth/password";
import {
  clearLoginRateLimit,
  getLoginRateLimitState,
  registerFailedLoginAttempt
} from "@/lib/auth/rate-limit";
import { createUserSession, saveSession } from "@/lib/auth/session";
import { recordSecurityAuditEvent } from "@/lib/audit/audit.service";
import { LOGIN_COPY } from "@/lib/copy";
import { db } from "@/lib/db";
import {
  canAccessRoute,
  getDefaultDashboardRoute,
  normalizePathname
} from "@/lib/modules/module-access";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  next: z.string().optional()
});

export type LoginActionState = {
  status: "idle" | "error";
  message?: string;
};

function sanitizeNextPath(next?: string) {
  const normalized = normalizePathname(next);
  if (!normalized.startsWith("/") || normalized === "/forbidden") {
    return "/dashboard";
  }

  return normalized;
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for") ?? "";
  const ipAddress = forwardedFor.split(",")[0]?.trim() || "local";
  const userAgent = requestHeaders.get("user-agent") ?? undefined;
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: LOGIN_COPY.error
    };
  }

  const email = parsed.data.email.toLowerCase();
  const rateLimitKey = `${email}:${ipAddress}`;
  const rateLimitState = getLoginRateLimitState(rateLimitKey);
  if (!rateLimitState.allowed) {
    return {
      status: "error",
      message: LOGIN_COPY.error
    };
  }

  const user = await db.user.findUnique({
    where: { email }
  });

  if (!user || !user.isActive || !verifyPassword(parsed.data.password, user.passwordHash)) {
    registerFailedLoginAttempt(rateLimitKey);
    await recordSecurityAuditEvent({
      actorUserId: user?.id,
      schoolId: user?.schoolId,
      action: "auth.login.failed",
      entityType: "User",
      entityId: user?.id,
      metadata: { email },
      ipAddress,
      userAgent
    });

    return {
      status: "error",
      message: LOGIN_COPY.error
    };
  }

  const session = await createUserSession(user.id);
  if (!session) {
    return {
      status: "error",
      message: LOGIN_COPY.error
    };
  }

  clearLoginRateLimit(rateLimitKey);
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });
  await saveSession(session);
  await recordSecurityAuditEvent({
    actorUserId: user.id,
    schoolId: user.schoolId,
    action: "auth.login.succeeded",
    entityType: "User",
    entityId: user.id,
    ipAddress,
    userAgent
  });

  const nextPath = sanitizeNextPath(parsed.data.next);
  if (canAccessRoute(session, nextPath)) {
    redirect(nextPath);
  }

  const fallbackRoute = getDefaultDashboardRoute(session);
  redirect(fallbackRoute === "/forbidden" ? "/forbidden" : fallbackRoute);
}
