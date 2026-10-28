import "server-only";
import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  getSessionSecret,
  type SessionData,
} from "./session-config";

export async function createSession(userId: string) {
  const sealed = await sealData({ userId } satisfies SessionData, {
    password: getSessionSecret(),
    ttl: SESSION_TTL_SECONDS,
  });
  (await cookies()).set(SESSION_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getSession(): Promise<SessionData | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const data = await unsealData<Partial<SessionData>>(value, { password: getSessionSecret() });
    return data.userId ? { userId: data.userId } : null;
  } catch {
    return null; // tampered or expired
  }
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}
