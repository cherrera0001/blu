// Exportación de métricas para investigación (BLU-1203).
// Dataset agregado, opt-in por consentimiento «investigacion», con k-anonimato
// mínimo y guard anti-reidentificación. Uso REAL gated por el protocolo de
// EPIC-16 (DoR del issue); este módulo entrega el mecanismo verificable local.

export interface ParticipantMetrics {
  /** Seudónimo opaco (hash aleatorio); nunca correo, nombre ni identificador directo. */
  participantKey: string;
  /** Semana ISO (YYYY-Www): la granularidad máxima permitida. */
  week: string;
  habitId: string;
  checkInsDone: number;
  checkInsTotal: number;
  /** Conteo agregado de retroalimentación «no útil» (BLU-1104). */
  feedbackNotUseful: number;
}

export interface AggregatedRow {
  week: string;
  habitId: string;
  participants: number;
  checkInsDone: number;
  checkInsTotal: number;
  feedbackNotUseful: number;
}

export interface ResearchDataset {
  datasetVersion: "1";
  generatedAt: string;
  k: number;
  rows: AggregatedRow[];
  suppressedCells: number;
  includedParticipants: number;
  excludedNoConsent: number;
}

const WEEK_RE = /^\d{4}-W\d{2}$/;

/**
 * Construye el dataset de investigación:
 * 1. Filtra solo personas con consentimiento «investigacion» (callback).
 * 2. Agrega por semana × hábito (conteos; las filas no llevan participantKey).
 * 3. Suprime celdas con menos de k participantes (k-anonimato mínimo).
 */
export function buildResearchDataset(
  inputs: ReadonlyArray<ParticipantMetrics>,
  hasResearchConsent: (participantKey: string) => boolean,
  opts: { k?: number; generatedAt: string },
): ResearchDataset {
  const k = opts.k ?? 5;
  const consented = inputs.filter((m) => {
    if (typeof m.participantKey !== "string" || m.participantKey.length === 0) return false;
    if (!WEEK_RE.test(m.week)) return false;
    return hasResearchConsent(m.participantKey);
  });
  const excludedNoConsent = inputs.length - consented.length;

  const cells = new Map<string, { week: string; habitId: string; participants: number; checkInsDone: number; checkInsTotal: number; feedbackNotUseful: number }>();
  for (const m of consented) {
    const key = `${m.week}|${m.habitId}`;
    const cell = cells.get(key) ?? {
      week: m.week,
      habitId: m.habitId,
      participants: 0,
      checkInsDone: 0,
      checkInsTotal: 0,
      feedbackNotUseful: 0,
    };
    cell.participants += 1;
    cell.checkInsDone += m.checkInsDone;
    cell.checkInsTotal += m.checkInsTotal;
    cell.feedbackNotUseful += m.feedbackNotUseful;
    cells.set(key, cell);
  }

  const rows: AggregatedRow[] = [];
  let suppressedCells = 0;
  for (const cell of cells.values()) {
    if (cell.participants < k) {
      suppressedCells += 1;
      continue;
    }
    rows.push(cell);
  }
  rows.sort((a, b) => a.week.localeCompare(b.week) || a.habitId.localeCompare(b.habitId));

  return {
    datasetVersion: "1",
    generatedAt: opts.generatedAt,
    k,
    rows,
    suppressedCells,
    includedParticipants: consented.length,
    excludedNoConsent,
  };
}

/** Campos que permitirían reidentificación directa; su presencia invalida el bundle. */
const DIRECT_IDENTIFIER_KEYS =
  /^(email|e-mail|mail|name|nombre|fullname|rut|phone|telefono|tel|celular|ip|ipaddress|deviceid|device|address|direccion|birthdate|fecha_nacimiento)$/i;

/** Escaneo recursivo: ninguna clave del bundle puede ser un identificador directo. */
export function assertNoDirectIdentifiers(bundle: unknown): boolean {
  if (typeof bundle !== "object" || bundle === null) return false;
  if (Array.isArray(bundle)) return bundle.every(assertNoDirectIdentifiers);
  for (const [key, value] of Object.entries(bundle)) {
    if (DIRECT_IDENTIFIER_KEYS.test(key)) return false;
    if (typeof value === "object" && value !== null && !assertNoDirectIdentifiers(value)) {
      return false;
    }
  }
  return true;
}
