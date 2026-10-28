"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { defaultLocale, hasLocale } from "@/i18n/config";
import en from "@/i18n/dictionaries/en.json";
import ms from "@/i18n/dictionaries/ms.json";
import ta from "@/i18n/dictionaries/ta.json";
import zh from "@/i18n/dictionaries/zh.json";

const messages = { en: en.errors, ms: ms.errors, zh: zh.errors, ta: ta.errors };

// Error boundary for the authenticated area. Next 16 passes `retry` (not `reset`).
export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { lang } = useParams<{ lang: string }>();
  const t = messages[hasLocale(lang) ? lang : defaultLocale];

  return (
    <div role="alert" className="flex flex-col items-start gap-4 py-10">
      <p className="text-lg font-medium">{t.generic}</p>
      <Button className="h-11" onClick={() => retry()}>
        {t.retry}
      </Button>
    </div>
  );
}
