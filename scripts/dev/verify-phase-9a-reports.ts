import { PrismaClient } from "@prisma/client";

import { createSessionCookieValue, createUserSession } from "@/lib/auth/session";
import { env } from "@/lib/env";

const db = new PrismaClient();

type CheckResult = {
  email: string;
  path: string;
  status?: number;
  location?: string | null;
  contentType?: string | null;
  disposition?: string | null;
  preview?: string;
  hasForbidden?: boolean;
  hasNoReports?: boolean;
  hasStudentReport?: boolean;
  hasFeesReport?: boolean;
  hasForbiddenRouteHint?: boolean;
  hasLoginRouteHint?: boolean;
  error?: string;
};

async function buildCookie(email: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (!user) {
    return null;
  }

  const session = await createUserSession(user.id);
  if (!session) {
    return null;
  }

  const value = await createSessionCookieValue(session);
  return `${env.SESSION_COOKIE_NAME}=${value}`;
}

async function requestAs(email: string, path: string): Promise<CheckResult> {
  const cookie = await buildCookie(email);
  if (!cookie) {
    return { email, path, error: "no-session" };
  }

  let response: Response;
  try {
    response = await fetch(`${env.APP_URL}${path}`, {
      headers: {
        Cookie: cookie
      },
      redirect: "manual"
    });
  } catch (error) {
    return {
      email,
      path,
      error: `request-failed:${error instanceof Error ? error.message : "unknown-error"}`
    };
  }

  const text = await response.text();
  return {
    email,
    path,
    status: response.status,
    location: response.headers.get("location"),
    contentType: response.headers.get("content-type"),
    disposition: response.headers.get("content-disposition"),
    preview: text.slice(0, 260),
    hasForbidden: text.includes("Access restricted"),
    hasNoReports: text.includes("No report workspaces available"),
    hasStudentReport: text.includes("Student report"),
    hasFeesReport: text.includes("Fee collection report"),
    hasForbiddenRouteHint: text.includes("/forbidden"),
    hasLoginRouteHint: text.includes("/login")
  };
}

async function main() {
  const checks = await Promise.all([
    requestAs("admin@school.local", "/dashboard/reports"),
    requestAs("admin@school.local", "/api/reports/export/student"),
    requestAs("admin@school.local", "/api/reports/export/attendance"),
    requestAs("admin@school.local", "/api/reports/export/fees"),
    requestAs("qa.leave.teacher@school.local", "/dashboard/reports"),
    requestAs("qa.leave.teacher@school.local", "/api/reports/export/fees"),
    requestAs("qa.leave.teacher@school.local", "/api/reports/export/student"),
    requestAs("qa.leave.teacher@school.local", "/api/reports/export/attendance"),
    requestAs("student.portal@school.local", "/dashboard/reports"),
    requestAs("student.portal@school.local", "/api/reports/export/student"),
    requestAs("student.portal@school.local", "/api/reports/export/fees"),
    requestAs("parent@school.local", "/dashboard/reports"),
    requestAs("parent@school.local", "/api/reports/export/student"),
    requestAs("parent@school.local", "/api/reports/export/fees"),
    requestAs("accountant@school.local", "/dashboard/reports"),
    requestAs("accountant@school.local", "/api/reports/export/fees"),
    requestAs("accountant@school.local", "/api/reports/export/results"),
    requestAs("admin@school.local", "/api/reports/export/unknown"),
    requestAs("admin@school.local", "/api/reports/export/users"),
    requestAs("admin@school.local", "/api/reports/export/%2e%2e"),
    requestAs("admin@school.local", "/api/reports/export/../../students")
  ]);

  console.log(JSON.stringify(checks, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
