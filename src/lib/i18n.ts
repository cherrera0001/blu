import { isLocale, type Locale } from "blu-core/i18n";

// Diccionario y `translate` viven en blu-core/i18n (compartidos con móvil).
// Aquí solo queda la preferencia de idioma del navegador.
export { isLocale, LOCALES, translate, translateWith, type Locale } from "blu-core/i18n";

const LOCALE_KEY = "blu.locale.v1";

const listeners = new Set<() => void>();

function readLocale(): Locale {
  if (typeof window === "undefined") return "es";
  try {
    const raw = window.localStorage.getItem(LOCALE_KEY);
    return isLocale(raw) ? raw : "es";
  } catch {
    return "es";
  }
}

export function getLocale(): Locale {
  return readLocale();
}

export function setLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCALE_KEY, locale);
  document.documentElement.lang = locale;
  for (const listener of listeners) listener();
}

export function subscribeLocale(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}
