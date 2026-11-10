import type { ResearchDataset } from "./export";

// Pipeline de análisis reproducible (BLU-1603): datos consentidos y agregados
// (BLU-1203) → tablas descriptivas deterministas → informe markdown. Sin pasos
// manuales, sin RNG, sin PII: las celdas ya pasaron el k-anonimato en la
// exportación. Los contrastes de hipótesis (H1) se preespecifican en
// docs/research/preespecificacion-blu-h1.md y se agregan aquí solo con nota
// fechada (BLU-1602/1604).

const Z95 = 1.9599639855403086; // normal estándar, 97.5 %

/** Intervalo de Wilson (95 %) para una proporción: determinista y estable en extremos. */
export function wilsonInterval(done: number, total: number): [number, number] {
  if (total <= 0) return [0, 0];
  const p = done / total;
  const z2 = Z95 * Z95;
  const denom = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denom;
  const half = (Z95 * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denom;
  const clamp = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 1e12) / 1e12;
  return [clamp(center - half), clamp(center + half)];
}

export interface WeeklyAdherence {
  week: string;
  participants: number;
  checkInsDone: number;
  checkInsTotal: number;
  adherence: number;
  adherenceLo: number;
  adherenceHi: number;
}

export interface HabitAdherence {
  habitId: string;
  participants: number;
  checkInsDone: number;
  checkInsTotal: number;
  adherence: number;
  adherenceLo: number;
  adherenceHi: number;
}

