import { Suspense } from "react";
import Link from "next/link";
import { LangSwitcher } from "@/components/layout/lang-switcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/actions/auth";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { verifySession } from "@/lib/dal";

// Minimal authenticated shell. Step 7 replaces the top bar with the sidebar / mobile drawer.
export default function AppLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Suspense fallback={<Skeleton className="h-16 w-full rounded-none" />}>
        <AppHeader />
      </Suspense>
      <div className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</div>
    </div>
  );
}

// The session is read here, behind Suspense, so the rest of the layout stays in the static shell.
async function AppHeader() {
  const lang = await getLocale();
  const [dict, user] = await Promise.all([getDictionary(), verifySession(lang)]);

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 p-3 md:px-6">
        <Link href={`/${lang}/dashboard`} className="text-lg font-semibold">
          {dict.common.appName}
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <LangSwitcher lang={lang} label={dict.common.language} />
          <span className="text-sm text-muted-foreground">{user.name}</span>
          <form action={logout}>
            <input type="hidden" name="lang" value={lang} />
            <Button type="submit" variant="outline" className="h-11">
              {dict.common.signOut}
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
