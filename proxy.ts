import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { unsealData } from "iron-session";
import { LOCALE_COOKIE, defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { SESSION_COOKIE, getSessionSecret, type SessionData } from "@/lib/session-config";

// Picks the best supported locale from an Accept-Language header, e.g. "zh-CN,zh;q=0.9,en;q=0.8".
function fromAcceptLanguage(header: string | null): Locale | undefined {
  if (!header) return undefined;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { base: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((l) => l.base && !Number.isNaN(l.q) && l.q > 0)
    .sort((a, b) => b.q - a.q);
  return ranked.map((l) => l.base).find(hasLocale);
}

function getLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && hasLocale(cookie)) return cookie;
  return fromAcceptLanguage(request.headers.get("accept-language")) ?? defaultLocale;
}

async function hasValidSession(request: NextRequest) {
  const value = request.cookies.get(SESSION_COOKIE)?.value;
  if (!value) return false;
  try {
    const data = await unsealData<Partial<SessionData>>(value, { password: getSessionSecret() });
    return Boolean(data.userId);
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/");
  const lang = segments[1];

  if (!hasLocale(lang)) {
    // No locale in the path: redirect to /{locale}/...
    const url = request.nextUrl.clone();
    url.pathname = `/${getLocale(request)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // Optimistic auth check only. Pages and Server Actions re-verify via lib/dal.ts.
  const isLogin = segments[2] === "login" && segments.length <= 4;
  const authed = await hasValidSession(request);

  if (!authed && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = `/${lang}/login`;
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (authed && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = `/${lang}/dashboard`;
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals and any path with a file extension (favicon, images, ...).
  matcher: ["/((?!_next|.*\\..*).*)"],
};
