import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { SESSION_PATH_HEADER } from "@/lib/auth/security";
import { recordSecurityAuditEvent } from "@/lib/audit/audit.service";
import {
  canAccessRoute,
  getDefaultDashboardRoute,
  normalizePathname
} from "@/lib/modules/module-access";

export default async function DashboardLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const { session, user } = await requireCurrentUser();
  const requestHeaders = await headers();
  const pathname = normalizePathname(requestHeaders.get(SESSION_PATH_HEADER) ?? "/dashboard");

  if (pathname !== "/dashboard/forbidden" && !canAccessRoute(session, pathname)) {
    await recordSecurityAuditEvent({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "auth.route.forbidden",
      entityType: "Route",
      entityId: pathname,
      metadata: { pathname, roles: session.roles, permissionsCount: session.permissions.length }
    });

    const allowedRoute = getDefaultDashboardRoute(session);
    if (allowedRoute && allowedRoute !== "/forbidden" && canAccessRoute(session, allowedRoute)) {
      redirect(`/forbidden?next=${encodeURIComponent(allowedRoute)}`);
    }

    redirect("/forbidden");
  }

  return (
    <AppShell
      roleSummary={session.roles.join(", ") || "No role assigned"}
      schoolName={user?.school.name ?? "School"}
      userLabel={user?.fullName ?? "Staff account"}
      roles={session.roles}
      permissions={session.permissions}
    >
      {children}
    </AppShell>
  );
}
