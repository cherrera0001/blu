import registryJson from "@/data/evidence/sources.json";
import type { HabitEducation } from "@/lib/habit-education";

// Registro de evidencia científica (BLU-1301, specs/008).
// Local y versionado: sin frontera de red. La persistencia servidor vive en la
// tabla evidence_sources de supabase/migrations/0001_owner_only.sql (V1).

export const REFERENCE_TYPES = ["doi", "pmid", "url", "guideline"] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

export type SourceStatus = "pendiente" | "aprobada" | "retirada";

export interface StatusTransition {
  from: SourceStatus;
  to: SourceStatus;
  at: string;
  by: string;
}

export interface EvidenceSource {
  id: string; // ev-AAAA-NNN
  claim: string;
  referenceType: ReferenceType;
  referenceValue: string; // persistente y resoluble
  searchedAt: string; // fecha de búsqueda (ISO)
  studyType: string;
  population: string;
  design: string;
  outcomes: string;
  magnitude: string;
  limitations: string;
  applicabilityCL: string;
  reviewedAt: string | null;
  reviewer: string | null; // persona nominada, no rol genérico
  status: SourceStatus;
  version: number;
  transitionLog: StatusTransition[]; // fecha y revisor de cada cambio de estado
}

export interface EvidenceRegistry {
  registryVersion: string;
  sources: EvidenceSource[];
}

export type ValidationResult =
  | { ok: true; source: EvidenceSource }
  | { ok: false; errors: string[] };

const ID_RE = /^ev-\d{4}-\d{3}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

/** Formato exigible de referenceValue según referenceType. */
const REFERENCE_CHECKERS: Record<ReferenceType, { test: (v: string) => boolean; hint: string }> = {
  doi: {
    test: (v) => /^10\.\d{4,9}\/\S+$/.test(v),
    hint: "DOI con prefijo 10. (ej. 10.1000/xyz)",
  },
  pmid: {
    test: (v) => /^\d{4,9}$/.test(v),
    hint: "identificador PMID numérico",
  },
  url: {
    test: (v) => {
      try {
        const u = new URL(v);
        return u.protocol === "https:" || u.protocol === "http:";
      } catch {
        return false;
      }
    },
    hint: "URL http(s) estable",
  },
  guideline: {
    test: (v) => v.trim().length >= 6 && /\d{4}/.test(v),
    hint: "organismo emisor y año (ej. OMS 2020)",
  },
};

const TEXT_FIELDS: Array<[keyof EvidenceSource, string]> = [
  ["claim", "afirmación exacta"],
  ["studyType", "tipo de estudio"],
  ["population", "población"],
  ["design", "diseño y comparador"],
  ["outcomes", "resultados"],
  ["magnitude", "magnitud e incertidumbre"],
  ["limitations", "limitaciones y riesgo de sesgo"],
  ["applicabilityCL", "aplicabilidad en Chile"],
];

export function validateEvidenceSource(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["la fuente debe ser un objeto."] };
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.id !== "string" || !ID_RE.test(r.id)) {
    errors.push("id: obligatorio con formato ev-AAAA-NNN.");
  }

  for (const [field, label] of TEXT_FIELDS) {
    const value = r[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`${String(field)}: obligatorio (${label}).`);
    }
  }

  let referenceType = r.referenceType;
  if (typeof referenceType !== "string" || !REFERENCE_TYPES.includes(referenceType as ReferenceType)) {
    errors.push(`referenceType: debe ser uno de ${REFERENCE_TYPES.join(", ")}.`);
    referenceType = undefined;
  }

  const referenceValue = r.referenceValue;
  if (typeof referenceValue !== "string" || referenceValue.trim().length === 0) {
    errors.push("referenceValue: obligatorio (referencia persistente y resoluble).");
  } else if (referenceType) {
    const checker = REFERENCE_CHECKERS[referenceType as ReferenceType];
    if (!checker.test(referenceValue.trim())) {
      errors.push(`referenceValue: formato inválido para ${referenceType} (${checker.hint}).`);
    }
  }

  if (typeof r.searchedAt !== "string" || !ISO_DATE_RE.test(r.searchedAt)) {
    errors.push("searchedAt: obligatorio con fecha ISO (AAAA-MM-DD).");
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    source: {
      id: r.id as string,
      claim: (r.claim as string).trim(),
      referenceType: referenceType as ReferenceType,
      referenceValue: (referenceValue as string).trim(),
      searchedAt: r.searchedAt as string,
      studyType: (r.studyType as string).trim(),
      population: (r.population as string).trim(),
      design: (r.design as string).trim(),
      outcomes: (r.outcomes as string).trim(),
      magnitude: (r.magnitude as string).trim(),
      limitations: (r.limitations as string).trim(),
      applicabilityCL: (r.applicabilityCL as string).trim(),
      reviewedAt: typeof r.reviewedAt === "string" ? r.reviewedAt : null,
      reviewer: typeof r.reviewer === "string" ? r.reviewer : null,
      status: "pendiente",
      version: typeof r.version === "number" ? r.version : 1,
      transitionLog: [],
    },
  };
}

