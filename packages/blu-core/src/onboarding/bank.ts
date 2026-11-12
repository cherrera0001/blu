export type QuestionType = "single_choice" | "likert5" | "multi_choice";
export type EvidenceStatus = "pendiente" | "verificada" | "retirada";

export interface SkipIfRule {
  question: string;
  in: Array<number | string>;
}

export interface QuestionOption {
  value: number | string;
  label: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  skippable: boolean;
  options?: QuestionOption[];
  likertAnchors?: { low: string; high: string };
  countsTowardScore: boolean;
  skipIf?: SkipIfRule;
  rationale: string;
  evidence: { reference: string; status: EvidenceStatus };
}

export interface Principle {
  id: string;
  title: string;
  subtitle?: string;
  questions: Question[];
}

export interface QuestionBank {
  bankVersion: string;
  locale: string;
  disclaimer: string;
  principles: Principle[];
}

const KNOWN_PRINCIPLES = [
  "movement",
  "nourishment",
  "rest",
  "family",
  "community",
  "nature",
  "purpose",
];

const CLINICAL_TERMS =
  /diagn[oó]stic|medicaci[oó]n|medicament|pastill|dosis|receta|prescri|s[ií]ntoma|enfermedad|trastorno|tratamient|terapia|insomnio|depresi[oó]n|ansiedad|suicid|autoles|p[aá]nico/i;

const MAX_QUESTIONS_PER_PRINCIPLE = 12;
const MAX_TEXT = 400;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new Error(`Banco de preguntas inválido: ${message}`);
}

