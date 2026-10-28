import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utils";

export default async function NotFound() {
  const [lang, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl font-semibold text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">{dict.errors.notFound}</h1>
      <p className="text-muted-foreground">{dict.errors.notFoundBody}</p>
      <Link href={`/${lang}/dashboard`} className={cn(buttonVariants(), "h-11")}>
        {dict.errors.backToDashboard}
      </Link>
    </main>
  );
}
