"use server";

import { redirect } from "next/navigation";

import { logout } from "@/lib/auth/session";
import { getOptionalSession } from "@/lib/auth/session";
import { recordSecurityAuditEvent } from "@/lib/audit/audit.service";

export async function logoutAction() {
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

  await logout();
  redirect("/login");
}
