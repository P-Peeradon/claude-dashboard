import { LangSwitcher } from "@/components/layout/lang-switcher";
import { formatDateTime, formatMoney } from "@/i18n/format";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";

// Placeholder home page for step 3. Step 4 redirects this to the dashboard.
export default async function Home() {
  const [lang, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">{dict.home.welcome}</h1>
        <p className="mt-2 text-muted-foreground">{dict.home.tagline}</p>
      </div>
      <LangSwitcher lang={lang} label={dict.common.language} />
      <p className="text-sm text-muted-foreground">
        {formatMoney(123456, lang)} · {formatDateTime("2026-10-28T08:30:00Z", lang)}
      </p>
    </main>
  );
}
