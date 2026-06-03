import crypto from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "wc_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || "dev-only-change-me";
}

function sign(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

/** Constant-time-ish admin password check. */
export function checkPassword(pw: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD || "changeme";
  return typeof pw === "string" && pw.length > 0 && pw === expected;
}

/** Stateless signed token: `admin.<exp>.<hmac>`. */
export function createSessionToken(): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `admin.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, exp, sig] = parts;
  if (role !== "admin") return false;
  if (sign(`${role}.${exp}`) !== sig) return false;
  return Number(exp) > Math.floor(Date.now() / 1000);
}

export const SESSION_MAX_AGE = MAX_AGE;

/** Read the admin session cookie (server components / route handlers). */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
