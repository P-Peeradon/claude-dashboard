import { Suspense } from "react";
import Link from "next/link";
import { logout } from "@/actions/auth";
import { LangSwitcher } from "@/components/layout/lang-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/config";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { verifySession } from "@/lib/dal";

// Authenticated shell: a fixed sidebar from `md` up, a top bar with a drawer below it.
// Nothing here reads the session except <UserBox>, which streams in behind its own Suspense
// boundary, so the shell itself stays in the static prerender.
export default async function AppLayout({ children }: LayoutProps<"/[lang]">) {
  const [lang, dict] = await Promise.all([getLocale(), getDictionary()]);

  const items = [
    { key: "dashboard", label: dict.nav.dashboard },
    { key: "orders", label: dict.nav.orders },
    { key: "newOrder", label: dict.nav.newOrder },
  ] as const;

  // Rendered twice (desktop sidebar and mobile drawer), so build it once as a function.
  const menu = () => (
    <>
      {/* usePathname() in these client components is runtime data, so each sits behind Suspense. */}
      <Suspense fallback={<Skeleton className="h-36 w-full" />}>
        <SidebarNav lang={lang} items={[...items]} />
      </Suspense>
      <div className="mt-auto flex flex-col gap-3">
        <Suspense fallback={<Skeleton className="h-11 w-full" />}>
          <LangSwitcher lang={lang} label={dict.common.language} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-24 w-full" />}>
          <UserBox lang={lang} signOut={dict.common.signOut} />
        </Suspense>
      </div>
    </>
  );

  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r bg-card p-4 md:flex">
        <Link href={`/${lang}/dashboard`} className="px-3 text-lg font-semibold">
          {dict.common.appName}
        </Link>
        {menu()}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-card p-3 md:hidden">
          <Suspense fallback={<Skeleton className="size-11" />}>
            <MobileNav title={dict.common.appName} menuLabel={dict.common.menu}>
              {menu()}
            </MobileNav>
          </Suspense>
          <Link href={`/${lang}/dashboard`} className="text-lg font-semibold">
            {dict.common.appName}
          </Link>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

async function UserBox({ lang, signOut }: { lang: Locale; signOut: string }) {
  const user = await verifySession(lang);
  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <div className="px-1">
        <div className="truncate text-sm font-medium">{user.name}</div>
        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
      </div>
      <form action={logout}>
        <input type="hidden" name="lang" value={lang} />
        <Button type="submit" variant="outline" className="h-11 w-full">
          {signOut}
        </Button>
      </form>
    </div>
  );
}
