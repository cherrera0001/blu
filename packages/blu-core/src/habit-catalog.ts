import catalogJson from "../data/habits/catalog.json";

export type CatalogBarrier = "time" | "energy" | "remembering" | "other";

export interface CatalogItem {
  id: string;
  title: string;
  action: string;
  smallerAction: string;
  barriers: CatalogBarrier[];
}

export interface PrincipleCatalog {
  principleId: string;
  items: CatalogItem[];
}

export interface HabitCatalog {
  catalogVersion: string;
  locale: string;
  disclaimer: string;
  principles: PrincipleCatalog[];
}

const KNOWN_PRINCIPLES = [
  "movement", "nourishment", "rest", "family", "community", "nature", "purpose",
];
const BARRIERS: CatalogBarrier[] = ["time", "energy", "remembering", "other"];
const CLINICAL_RE =
  /diagn[oó]stic|medicaci[oó]n|medicament|pastill|dosis|receta|prescri|s[ií]ntoma|enfermedad|trastorno|tratamient|insomnio|depresi[oó]n|ansiedad|suicid|autoles|p[aá]nico/i;

function fail(message: string): never {
  throw new Error(`Catálogo de hábitos inválido: ${message}`);
}

export function validateCatalog(raw: unknown): HabitCatalog {
  if (typeof raw !== "object" || raw === null) fail("la raíz debe ser un objeto.");
  const root = raw as Record<string, unknown>;
  if (typeof root.catalogVersion !== "string") fail("falta catalogVersion.");
  if (typeof root.locale !== "string") fail("falta locale.");
  if (typeof root.disclaimer !== "string") fail("falta disclaimer.");
  if (!Array.isArray(root.principles)) fail("falta la lista de principios.");
  if (root.principles.length !== KNOWN_PRINCIPLES.length) fail("debe tener 7 principios.");

  const seen = new Set<string>();
  const principles: PrincipleCatalog[] = root.principles.map((p) => {
    if (typeof p !== "object" || p === null) fail("principio mal formado.");
    const pr = p as Record<string, unknown>;
    if (typeof pr.principleId !== "string" || !KNOWN_PRINCIPLES.includes(pr.principleId)) {
      fail(`principio desconocido: «${String(pr.principleId)}».`);
    }
    if (!Array.isArray(pr.items) || pr.items.length < 3) {
      fail(`el principio «${pr.principleId}» debe tener al menos 3 microhábitos.`);
    }
    const items: CatalogItem[] = pr.items.map((item) => {
      if (typeof item !== "object" || item === null) fail("microhábito mal formado.");
      const it = item as Record<string, unknown>;
      if (typeof it.id !== "string" || seen.has(it.id)) fail(`id duplicado o inválido: «${String(it.id)}».`);
      seen.add(it.id);
      if (typeof it.title !== "string" || it.title.length === 0) fail(`«${String(it.id)}» sin título.`);
      if (typeof it.action !== "string" || it.action.length < 8 || it.action.length > 160) {
        fail(`«${String(it.id)}» tiene una acción inválida (8–160 caracteres).`);
      }
      if (typeof it.smallerAction !== "string" || it.smallerAction.length < 8 || it.smallerAction.length > 160) {
        fail(`«${String(it.id)}» tiene una versión mínima inválida.`);
      }
      if (CLINICAL_RE.test(it.action) || CLINICAL_RE.test(it.smallerAction) || CLINICAL_RE.test(it.title)) {
        fail(`«${String(it.id)}» contiene términos clínicos prohibidos.`);
      }
      if (!Array.isArray(it.barriers) || it.barriers.length === 0) {
        fail(`«${String(it.id)}» debe declarar al menos una barrera que alivia.`);
      }
      for (const b of it.barriers) {
        if (!BARRIERS.includes(b as CatalogBarrier)) fail(`«${String(it.id)}» tiene una barrera inválida.`);
      }
      return {
        id: it.id,
        title: it.title,
        action: it.action,
        smallerAction: it.smallerAction,
        barriers: it.barriers as CatalogBarrier[],
      };
    });
    return { principleId: pr.principleId, items };
  });

  return {
    catalogVersion: root.catalogVersion,
    locale: root.locale,
    disclaimer: root.disclaimer,
    principles,
  };
}

let cached: HabitCatalog | null = null;

export function loadCatalog(): HabitCatalog {
  if (!cached) cached = validateCatalog(catalogJson);
  return cached;
}

/** Elige el primer microhábito del principio que alivie alguna barrera declarada (determinista). */
export function pickMicrohabit(
  catalog: HabitCatalog,
  principleId: string,
  barriers: CatalogBarrier[],
): CatalogItem | null {
  const principle = catalog.principles.find((p) => p.principleId === principleId);
  if (!principle) return null;
  for (const barrier of barriers) {
    const match = principle.items.find((item) => item.barriers.includes(barrier));
    if (match) return match;
  }
  return principle.items[0] ?? null;
}
