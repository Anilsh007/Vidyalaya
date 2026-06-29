import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.";

export function validatePasswordPolicy(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return PASSWORD_POLICY_MESSAGE;
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return PASSWORD_POLICY_MESSAGE;
  }

  return null;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, storedKey] = storedHash.split(":");

  if (!salt || !storedKey) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  return timingSafeEqual(derivedKey, Buffer.from(storedKey, "hex"));
}
