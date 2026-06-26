import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const encoder = new TextEncoder();

function base64UrlToUint8Array(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function base64UrlToJson<T>(value: string) {
  const bytes = base64UrlToUint8Array(value);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

async function importSessionKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

async function isValidSession(request: NextRequest) {
  const cookieName = process.env.SESSION_COOKIE_NAME ?? "school_erp_session";
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    return false;
  }

  const raw = request.cookies.get(cookieName)?.value;
  if (!raw) {
    return false;
  }

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) {
    return false;
  }

  const key = await importSessionKey(secret);
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToUint8Array(signature),
    encoder.encode(payload)
  );

  if (!isValid) {
    return false;
  }

  const session = base64UrlToJson<{
    expiresAt?: number;
  }>(payload);

  return Boolean(session.expiresAt && Date.now() < session.expiresAt);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const authenticated = await isValidSession(request);

  if (authenticated) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
