export const locales = ["en", "ms", "zh", "ta"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

// Native names, shown in the language switcher.
export const localeLabels: Record<Locale, string> = {
  en: "English",
  ms: "Bahasa Melayu",
  zh: "中文",
  ta: "தமிழ்",
};

// Regional locales used for Intl number/date formatting (Singapore).
export const intlLocales: Record<Locale, string> = {
  en: "en-SG",
  ms: "ms-SG",
  zh: "zh-SG",
  ta: "ta-SG",
};

export const TIME_ZONE = "Asia/Singapore";
export const CURRENCY = "SGD";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);
