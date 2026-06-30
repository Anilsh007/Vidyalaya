import { PrismaClient } from "@prisma/client";

import { createUserSession } from "@/lib/auth/session";
import { canAccessRoute, getDefaultDashboardRoute, getVisibleModules } from "@/lib/modules/module-access";

const db = new PrismaClient();

const ROUTES_TO_CHECK = [
  "/dashboard",
  "/dashboard/users",
  "/dashboard/reports",
  "/dashboard/student-portal",
  "/dashboard/parent-portal",
  "/dashboard/health",
  "/dashboard/library"
] as const;

const PERSONAS = [
  { email: "admin@school.local", label: "bootstrap-admin" },
  { email: "qa.leave.teacher@school.local", label: "teacher" },
  { email: "student.portal@school.local", label: "student" },
  { email: "parent@school.local", label: "parent" },
  { email: "accountant@school.local", label: "accountant" }
] as const;

type PersonaResult = {
  label: string;
  email: string;
  missing: boolean;
  roles: string[];
  defaultRoute: string | null;
  visibleModules: string[];
  hiddenModulesExposed: string[];
  routeAccess: Record<string, boolean>;
};

async function inspectPersona(email: string, label: string): Promise<PersonaResult> {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (!user) {
    return {
      label,
      email,
      missing: true,
      roles: [],
      defaultRoute: null,
      visibleModules: [],
      hiddenModulesExposed: [],
      routeAccess: {}
    };
  }

  const session = await createUserSession(user.id);
  if (!session) {
    return {
      label,
      email,
      missing: true,
      roles: [],
      defaultRoute: null,
      visibleModules: [],
      hiddenModulesExposed: [],
      routeAccess: {}
    };
  }

  const visibleModules = getVisibleModules(session);

  return {
    label,
    email,
    missing: false,
    roles: session.roles,
    defaultRoute: getDefaultDashboardRoute(session),
    visibleModules: visibleModules.map((module) => module.key),
    hiddenModulesExposed: visibleModules
      .filter((module) => module.status === "hidden")
      .map((module) => module.key),
    routeAccess: Object.fromEntries(
      ROUTES_TO_CHECK.map((route) => [route, canAccessRoute(session, route)])
    )
  };
}

async function main() {
  const results = await Promise.all(PERSONAS.map((persona) => inspectPersona(persona.email, persona.label)));

  console.log(
    JSON.stringify(
      {
        checkedRoutes: ROUTES_TO_CHECK,
        personas: results
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
