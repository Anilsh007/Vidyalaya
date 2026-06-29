import { RoleCode } from "@prisma/client";

import { APP_MODULES, type AppModule, type AppModuleChild } from "@/lib/modules/module-config";
import type { SessionLike } from "@/lib/rbac/types";

export type ModuleAccessUser = Pick<SessionLike, "permissions" | "roles">;

const PRIMARY_MODULE_ORDER: Record<RoleCode, readonly string[]> = {
  SUPER_ADMIN: ["dashboard", "users", "settings", "audit", "reports"],
  ADMIN: ["dashboard", "students", "staff", "users", "reports"],
  DIRECTOR: ["dashboard", "reports", "notices", "attendance", "students"],
  PRINCIPAL: ["dashboard", "attendance", "exams", "students", "notices"],
  HR: ["dashboard", "staff", "leaves", "payroll", "documents"],
  HOD: ["dashboard", "attendance", "exams", "students", "reports"],
  TEACHER: ["dashboard", "attendance", "exams", "students", "documents"],
  EXAM_CONTROLLER: ["dashboard", "exams", "reports", "students", "documents"],
  ACCOUNTANT: ["dashboard", "fees", "accounts", "payroll", "reports"],
  PROCUREMENT_MANAGER: ["dashboard", "inventory", "accounts", "reports"],
  LIBRARIAN: ["dashboard", "library", "reports"],
  TRANSPORT_MANAGER: ["dashboard", "transport", "reports"],
  HOSTEL_WARDEN: ["dashboard", "hostel", "reports", "students"],
  FRONT_DESK: ["dashboard", "students", "documents", "notices"],
  NURSE: ["dashboard"],
  SECURITY_GUARD: ["dashboard"],
  MAINTENANCE_TECHNICIAN: ["dashboard"],
  PEON: ["dashboard"],
  STUDENT: ["student-portal", "dashboard", "profile"],
  PARENT: ["parent-portal", "dashboard", "profile"]
};

const ROOT_FORBIDDEN = "/forbidden";
const ROOT_DASHBOARD = "/dashboard";

function hasSuperAdminRole(user: ModuleAccessUser) {
  return user.roles.includes(RoleCode.SUPER_ADMIN);
}

function hasAllowedRole(user: ModuleAccessUser, allowedRoles?: readonly RoleCode[]) {
  if (hasSuperAdminRole(user)) {
    return true;
  }

  if (!allowedRoles?.length) {
    return true;
  }

  return user.roles.some((role) => allowedRoles.includes(role as RoleCode));
}

function hasAnyModulePermission(user: ModuleAccessUser, requiredPermissions: readonly string[]) {
  if (hasSuperAdminRole(user)) {
    return true;
  }

  if (!requiredPermissions.length) {
    return true;
  }

  return requiredPermissions.some((permission) => user.permissions.includes(permission));
}

function isVisibleStatus(status: AppModule["status"]) {
  return status !== "hidden";
}

export function normalizePathname(pathname?: string | null) {
  const rawValue = (pathname ?? "").trim();
  const withLeadingSlash = rawValue
    ? rawValue.startsWith("/")
      ? rawValue
      : `/${rawValue}`
    : "/";
  const [withoutHash] = withLeadingSlash.split("#", 1);
  const [withoutQuery] = withoutHash.split("?", 1);
  const normalized = withoutQuery || "/";

  if (normalized === "/") {
    return normalized;
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

export function getModuleByKey(moduleKey: string) {
  return APP_MODULES.find((module) => module.key === moduleKey);
}

export function getVisibleModuleChildren(user: ModuleAccessUser, module: AppModule) {
  return (module.children ?? []).filter(
    (child) => child.status !== "hidden" && hasAnyModulePermission(user, child.requiredPermissions)
  );
}

export function canAccessModule(user: ModuleAccessUser, moduleKey: string) {
  const module = getModuleByKey(moduleKey);
  if (!module || !isVisibleStatus(module.status)) {
    return false;
  }

  if (!hasAllowedRole(user, module.allowedRoles)) {
    return false;
  }

  if (hasAnyModulePermission(user, module.requiredPermissions)) {
    return true;
  }

  return getVisibleModuleChildren(user, module).length > 0;
}

function matchesPath(pathname: string, href: string) {
  const normalizedPath = normalizePathname(pathname);
  const normalizedHref = normalizePathname(href);
  return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);
}

function childCanMatchRoute(user: ModuleAccessUser, child: AppModuleChild, pathname: string) {
  return (
    child.status !== "hidden" &&
    matchesPath(pathname, child.href) &&
    hasAnyModulePermission(user, child.requiredPermissions)
  );
}

export function canAccessRoute(user: ModuleAccessUser, pathname: string) {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === ROOT_FORBIDDEN) {
    return false;
  }

  for (const module of APP_MODULES) {
    if (module.status === "hidden") {
      continue;
    }

    if (!hasAllowedRole(user, module.allowedRoles)) {
      continue;
    }

    if (matchesPath(normalizedPath, module.href) && hasAnyModulePermission(user, module.requiredPermissions)) {
      return true;
    }

    if ((module.children ?? []).some((child) => childCanMatchRoute(user, child, normalizedPath))) {
      return true;
    }
  }

  return false;
}

export function getVisibleModules(user: ModuleAccessUser) {
  return APP_MODULES.filter((module) => {
    if (module.navigationRoles?.length && !hasAllowedRole(user, module.navigationRoles)) {
      return false;
    }

    return canAccessModule(user, module.key);
  });
}

export function getPrimaryModulesForRole(user: ModuleAccessUser) {
  const visible = getVisibleModules(user);
  const visibleKeys = new Set(visible.map((module) => module.key));
  const ordered = new Set<string>();

  for (const role of user.roles) {
    const preference = PRIMARY_MODULE_ORDER[role as RoleCode] ?? [];
    for (const moduleKey of preference) {
      if (visibleKeys.has(moduleKey)) {
        ordered.add(moduleKey);
      }
    }
  }

  if (!ordered.size) {
    for (const module of visible) {
      ordered.add(module.key);
    }
  }

  return Array.from(ordered)
    .map((moduleKey) => getModuleByKey(moduleKey))
    .filter((module): module is AppModule => Boolean(module));
}

export function getDefaultDashboardRoute(user: ModuleAccessUser) {
  if (canAccessRoute(user, ROOT_DASHBOARD)) {
    return ROOT_DASHBOARD;
  }

  for (const module of getPrimaryModulesForRole(user)) {
    if (canAccessRoute(user, module.href)) {
      return normalizePathname(module.href);
    }
  }

  for (const module of getVisibleModules(user)) {
    if (canAccessRoute(user, module.href)) {
      return normalizePathname(module.href);
    }
  }

  return ROOT_FORBIDDEN;
}
