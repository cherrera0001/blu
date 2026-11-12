import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "blu-core/i18n";
import { makeT, type Translate } from "./i18n-core";

export interface I18n {
  locale: Locale;
  t: Translate;
}

export const I18nContext = createContext<I18n>({ locale: "es", t: makeT("es") });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, t: makeT(locale) }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
