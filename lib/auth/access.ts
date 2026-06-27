import { redirect } from "next/navigation";

import { getDefaultDashboardRoute } from "@/lib/dashboard-experience";
import { type AppSession, getRequiredSession } from "@/lib/auth/session";

export function hasRole(session: AppSession, role: string) {
  return session.roles.includes(role);
}

export function hasPermission(session: AppSession, permission: string) {
  return session.permissions.includes(permission);
}

export async function requirePermission(permission: string) {
  const session = await getRequiredSession();
  if (!hasPermission(session, permission)) {
    const route = getDefaultDashboardRoute(session);
    redirect(`${route}${route.includes("?") ? "&" : "?"}forbidden=1`);
  }
  return session;
}
