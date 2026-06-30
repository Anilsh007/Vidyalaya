import { PrismaClient, RoleCode } from "@prisma/client";

import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/rbac/role-permissions";
import { RBAC_ROLE_CODES } from "@/lib/rbac/roles";

const db = new PrismaClient();

const HIGH_RISK_ADMIN_PERMISSIONS = [
  RBAC_PERMISSIONS.usersRolesManage,
  RBAC_PERMISSIONS.usersPermissionsManage,
  RBAC_PERMISSIONS.settingsManage,
  RBAC_PERMISSIONS.auditRead
] as const;

const OPERATIONAL_ROLES = [
  RoleCode.LIBRARIAN,
  RoleCode.TRANSPORT_MANAGER,
  RoleCode.HOSTEL_WARDEN,
  RoleCode.FRONT_DESK,
  RoleCode.NURSE,
  RoleCode.SECURITY_GUARD,
  RoleCode.MAINTENANCE_TECHNICIAN,
  RoleCode.PEON,
  RoleCode.PROCUREMENT_MANAGER
] as const;

async function main() {
  const school = await db.school.findFirst({
    select: { id: true, code: true, name: true }
  });

  if (!school) {
    throw new Error("No school found. Seed/bootstrap setup is required before RBAC verification.");
  }

  const [roles, permissions] = await Promise.all([
    db.role.findMany({
      where: { schoolId: school.id },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      },
      orderBy: [{ code: "asc" }]
    }),
    db.permission.findMany({
      where: { schoolId: school.id },
      orderBy: [{ code: "asc" }]
    })
  ]);

  const roleCodesInDb = new Set(roles.map((role) => role.code));
  const permissionCodesInDb = new Set(permissions.map((permission) => permission.code));

  const missingRoles = RBAC_ROLE_CODES.filter((roleCode) => !roleCodesInDb.has(roleCode));
  const missingPermissions = Object.values(RBAC_PERMISSIONS).filter(
    (permissionCode) => !permissionCodesInDb.has(permissionCode)
  );

  const rolePermissionSummary = roles.map((role) => ({
    role: role.code,
    dbPermissionCount: role.permissions.length,
    expectedPermissionCount: (DEFAULT_ROLE_PERMISSIONS[role.code] ?? []).length,
    missingExpectedPermissions: (DEFAULT_ROLE_PERMISSIONS[role.code] ?? []).filter(
      (permissionCode) =>
        !role.permissions.some((entry) => entry.permission.code === permissionCode)
    ),
    unexpectedAdminSensitivePermissions:
      OPERATIONAL_ROLES.includes(role.code as (typeof OPERATIONAL_ROLES)[number])
        ? HIGH_RISK_ADMIN_PERMISSIONS.filter((permissionCode) =>
            role.permissions.some((entry) => entry.permission.code === permissionCode)
          )
        : []
  }));

  const result = {
    school,
    totalRolesInDb: roles.length,
    totalPermissionsInDb: permissions.length,
    expectedRoleCount: RBAC_ROLE_CODES.length,
    expectedPermissionCount: Object.values(RBAC_PERMISSIONS).length,
    missingRoles,
    missingPermissions,
    rolePermissionSummary,
    ready:
      missingRoles.length === 0 &&
      missingPermissions.length === 0 &&
      rolePermissionSummary.every(
        (entry) =>
          entry.missingExpectedPermissions.length === 0 &&
          entry.unexpectedAdminSensitivePermissions.length === 0
      )
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
