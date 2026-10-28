import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getSession } from "./session";
import { defaultLocale, type Locale } from "@/i18n/config";

// Data Access Layer. The proxy only does an optimistic check, so every page and Server Action
// calls verifySession() close to the data it protects. React `cache` dedupes it per request;
// it is deliberately not a `use cache` scope, so logging out takes effect immediately.
export const verifySession = cache(async (lang: Locale = defaultLocale) => {
  const session = await getSession();
  if (!session) redirect(`/${lang}/login`);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, branchId: true },
  });
  if (!user) redirect(`/${lang}/login`);
  return user;
});