const ALLOWED_TRANSITIONS: Record<SourceStatus, SourceStatus[]> = {
  pendiente: ["aprobada"],
  aprobada: ["retirada"],
  retirada: [],
};

export type TransitionResult =
  | { ok: true; source: EvidenceSource }
  | { ok: false; error: string };

/** Ciclo de vida pendiente → aprobada → retirada. Toda transición exige revisor nominado y fecha. */
export function transition(
  source: EvidenceSource,
  to: SourceStatus,
  ctx: { reviewer: string; at?: string },
): TransitionResult {
  const reviewer = ctx.reviewer.trim();
  if (!reviewer) {
    return { ok: false, error: "La transición exige una revisor nominada (persona, no rol genérico)." };
  }
  const allowed = ALLOWED_TRANSITIONS[source.status] ?? [];
  if (!allowed.includes(to)) {
    return { ok: false, error: `Transición inválida: ${source.status} → ${to}.` };
  }
  const at = ctx.at ?? new Date().toISOString();
  return {
    ok: true,
    source: {
      ...source,
      status: to,
      reviewedAt: at,
      reviewer,
      transitionLog: [...source.transitionLog, { from: source.status, to, at, by: reviewer }],
    },
  };
}

/** Deny-by-default: solo una fuente aprobada puede citarse detrás de una recomendación. */
export function isCitable(source: EvidenceSource): boolean {
  return source.status === "aprobada";
}

export interface ImportDraft {
  draft: { id: string; claim: string; sourceLabel: string };
  errors: string[];
}

export interface ImportReport {
  drafts: ImportDraft[];
  /** Borradores que ya pasan validateEvidenceSource (ninguno hoy: las etiquetas no son referencias). */
  registrable: ImportDraft[];
  /** Borradores que aún necesitan una referencia persistente. */
  pendingReference: ImportDraft[];
}

/**
 * Importación en lote desde el contenido educativo actual (specs/008).
 * Honesta: una sourceLabel humana («OMS, 2020») NO es una referencia persistente,
 * así que todo borrador queda pendiente de referencia hasta que una revisor
 * complete el DOI/PMID/URL. No se fabrican identificadores.
 */
export function importEducationLabels(education: HabitEducation, year = 2026): ImportReport {
  const labels = [
    ...new Set(education.principles.flatMap((p) => p.notes.map((n) => n.sourceLabel))),
  ];
  const drafts: ImportDraft[] = labels.map((label, i) => {
    const id = `ev-${year}-${String(i + 1).padStart(3, "0")}`;
    const candidate = {
      id,
      claim: `Afirmación educativa asociada a la fuente «${label}» (completar redacción exacta).`,
      referenceType: "url",
      referenceValue: "",
      searchedAt: `${year}-01-01`,
      studyType: "por completar",
      population: "por completar",
      design: "por completar",
      outcomes: "por completar",
      magnitude: "por completar",
      limitations: "por completar",
      applicabilityCL: "por completar",
    };
    const result = validateEvidenceSource(candidate);
    return {
      draft: { id, claim: candidate.claim, sourceLabel: label },
      errors: result.ok ? [] : result.errors,
    };
  });
  return {
    drafts,
    registrable: drafts.filter((d) => d.errors.length === 0),
    pendingReference: drafts.filter((d) => d.errors.some((e) => e.includes("referenceValue"))),
  };
}

function failRegistry(message: string): never {
  throw new Error(`Registro de evidencia inválido: ${message}`);
}

export function validateRegistry(raw: unknown): EvidenceRegistry {
  if (typeof raw !== "object" || raw === null) failRegistry("la raíz debe ser un objeto.");
  const r = raw as Record<string, unknown>;
  if (r.registryVersion !== "1") failRegistry("registryVersion debe ser \"1\".");
  if (!Array.isArray(r.sources)) failRegistry("sources debe ser una lista.");
  const ids = new Set<string>();
  const sources: EvidenceSource[] = r.sources.map((s) => {
    const result = validateEvidenceSource(s);
    if (!result.ok) failRegistry(`fuente inválida: ${result.errors.join(" ")}`);
    if (ids.has(result.source.id)) failRegistry(`id duplicado: ${result.source.id}.`);
    ids.add(result.source.id);
    if (result.source.status !== "pendiente") {
      // Una fuente empaquetada ya aprobada/retirada debe traer su historial.
      const log = (s as Record<string, unknown>).transitionLog;
      if (!Array.isArray(log) || log.length === 0) {
        failRegistry(`${result.source.id} está «${result.source.status}» sin historial de transición.`);
      }
    }
    return result.source;
  });
  return { registryVersion: "1", sources };
}

let cachedRegistry: EvidenceRegistry | null = null;

export function loadRegistry(): EvidenceRegistry {
  if (!cachedRegistry) cachedRegistry = validateRegistry(registryJson);
  return cachedRegistry;
}

export function resetRegistryCacheForTests(): void {
  cachedRegistry = null;
}
