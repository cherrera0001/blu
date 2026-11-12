import type { CorpusDoc } from "./corpus";

/**
 * Recuperador léxico determinista (línea base para CI y evaluación).
 * Puntaje = cobertura de los términos de la consulta ponderada por IDF:
 * una consulta con términos que el corpus no conoce baja su puntaje, que es
 * justo lo que necesita un sistema fail-closed.
 */
export interface Hit {
  id: string;
  score: number;
}

export interface Retriever {
  search(query: string, k?: number): Promise<Hit[]>;
}

const STOPWORDS = new Set(
  (
    "a al algo algun alguna ante antes como con contra cual cuando de del desde donde " +
    "durante e el ella ellas ellos en entre es esa ese eso esta este esto estoy hay " +
    "la las le les lo los mas me mi mis mucho muy ni no nos o otra otro para pero poco " +
    "por porque que quien se ser si sin sobre son su sus tambien te tengo tiene todo " +
    "tu tus un una uno unos unas y ya yo debo deberia puedo puede sirve ayuda verdad " +
    "cosa cosas hacer hago hace bueno buena mejor dia dias vez veces cada"
  ).split(" "),
);

export function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Tokens de contenido con raíz aproximada (prefijo de 5 letras). */
export function terms(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map((w) => w.slice(0, 5));
}

export class LexicalRetriever implements Retriever {
  private readonly docs: Array<{ id: string; terms: Set<string> }>;
  private readonly idf = new Map<string, number>();
  private readonly unseenIdf: number;

  constructor(corpus: readonly CorpusDoc[]) {
    this.docs = corpus.map((d) => ({ id: d.id, terms: new Set(terms(d.text)) }));
    const n = this.docs.length;
    const df = new Map<string, number>();
    for (const doc of this.docs) for (const t of doc.terms) df.set(t, (df.get(t) ?? 0) + 1);
    for (const [t, count] of df) this.idf.set(t, Math.log((n + 1) / (count + 0.5)) + 1);
    this.unseenIdf = Math.log((n + 1) / 0.5) + 1;
  }

  async search(query: string, k = 3): Promise<Hit[]> {
    const q = [...new Set(terms(query))];
    if (q.length === 0 || this.docs.length === 0) return [];
    const weight = (t: string) => this.idf.get(t) ?? this.unseenIdf;
    const total = q.reduce((s, t) => s + weight(t), 0);
    return this.docs
      .map((doc) => ({
        id: doc.id,
        score: q.filter((t) => doc.terms.has(t)).reduce((s, t) => s + weight(t), 0) / total,
      }))
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, k);
  }
}
