import { translateWith, type Locale } from "blu-core/i18n";

/**
 * Traducción en la app (BLU-1504). Castellano es la clave; las variables
 * `{nombre}` se rellenan después de traducir. Módulo puro: testeable sin RN.
 */
export type Translate = (source: string, vars?: Record<string, string | number>) => string;

export function makeT(locale: Locale): Translate {
  return (source, vars) => translateWith(locale, source, vars);
}

/** Castellano por defecto para funciones puras llamadas sin idioma (tests, logs). */
export const esT: Translate = makeT("es");

/** Etiqueta del idioma del teléfono; Hermes expone Intl. */
export function deviceLocaleTag(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return "es";
  }
}

/** Idioma para la voz local del teléfono (expo-speech). */
export const SPEECH_LANG: Record<Locale, string> = {
  es: "es-ES",
  "en-US": "en-US",
  "pt-BR": "pt-BR",
  "pt-PT": "pt-PT",
  "zh-CN": "zh-CN",
};
