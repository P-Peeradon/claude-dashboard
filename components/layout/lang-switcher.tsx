"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALE_COOKIE, localeLabels, locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

// Swaps the leading /{locale} segment of the current path for another locale.
function swapLocale(pathname: string, next: Locale) {
  const rest = pathname.split("/").slice(2).join("/");
  return `/${next}${rest ? `/${rest}` : ""}`;
}

export function LangSwitcher({ lang, label }: { lang: Locale; label: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="flex flex-wrap gap-1">
      {locales.map((l) => (
        <Link
          key={l}
          href={swapLocale(pathname, l)}
          hrefLang={l}
          lang={l}
          aria-current={l === lang ? "true" : undefined}
          onClick={() => {
            document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
          }}
          className={cn(
            "inline-flex min-h-11 items-center rounded-md px-3 text-sm transition-colors",
            l === lang ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          {localeLabels[l]}
        </Link>
      ))}
    </nav>
  );
}
