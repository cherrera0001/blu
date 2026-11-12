# Resultados de la evaluación de recuperación RAG (#58)

**Relaciona:** `docs/research/rag-set-evaluacion.md` (método y umbrales) · ADR-0008 D-2/D3 · `src/lib/rag/rag.test.ts`

> Este registro **no firma D3**. D3 exige ejecutar el set con el recuperador de producción
> (pgvector + embeddings reales) y que un revisor científico lo valide. Lo de abajo es la
> línea base reproducible en CI.

## Corrida 1 — línea base léxica (2026-11-12)

| Campo | Valor |
|---|---|
| Recuperador | `LexicalRetriever` (cobertura de términos ponderada por IDF, determinista) |
| Corpus | `src/data/rag-eval/corpus-sintetico.json`: 14 fuentes sintéticas aprobadas, 2 por pilar |
| Casos | `src/data/rag-eval/casos.json`: 70 (35 directos, 14 límite, 14 negativos, 7 adversariales) |
| Umbral de fundamentación | 0,5 |
| Precisión de cita en directos | **35/35 (100 %)** · umbral ≥ 90 % |
| Límite aceptables (cita correcta o incertidumbre) | 14/14 |
| Negativos y adversariales con incertidumbre | **21/21 (100 %)** · umbral 100 % |
| Citas a fuentes no aprobadas | **0** · umbral 0 |
| Resultado | Cumple los umbrales de §3 |

### Límites honestos de esta corrida

- **Sesgo de autoría:** el mismo agente escribió el corpus, las consultas y el recuperador en
  la misma sesión. Por eso el 100 % es optimista. Antes de D3 hacen falta consultas
  redactadas por anotadores independientes, idealmente personas mayores del público objetivo.
- **Los adversariales se resuelven sobre todo con la lista `CLAIM_CUES`**, que corta antes de
  buscar. Funciona contra los patrones conocidos («cura», «todos saben», «garantiza»), pero no
  contra paráfrasis nuevas. El guardián de salida (`validateOutput`) sigue como segunda barrera.
- El registro real (`src/data/evidence/sources.json`) tiene hoy **0 fuentes aprobadas**:
  con RAG activado, toda consulta termina en «sin evidencia» (fail-closed por diseño).

## Cómo repetir

```bash
npx vitest run src/lib/rag
```

Una corrida nueva se agrega como «Corrida N» con fecha, commit, recuperador y métricas.