export function validateBank(raw: unknown): QuestionBank {
  if (!isRecord(raw)) fail("la raíz debe ser un objeto.");
  if (typeof raw.bankVersion !== "string" || raw.bankVersion.length === 0) fail("falta bankVersion.");
  if (typeof raw.locale !== "string") fail("falta locale.");
  if (typeof raw.disclaimer !== "string" || raw.disclaimer.length === 0) fail("falta disclaimer.");
  if (!Array.isArray(raw.principles)) fail("falta la lista de principios.");

  const principleIds = raw.principles.map((p) => (isRecord(p) ? p.id : undefined));
  for (const known of KNOWN_PRINCIPLES) {
    if (!principleIds.includes(known)) fail(`falta el principio «${known}» (se requieren 7 principios).`);
  }
  if (raw.principles.length !== KNOWN_PRINCIPLES.length) fail("debe tener exactamente 7 principios.");

  const seen = new Set<string>();
  const questionIds: string[] = [];

  const principles: Principle[] = raw.principles.map((p) => {
    if (!isRecord(p) || typeof p.id !== "string" || typeof p.title !== "string") {
      fail("cada principio necesita id y title.");
    }
    if (!Array.isArray(p.questions)) fail(`el principio «${p.id}» no tiene preguntas.`);
    if (p.questions.length < 5) fail(`el principio «${p.id}» debe tener al menos 5 preguntas.`);
    if (p.questions.length > MAX_QUESTIONS_PER_PRINCIPLE) {
      fail(`el principio «${p.id}» excede el máximo de ${MAX_QUESTIONS_PER_PRINCIPLE} preguntas.`);
    }

    const questions: Question[] = p.questions.map((q) => {
      if (!isRecord(q) || typeof q.id !== "string") fail("cada pregunta necesita un id.");
      if (seen.has(q.id)) fail(`ID de pregunta duplicado: «${q.id}».`);
      seen.add(q.id);
      questionIds.push(q.id);

      if (typeof q.text !== "string" || q.text.length === 0 || q.text.length > MAX_TEXT) {
        fail(`la pregunta «${q.id}» tiene un texto inválido.`);
      }
      if (CLINICAL_TERMS.test(q.text)) {
        fail(`la pregunta «${q.id}» contiene términos clínicos prohibidos (no es contenido de este producto).`);
      }
      if (q.type !== "single_choice" && q.type !== "likert5" && q.type !== "multi_choice") {
        fail(`la pregunta «${q.id}» tiene un tipo no soportado.`);
      }
      if (typeof q.skippable !== "boolean") fail(`la pregunta «${q.id}» debe declarar skippable.`);
      if (typeof q.rationale !== "string" || q.rationale.length === 0) {
        fail(`la pregunta «${q.id}» debe declarar su rationale.`);
      }
      if (!isRecord(q.evidence) || typeof q.evidence.reference !== "string") {
        fail(`la pregunta «${q.id}» debe declarar su evidencia.`);
      }
      const status = (q.evidence as Record<string, unknown>).status;
      if (status !== "pendiente" && status !== "verificada" && status !== "retirada") {
        fail(`la pregunta «${q.id}» tiene un estado de evidencia inválido.`);
      }

      let options: QuestionOption[] | undefined;
      if (q.type === "single_choice" || q.type === "multi_choice") {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          fail(`la pregunta «${q.id}» necesita al menos 2 alternativas.`);
        }
        const values = new Set<number | string>();
        options = q.options.map((o) => {
          if (!isRecord(o) || !("value" in o) || typeof o.label !== "string") {
            fail(`la pregunta «${q.id}» tiene una alternativa mal formada.`);
          }
          const value = o.value as number | string;
          if (values.has(value)) fail(`la pregunta «${q.id}» tiene valores de alternativa duplicados.`);
          values.add(value);
          if (CLINICAL_TERMS.test(o.label)) {
            fail(`la pregunta «${q.id}» tiene una alternativa con términos clínicos prohibidos.`);
          }
          return { value, label: o.label };
        });
      }

      let likertAnchors: { low: string; high: string } | undefined;
      if (q.type === "likert5") {
        if (!isRecord(q.likertAnchors) || typeof q.likertAnchors.low !== "string" || typeof q.likertAnchors.high !== "string") {
          fail(`la pregunta «${q.id}» (likert5) requiere likertAnchors con low y high.`);
        }
        likertAnchors = { low: q.likertAnchors.low, high: q.likertAnchors.high };
      }

      let skipIf: SkipIfRule | undefined;
      if (q.skipIf !== undefined) {
        if (!isRecord(q.skipIf) || typeof q.skipIf.question !== "string" || !Array.isArray(q.skipIf.in) || q.skipIf.in.length === 0) {
          fail(`la pregunta «${q.id}» tiene un skipIf mal formado.`);
        }
        skipIf = { question: q.skipIf.question, in: q.skipIf.in as Array<number | string> };
      }

      return {
        id: q.id,
        type: q.type,
        text: q.text,
        skippable: q.skippable,
        options,
        likertAnchors,
        countsTowardScore: q.countsTowardScore === false ? false : q.type !== "multi_choice",
        skipIf,
        rationale: q.rationale,
        evidence: { reference: q.evidence.reference, status: status as EvidenceStatus },
      };
    });

    return {
      id: p.id,
      title: p.title,
      subtitle: typeof p.subtitle === "string" ? p.subtitle : undefined,
      questions,
    };
  });

  // skipIf: referencias existentes y aciclicidad
  const idSet = new Set(questionIds);
  for (const p of principles) {
    for (const q of p.questions) {
      if (q.skipIf && !idSet.has(q.skipIf.question)) {
        fail(`el skipIf de «${q.id}» referencia una pregunta inexistente («${q.skipIf.question}»).`);
      }
    }
  }
  const adjacency = new Map<string, string[]>();
  for (const p of principles) {
    for (const q of p.questions) {
      if (q.skipIf) adjacency.set(q.id, [q.skipIf.question]);
    }
  }
  const visiting = new Set<string>();
  const done = new Set<string>();
  function visit(id: string): void {
    if (done.has(id)) return;
    if (visiting.has(id)) fail(`hay un ciclo de skipIf que involucra «${id}».`);
    visiting.add(id);
    for (const next of adjacency.get(id) ?? []) visit(next);
    visiting.delete(id);
    done.add(id);
  }
  for (const id of questionIds) visit(id);

  return {
    bankVersion: raw.bankVersion,
    locale: raw.locale,
    disclaimer: raw.disclaimer,
    principles,
  };
}
