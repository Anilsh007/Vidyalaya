const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const SESSION_TTL_MS = 1000 * 60 * 60 * 10;
export const SESSION_PATH_HEADER = "x-erp-pathname";

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function importSessionKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSessionPayload(payload: string, secret: string) {
  const key = await importSessionKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function verifySessionPayload(payload: string, signature: string, secret: string) {
  const key = await importSessionKey(secret);
  return crypto.subtle.verify("HMAC", key, base64UrlToBytes(signature), encoder.encode(payload));
}

export function encodeSessionPayload<T>(value: T) {
  return bytesToBase64Url(encoder.encode(JSON.stringify(value)));
}

export function decodeSessionPayload<T>(value: string) {
  return JSON.parse(decoder.decode(base64UrlToBytes(value))) as T;
}

export async function createSignedSessionCookieValue<T>(value: T, secret: string) {
  const payload = encodeSessionPayload(value);
  const signature = await signSessionPayload(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifySignedSessionCookieValue<T extends { expiresAt: number }>(
  value: string | undefined,
  secret: string
) {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return null;
  }

  const isValid = await verifySessionPayload(payload, signature, secret);
  if (!isValid) {
    return null;
  }

  const session = decodeSessionPayload<T>(payload);
  if (Date.now() > session.expiresAt) {
    return null;
  }

  return session;
}

