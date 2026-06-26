"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { LOGIN_COPY } from "@/lib/copy";
import { verifyPassword } from "@/lib/auth/password";
import { createUserSession, saveSession } from "@/lib/auth/session";

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
  if (!next || !next.startsWith("/")) {
    return "/dashboard";
  }

  if (next.startsWith("//")) {
    return "/dashboard";
  }

  return next;
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
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
  const user = await db.user.findUnique({
    where: { email }
  });

  if (!user || !user.isActive || !verifyPassword(parsed.data.password, user.passwordHash)) {
    if (user) {
      await recordAuditLog({
        actorUserId: user.id,
        schoolId: user.schoolId,
        action: "auth.login.failed",
        entityType: "User",
        entityId: user.id,
        metadata: { email }
      });
    }

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

  await saveSession(session);
  await recordAuditLog({
    actorUserId: user.id,
    schoolId: user.schoolId,
    action: "auth.login.succeeded",
    entityType: "User",
    entityId: user.id
  });

  redirect(sanitizeNextPath(parsed.data.next));
}
