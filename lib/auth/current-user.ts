import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getDefaultDashboardRoute } from "@/lib/modules/module-access";
import { getOptionalSession, getRequiredSession, type AppSession } from "@/lib/auth/session";

export async function getCurrentSession() {
  return getOptionalSession();
}

export async function requireSession() {
  return getRequiredSession();
}

export async function getCurrentUser(session?: AppSession | null) {
  const activeSession = session ?? (await getOptionalSession());
  if (!activeSession) {
    return null;
  }

  return db.user.findUnique({
    where: { id: activeSession.userId },
    include: {
      school: true,
      roles: { include: { role: true } },
      staffProfile: true,
      studentProfile: {
        include: {
          class: true,
          section: true
        }
      },
      parentProfile: true
    }
  });
}

export async function requireCurrentUser() {
  const session = await getRequiredSession();
  const user = await getCurrentUser(session);

  if (!user || !user.isActive) {
    redirect("/login");
  }

  return { session, user };
}

export async function requireAuthenticatedUser() {
  return requireCurrentUser();
}
