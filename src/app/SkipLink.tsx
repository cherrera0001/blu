"use client";

import { translate } from "@/lib/i18n";
import { useLocale } from "./LanguageControl";

export function SkipLink() {
  const locale = useLocale();
  return (
    <a className="skip-link" href="#contenido-principal">
      {translate(locale, "Saltar al contenido principal")}
    </a>
  );
}
