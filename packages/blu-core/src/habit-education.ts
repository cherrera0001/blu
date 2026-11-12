import educationJson from "../data/habits/education.json";

export type SourceStatus = "pendiente" | "verificada";

export interface EducationNote {
  id: string;
  title: string;
  text: string;
  sourceLabel: string;
  sourceStatus: SourceStatus;
  /** Ligadura opcional al registro de evidencia (ev-AAAA-NNN); ver specs/008. */
  evidenceId?: string;
}

export interface PrincipleEducation {
  principleId: string;
  notes: EducationNote[];
}

export interface HabitEducation {
  educationVersion: string;
  locale: string;
  disclaimer: string;
  principles: PrincipleEducation[];
}

const KNOWN_PRINCIPLES = [
  "movement", "nourishment", "rest", "family", "community", "nature", "purpose",
];

/** Afirmaciones prohibidas en contenido educativo (constitución I y VII). */
const PROHIBITED_RE =
  /(previene|prevenir|cura|curará|garantiza|elimina el riesgo|años de vida|longevidad|diagnóstico|debes tomar|dosis|recetar|reduce el riesgo de|protege contra)/i;

function fail(message: string): never {
  throw new Error(`Contenido educativo inválido: ${message}`);
}

export function validateEducation(raw: unknown): HabitEducation {
  if (typeof raw !== "object" || raw === null) fail("la raíz debe ser un objeto.");
  const root = raw as Record<string, unknown>;
  if (typeof root.educationVersion !== "string") fail("falta educationVersion.");
  if (typeof root.locale !== "string") fail("falta locale.");
  if (typeof root.disclaimer !== "string") fail("falta disclaimer.");
  if (!Array.isArray(root.principles)) fail("falta la lista de principios.");
  if (root.principles.length !== KNOWN_PRINCIPLES.length) fail("debe tener 7 principios.");

  const seen = new Set<string>();
  const principles: PrincipleEducation[] = root.principles.map((p) => {
    if (typeof p !== "object" || p === null) fail("principio mal formado.");
    const pr = p as Record<string, unknown>;
    if (typeof pr.principleId !== "string" || !KNOWN_PRINCIPLES.includes(pr.principleId)) {
      fail(`principio desconocido: «${String(pr.principleId)}».`);
    }
    if (!Array.isArray(pr.notes) || pr.notes.length < 2) {
      fail(`el principio «${pr.principleId}» debe tener al menos 2 notas educativas.`);
    }
    const notes: EducationNote[] = pr.notes.map((note) => {
      if (typeof note !== "object" || note === null) fail("nota mal formada.");
      const n = note as Record<string, unknown>;
      if (typeof n.id !== "string" || seen.has(n.id)) fail(`id duplicado o inválido: «${String(n.id)}».`);
      seen.add(n.id);
      if (typeof n.title !== "string" || n.title.length === 0) fail(`«${String(n.id)}» sin título.`);
      if (typeof n.text !== "string" || n.text.length < 30 || n.text.length > 300) {
        fail(`«${String(n.id)}» tiene un texto inválido (30–300 caracteres).`);
      }
      if (PROHIBITED_RE.test(n.text)) {
        fail(`«${String(n.id)}» contiene una afirmación prohibida (eficacia/causalidad/prescripción).`);
      }
      if (typeof n.sourceLabel !== "string" || n.sourceLabel.length === 0) {
        fail(`«${String(n.id)}» debe declarar su fuente (label).`);
      }
      if (n.sourceStatus !== "pendiente" && n.sourceStatus !== "verificada") {
        fail(`«${String(n.id)}» tiene un estado de fuente inválido.`);
      }
      if (n.evidenceId !== undefined) {
        if (typeof n.evidenceId !== "string" || !/^ev-\d{4}-\d{3}$/.test(n.evidenceId)) {
          fail(`«${String(n.id)}» tiene una ligadura de evidencia inválida (ev-AAAA-NNN).`);
        }
      }
      return {
        id: n.id,
        title: n.title,
        text: n.text,
        sourceLabel: n.sourceLabel,
        sourceStatus: n.sourceStatus as SourceStatus,
        ...(typeof n.evidenceId === "string" ? { evidenceId: n.evidenceId } : {}),
      };
    });
    return { principleId: pr.principleId, notes };
  });

  return {
    educationVersion: root.educationVersion,
    locale: root.locale,
    disclaimer: root.disclaimer,
    principles,
  };
}

let cached: HabitEducation | null = null;

export function loadEducation(): HabitEducation {
  if (!cached) cached = validateEducation(educationJson);
  return cached;
}
