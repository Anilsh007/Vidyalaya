import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  createSignedSessionCookieValue,
  SESSION_TTL_MS,
  verifySignedSessionCookieValue
} from "@/lib/auth/security";

export type AppSession = {
  userId: string;
  schoolId: string;
  roles: string[];
  permissions: string[];
  expiresAt: number;
};

async function buildUserSession(userId: string, expiresAt?: number) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!user || !user.isActive) {
    return null;
  }

  const roles = user.roles.map((entry) => entry.role.code);
  const permissions = Array.from(
    new Set(
      user.roles.flatMap((entry) =>
        entry.role.permissions.map((permission) => permission.permission.code)
      )
    )
  );

  return {
    userId: user.id,
    schoolId: user.schoolId,
    roles,
    permissions,
    expiresAt: expiresAt ?? Date.now() + SESSION_TTL_MS
  } satisfies AppSession;
}

async function hydrateSession(session: AppSession) {
  return buildUserSession(session.userId, session.expiresAt);
}

export async function createSessionCookieValue(session: AppSession) {
  return createSignedSessionCookieValue(session, env.SESSION_SECRET);
}

export async function parseSessionCookie(value: string | undefined) {
  return verifySignedSessionCookieValue<AppSession>(value, env.SESSION_SECRET);
}

export async function createUserSession(userId: string) {
  return buildUserSession(userId);
}

function shouldUseSecureSessionCookie() {
  return new URL(env.APP_URL).protocol === "https:";
}

export async function saveSession(session: AppSession) {
  const cookieStore = await cookies();
  const maxAge = Math.floor((session.expiresAt - Date.now()) / 1000);
  cookieStore.set(env.SESSION_COOKIE_NAME, await createSessionCookieValue(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureSessionCookie(),
    path: "/",
    maxAge,
    expires: new Date(session.expiresAt)
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(env.SESSION_COOKIE_NAME);
}

export async function createSessionCookie(session: AppSession) {
  await saveSession(session);
}

export async function clearSessionCookie() {
  await clearSession();
}

export async function verifySessionCookie(value: string | undefined) {
  return parseSessionCookie(value);
}

export async function getOptionalSession() {
  const cookieStore = await cookies();
  const parsed = await parseSessionCookie(cookieStore.get(env.SESSION_COOKIE_NAME)?.value);

  if (!parsed) {
    return null;
  }

  return hydrateSession(parsed);
}

export async function getRequiredSession() {
  const session = await getOptionalSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function getCurrentSession() {
  return getOptionalSession();
}

export async function requireSession() {
  return getRequiredSession();
}

export async function createUserSessionPayload(userId: string) {
  return createUserSession(userId);
}

export async function logout() {
  await clearSessionCookie();
}
