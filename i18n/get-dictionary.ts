import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "./config";

const dictionaries = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  ms: () => import("./dictionaries/ms.json").then((m) => m.default),
  zh: () => import("./dictionaries/zh.json").then((m) => m.default),
  ta: () => import("./dictionaries/ta.json").then((m) => m.default),
};

// en.json is the source of truth; the other dictionaries must have the same keys.
export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["en"]>>;

// Server Components only. Reads the locale from the [lang] root param.
export async function getLocale(): Promise<Locale> {
  const locale = await lang();
  if (!hasLocale(locale)) notFound();
  return locale;
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()]();
}

// For code that already has the locale (e.g. Server Actions, where root params are unavailable).
export async function getDictionaryFor(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
