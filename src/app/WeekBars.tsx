import type { DayCount } from "@/lib/history";
import { translate, type Locale } from "@/lib/i18n";

/**
 * Mini barras de los últimos 7 días: lectura visual amable, sin rachas ni juicio.
 * Lista semántica con role="img" y etiqueta accesible por día.
 */
export function WeekBars({ days, locale }: { days: DayCount[]; locale: Locale }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <ul className="week-bars" role="list" aria-label={translate(locale, "Acciones registradas por día, últimos 7 días")}>
      {days.map((day) => {
        const heightPct = Math.round((day.count / max) * 100);
        const [, month, date] = day.date.split("-");
        const unit = translate(locale, day.count === 1 ? "paso" : "pasos");
        const label = translate(locale, "{date}: {n} {unit}")
          .replace("{date}", `${date}/${month}`)
          .replace("{n}", String(day.count))
          .replace("{unit}", unit);
        return (
          <li key={day.date} className="week-bar-item">
            <span
              aria-hidden="true"
              className="week-bar"
              style={{ height: `${Math.max(8, heightPct)}%` }}
              title={`${day.count}`}
            />
            <span className="visually-hidden">
              {label}
            </span>
            <span className="tiny-note" aria-hidden="true">
              {date}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
