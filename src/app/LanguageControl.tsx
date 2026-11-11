"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getLocale, isLocale, LOCALES, setLocale, subscribeLocale, translate, type Locale } from "@/lib/i18n";

const LOCALE_LABEL: Record<Locale, string> = {
  es: "Español",
  "en-US": "English",
  "pt-BR": "Português (Brasil)",
  "pt-PT": "Português",
  "zh-CN": "中文",
};

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, () => "es" as Locale);
}

export function LanguageControl({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    const meta = document.querySelector('meta[name="description"]');
    if (!meta) return;
    if (!meta.getAttribute("data-source")) {
      meta.setAttribute("data-source", meta.getAttribute("content") ?? "");
    }
    const source = meta.getAttribute("data-source") ?? "";
    if (source) meta.setAttribute("content", translate(locale, source));
  }, [locale]);

  return (
    <label className="language-select">
      <span className="visually-hidden">{translate(locale, "Idioma")}</span>
      <select
        aria-label={translate(locale, "Idioma")}
        onChange={(event) => {
          const next = event.target.value;
          if (isLocale(next)) setLocale(next);
        }}
        value={locale}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABEL[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