export interface PilotAnalysis {
  schemaVersion: "1";
  overall: {
    k: number;
    rows: number;
    suppressedCells: number;
    includedParticipants: number;
    excludedNoConsent: number;
    checkInsDone: number;
    checkInsTotal: number;
    adherence: number | null;
    adherenceLo: number | null;
    adherenceHi: number | null;
  };
  adherenceByWeek: WeeklyAdherence[];
  adherenceByHabit: HabitAdherence[];
  participantsByWeek: Array<{ week: string; participants: number }>;
  toMarkdown: () => string;
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

export function runAnalysis(dataset: ResearchDataset): PilotAnalysis {
  const done = dataset.rows.reduce((s, r) => s + r.checkInsDone, 0);
  const total = dataset.rows.reduce((s, r) => s + r.checkInsTotal, 0);
  const [lo, hi] = total > 0 ? wilsonInterval(done, total) : [0, 0];

  const byWeek = new Map<string, { participants: number; done: number; total: number }>();
  const byHabit = new Map<string, { participants: number; done: number; total: number }>();
  for (const r of dataset.rows) {
    const w = byWeek.get(r.week) ?? { participants: 0, done: 0, total: 0 };
    w.participants += r.participants;
    w.done += r.checkInsDone;
    w.total += r.checkInsTotal;
    byWeek.set(r.week, w);
    const h = byHabit.get(r.habitId) ?? { participants: 0, done: 0, total: 0 };
    h.participants += r.participants;
    h.done += r.checkInsDone;
    h.total += r.checkInsTotal;
    byHabit.set(r.habitId, h);
  }

  const adherenceByWeek: WeeklyAdherence[] = [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => {
      const [wlo, whi] = wilsonInterval(v.done, v.total);
      return {
        week,
        participants: v.participants,
        checkInsDone: v.done,
        checkInsTotal: v.total,
        adherence: round4(v.total > 0 ? v.done / v.total : 0),
        adherenceLo: round4(wlo),
        adherenceHi: round4(whi),
      };
    });

  const adherenceByHabit: HabitAdherence[] = [...byHabit.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([habitId, v]) => {
      const [hlo, hhi] = wilsonInterval(v.done, v.total);
      return {
        habitId,
        participants: v.participants,
        checkInsDone: v.done,
        checkInsTotal: v.total,
        adherence: round4(v.total > 0 ? v.done / v.total : 0),
        adherenceLo: round4(hlo),
        adherenceHi: round4(hhi),
      };
    });

  const participantsByWeek = [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({ week, participants: v.participants }));

  const overall = {
    k: dataset.k,
    rows: dataset.rows.length,
    suppressedCells: dataset.suppressedCells,
    includedParticipants: dataset.includedParticipants,
    excludedNoConsent: dataset.excludedNoConsent,
    checkInsDone: done,
    checkInsTotal: total,
    adherence: total > 0 ? round4(done / total) : null,
    adherenceLo: total > 0 ? round4(lo) : null,
    adherenceHi: total > 0 ? round4(hi) : null,
  };

  return {
    schemaVersion: "1",
    overall,
    adherenceByWeek,
    adherenceByHabit,
    participantsByWeek,
    toMarkdown: () => renderMarkdown(overall, adherenceByWeek, adherenceByHabit, participantsByWeek),
  };
}

function pct(n: number | null): string {
  return n === null ? "—" : `${(n * 100).toFixed(1)} %`;
}

function renderMarkdown(
  overall: PilotAnalysis["overall"],
  byWeek: WeeklyAdherence[],
  byHabit: HabitAdherence[],
  participantsByWeek: Array<{ week: string; participants: number }>,
): string {
  const lines: string[] = [
    "# Informe descriptivo del piloto",
    "",
    "Análisis agregado con k-anonimato mínimo; sin datos individuales.",
    `k = ${overall.k} · celdas suprimidas: ${overall.suppressedCells} · excluidas sin consentimiento: ${overall.excludedNoConsent}`,
    "",
    "## Adherencia global",
    "",
  ];
  if (overall.adherence === null) {
    lines.push("sin datos suficientes (dataset vacío o todo suprimido).");
  } else {
    lines.push(
      `- Check-ins: ${overall.checkInsDone}/${overall.checkInsTotal}`,
      `- Adherencia: ${pct(overall.adherence)} (IC 95 %: ${pct(overall.adherenceLo)} – ${pct(overall.adherenceHi)})`,
    );
  }
  lines.push("", "## Adherencia por semana", "", "| Semana | Participantes | Check-ins | Adherencia (IC 95 %) |", "|---|---|---|---|");
  for (const r of byWeek) {
    lines.push(`| ${r.week} | ${r.participants} | ${r.checkInsDone}/${r.checkInsTotal} | ${pct(r.adherence)} (${pct(r.adherenceLo)}–${pct(r.adherenceHi)}) |`);
  }
  lines.push("", "## Adherencia por hábito", "", "| Hábito | Participantes | Check-ins | Adherencia (IC 95 %) |", "|---|---|---|---|");
  for (const r of byHabit) {
    lines.push(`| ${r.habitId} | ${r.participants} | ${r.checkInsDone}/${r.checkInsTotal} | ${pct(r.adherence)} (${pct(r.adherenceLo)}–${pct(r.adherenceHi)}) |`);
  }
  lines.push("", "## Participación por semana", "", "| Semana | Participantes |", "|---|---|");
  for (const r of participantsByWeek) {
    lines.push(`| ${r.week} | ${r.participants} |`);
  }
  lines.push(
    "",
    "## Notas",
    "",
    "- Métricas descriptivas; ninguna afirmación de eficacia en salud.",
    "- Cambios de análisis solo con nota fechada (BLU-1602) y bajo la política de publicación de nulos (BLU-1604).",
    "",
  );
  return lines.join("\n");
}

/**
 * Dataset sintético de ejemplo (BLU-1603: «datos sintéticos de ejemplo»).
 * Generado por código determinista; no describe personas reales.
 */
export function syntheticPilotDataset(): ResearchDataset {
  const rows = [];
  for (let w = 1; w <= 8; w += 1) {
    const week = `2026-W${String(40 + w).padStart(2, "0")}`;
    for (const habitId of ["movement", "rest"]) {
      // 12 participantes sintéticos por celda; adherencia decreciente leve en el tiempo.
      const participants = 12;
      const checkInsTotal = participants * 7;
      const base = habitId === "movement" ? 0.62 : 0.55;
      const adherence = Math.max(0.2, base - w * 0.01);
      rows.push({
        week,
        habitId,
        participants,
        checkInsDone: Math.round(checkInsTotal * adherence),
        checkInsTotal,
        feedbackNotUseful: habitId === "movement" && w > 5 ? 3 : 1,
      });
    }
  }
  return {
    datasetVersion: "1",
    generatedAt: "2026-11-06T00:00:00.000Z",
    k: 5,
    rows,
    suppressedCells: 0,
    includedParticipants: 96,
    excludedNoConsent: 0,
  };
}
