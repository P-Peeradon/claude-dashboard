// Shared by lib/session.ts and proxy.ts, so it must not import server-only modules.
export const SESSION_COOKIE = "lemak_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionData = { userId: string };

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters long");
  }
  return secret;
}
