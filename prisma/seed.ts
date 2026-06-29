import { PrismaClient, RoleCode, UserType } from "@prisma/client";

import { hashPassword } from "../lib/auth/password";
import { RBAC_PERMISSIONS } from "../lib/permissions";
import { DEFAULT_ROLE_PERMISSIONS } from "../lib/rbac/role-permissions";
import { RBAC_ROLE_CODES, ROLE_LABELS } from "../lib/rbac/roles";

const prisma = new PrismaClient();

function getAcademicYearWindow(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  return {
    name: `${startYear}-${endYear}`,
    startDate: new Date(Date.UTC(startYear, 3, 1, 0, 0, 0, 0)),
    endDate: new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999))
  };
}

async function seedPermissions(schoolId: string) {
  const permissionEntries = Object.entries(RBAC_PERMISSIONS).map(([name, code]) => ({
    code,
    name,
    description: `Permission for ${name}`
  }));

  for (const permission of permissionEntries) {
    await prisma.permission.upsert({
      where: {
        schoolId_code: {
          schoolId,
          code: permission.code
        }
      },
      update: permission,
      create: {
        schoolId,
        ...permission
      }
    });
  }

  return prisma.permission.findMany({
    where: { schoolId }
  });
}

async function seedRoles(schoolId: string, permissions: Awaited<ReturnType<typeof seedPermissions>>) {
  for (const roleCode of RBAC_ROLE_CODES) {
    const role = await prisma.role.upsert({
      where: {
        schoolId_code: {
          schoolId,
          code: roleCode
        }
      },
      update: {
        name: ROLE_LABELS[roleCode]
      },
      create: {
        schoolId,
        code: roleCode,
        name: ROLE_LABELS[roleCode]
      }
    });

    for (const permissionCode of DEFAULT_ROLE_PERMISSIONS[roleCode] ?? []) {
      const permission = permissions.find((entry) => entry.code === permissionCode);
      if (!permission) {
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }

  return prisma.role.findMany({
    where: { schoolId }
  });
}

async function seedBootstrapAdmin(schoolId: string, superAdminRoleId: string) {
  const email = (process.env.DEFAULT_ADMIN_EMAIL ?? "admin@school.local").toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD ?? "ChangeMe123!";

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      schoolId,
      fullName: "System Administrator",
      passwordHash: hashPassword(password),
      userType: UserType.SYSTEM,
      isActive: true
    },
    create: {
      schoolId,
      fullName: "System Administrator",
      email,
      passwordHash: hashPassword(password),
      userType: UserType.SYSTEM,
      isActive: true
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: superAdminRoleId
      }
    },
    update: {},
    create: {
      userId: user.id,
      roleId: superAdminRoleId
    }
  });

  return user;
}

async function main() {
  const school = await prisma.school.upsert({
    where: { code: "DEFAULT" },
    update: {},
    create: {
      name: process.env.DEFAULT_SCHOOL_NAME ?? "Springfield Public School",
      code: "DEFAULT",
      slug: "default-school"
    }
  });

  const academicYearWindow = getAcademicYearWindow();
  await prisma.academicYear.upsert({
    where: {
      schoolId_name: {
        schoolId: school.id,
        name: academicYearWindow.name
      }
    },
    update: {
      startDate: academicYearWindow.startDate,
      endDate: academicYearWindow.endDate,
      isCurrent: true
    },
    create: {
      schoolId: school.id,
      ...academicYearWindow,
      isCurrent: true
    }
  });

  const permissions = await seedPermissions(school.id);
  const roles = await seedRoles(school.id, permissions);
  const superAdminRole = roles.find((role) => role.code === RoleCode.SUPER_ADMIN);

  if (!superAdminRole) {
    throw new Error("Super admin role was not provisioned.");
  }

  const bootstrapAdmin = await seedBootstrapAdmin(school.id, superAdminRole.id);

  if (process.env.ALLOW_DEMO_SEED === "true") {
    console.warn(
      "ALLOW_DEMO_SEED=true was provided, but demo business records are intentionally disabled in this production-first seed."
    );
  }

  console.log(
    `Seed complete: school=${school.code}, bootstrapAdmin=${bootstrapAdmin.email}, academicYear=${academicYearWindow.name}`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
