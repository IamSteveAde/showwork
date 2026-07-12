import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET!;
const SESSION_COOKIE = "spotlite_session";

// ── Password hashing (for creator accounts AND project passwords) ──
export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

// ── Session management for creators (dashboard login) ──
export function createSessionToken(creatorId: string) {
  return jwt.sign({ creatorId }, JWT_SECRET, { expiresIn: "30d" });
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Reads the session cookie and returns the logged-in Creator, or null.
 * Use this at the top of any server component/route that needs auth.
 */
export async function getCurrentCreator() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { creatorId: string };
    const creator = await db.creator.findUnique({
      where: { id: payload.creatorId },
    });
    return creator;
  } catch {
    return null; // invalid/expired token
  }
}
