import type { DayCount } from "@/lib/history";

/**
 * Mini barras de los últimos 7 días: lectura visual amable, sin rachas ni juicio.
 * Lista semántica con role="img" y etiqueta accesible por día.
 */
export function WeekBars({ days }: { days: DayCount[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <ul className="week-bars" role="list" aria-label="Acciones registradas por día, últimos 7 días">
      {days.map((day) => {
        const heightPct = Math.round((day.count / max) * 100);
        const [, month, date] = day.date.split("-");
        return (
          <li key={day.date} className="week-bar-item">
            <span
              aria-hidden="true"
              className="week-bar"
              style={{ height: `${Math.max(8, heightPct)}%` }}
              title={`${day.count}`}
            />
            <span className="visually-hidden">
              {`${date}/${month}: ${day.count} acción/es`}
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
