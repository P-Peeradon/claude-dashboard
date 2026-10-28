import { CURRENCY, TIME_ZONE, intlLocales, type Locale } from "./config";

// Money is stored as integer cents; convert only for display.
export function formatMoney(cents: number, locale: Locale) {
  // Singapore locales render SGD as a bare "$"; show "S$" so it is unambiguous.
  return new Intl.NumberFormat(intlLocales[locale], { style: "currency", currency: CURRENCY })
    .formatToParts(cents / 100)
    .map((p) => (p.type === "currency" ? "S$" : p.value))
    .join("");
}

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocales[locale]).format(value);
}

export function formatDate(date: Date | string | number, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    dateStyle: "medium",
    timeZone: TIME_ZONE,
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | number, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(date));
}
