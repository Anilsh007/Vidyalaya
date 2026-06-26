import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

const encoder = new TextEncoder();

export type AppSession = {
  userId: string;
  schoolId: string;
  roles: string[];
  permissions: string[];
  expiresAt: number;
};

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

async function importSessionKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signPayload(payload: string) {
  const key = await importSessionKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Buffer.from(signature).toString("base64url");
}

async function verifySignature(payload: string, signature: string) {
  const key = await importSessionKey();
  return crypto.subtle.verify(
    "HMAC",
    key,
    Buffer.from(signature, "base64url"),
    encoder.encode(payload)
  );
}

export async function createSessionCookieValue(session: AppSession) {
  const payload = toBase64Url(JSON.stringify(session));
  const signature = await signPayload(payload);
  return `${payload}.${signature}`;
}

export async function parseSessionCookie(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return null;
  }

  const valid = await verifySignature(payload, signature);

  if (!valid) {
    return null;
  }

  const session = fromBase64Url<AppSession>(payload);
  if (Date.now() > session.expiresAt) {
    return null;
  }

  return session;
}

export async function createUserSession(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      school: true,
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

  const session: AppSession = {
    userId: user.id,
    schoolId: user.schoolId,
    roles,
    permissions,
    expiresAt: Date.now() + 1000 * 60 * 60 * 10
  };

  return session;
}

export async function saveSession(session: AppSession) {
  const cookieStore = await cookies();
  const secureCookie = env.APP_URL.startsWith("https://");
  cookieStore.set(env.SESSION_COOKIE_NAME, await createSessionCookieValue(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    expires: new Date(session.expiresAt)
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(env.SESSION_COOKIE_NAME);
}

export async function getOptionalSession() {
  const cookieStore = await cookies();
  return parseSessionCookie(cookieStore.get(env.SESSION_COOKIE_NAME)?.value);
}

export async function getRequiredSession() {
  const session = await getOptionalSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
