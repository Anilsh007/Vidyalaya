import { redirect } from "next/navigation";
import { RoleCode } from "@prisma/client";

import { type AppSession, getRequiredSession } from "@/lib/auth/session";
import { recordSecurityAuditEvent } from "@/lib/audit/audit.service";
import { getDefaultDashboardRoute } from "@/lib/modules/module-access";
import { type RbacPermissionKey } from "@/lib/rbac/permissions";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/rbac/role-permissions";
import type { SessionLike } from "@/lib/rbac/types";

export function hasRole(session: Pick<SessionLike, "roles">, role: RoleCode | string) {
  return session.roles.includes(role);
}

export function hasAnyRole(session: Pick<SessionLike, "roles">, roles: readonly (RoleCode | string)[]) {
  return roles.some((role) => hasRole(session, role));
}

export function hasPermission(session: Pick<SessionLike, "permissions">, permission: RbacPermissionKey | string) {
  return session.permissions.includes(permission);
}

export function hasAnyPermission(
  session: Pick<SessionLike, "permissions">,
  permissions: readonly (RbacPermissionKey | string)[]
) {
  return permissions.some((permission) => hasPermission(session, permission));
}

export function hasAllPermissions(
  session: Pick<SessionLike, "permissions">,
  permissions: readonly (RbacPermissionKey | string)[]
) {
  return permissions.every((permission) => hasPermission(session, permission));
}

export function getUserPermissions(roleCodes: readonly RoleCode[]) {
  return Array.from(
    new Set(roleCodes.flatMap((roleCode) => DEFAULT_ROLE_PERMISSIONS[roleCode] ?? []))
  );
}

function redirectForbidden(session: AppSession) {
  const route = getDefaultDashboardRoute(session);
  redirect(`/forbidden?next=${encodeURIComponent(route)}`);
}

export async function requirePermission(permission: RbacPermissionKey | string) {
  const session = await getRequiredSession();
  if (!hasPermission(session, permission)) {
    await recordSecurityAuditEvent({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "auth.permission.denied",
      entityType: "Permission",
      entityId: String(permission),
      metadata: { requiredPermission: permission }
    });
    redirectForbidden(session);
  }
  return session;
}

export async function requireAnyPermission(permissions: readonly (RbacPermissionKey | string)[]) {
  const session = await getRequiredSession();
  if (!hasAnyPermission(session, permissions)) {
    await recordSecurityAuditEvent({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "auth.permission.denied",
      entityType: "Permission",
      metadata: { requiredAnyPermission: permissions }
    });
    redirectForbidden(session);
  }
  return session;
}

export async function requireRole(roles: readonly (RoleCode | string)[]) {
  const session = await getRequiredSession();
  if (!hasAnyRole(session, roles)) {
    await recordSecurityAuditEvent({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "auth.role.denied",
      entityType: "Role",
      metadata: { requiredRoles: roles }
    });
    redirectForbidden(session);
  }
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireRole([RoleCode.SUPER_ADMIN]);
  return session;
}
