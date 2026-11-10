"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { translate, type Locale } from "@/lib/i18n";
import Link from "next/link";
import BluPresence from "../BluPresence";
import { LanguageControl, useLocale } from "../LanguageControl";
import { loadBank } from "@/lib/onboarding/bank-loader";
import type { Question } from "@/lib/onboarding/bank";
import {
  answerQuestion,
  createAssessment,
  firstUnansweredIndex,
  getEffectiveQuestions,
  skipQuestion,
  type Assessment,
} from "@/lib/onboarding/engine";
import { BAND_LABELS, scoreAssessment } from "@/lib/onboarding/scoring";
import { suggestGoals, type Suggestion } from "@/lib/onboarding/suggestions";
import { computeBaseline, BASELINE_MIN_PRINCIPLES } from "@/lib/onboarding/baseline";
import { getBluSnapshot } from "@/lib/storage";
import {
  acceptSuggestion,
  emptyDecisions,
  loadGoalDecisions,
  rejectSuggestion,
  type GoalDecisions,
} from "@/lib/onboarding/goals-storage";
import { clearOnboarding, loadOnboarding, saveOnboarding } from "@/lib/onboarding/storage";
import {
  ONBOARDING_NOTICE_VERSION,
  acceptNotice,
  clearNotice,
  loadNotice,
  type NoticeAcceptance,
} from "@/lib/onboarding/notice";

const EXPERIMENTAL_NOTICE =
  "Esta autoevaluación es experimental y orientativa: no es un diagnóstico ni una medida de salud.";

export default function QuestionnaireApp() {
  const locale = useLocale();
  const bankState = useMemo(() => {
    try {
      return { bank: loadBank(), error: null as string | null };
    } catch (error) {
      return { bank: null, error: error instanceof Error ? error.message : "El cuestionario no se pudo cargar." };
    }
  }, []);

  if (bankState.error || !bankState.bank) {
    return (
      <main className="onboarding">
        <LanguageControl locale={locale} />
        <section className="error-card" role="alert">
          <span className="eyebrow">{translate(locale, "Autodiagnóstico")}</span>
          <h1>{translate(locale, "No pude cargar el cuestionario")}</h1>
          <p>{translate(locale, bankState.error ?? "")}</p>
          <button
            className="button button-dark"
            type="button"
            onClick={() => {
              clearOnboarding();
              clearNotice();
              window.location.reload();
            }}
          >
            {translate(locale, "Borrar datos del cuestionario y reintentar")}
          </button>
        </section>
      </main>
    );
  }

  return <QuestionnaireFlow />;
}

function subscribeNothing(): () => void {
  return () => {};
}

function QuestionnaireFlow() {
  const locale = useLocale();
  // La puerta de monteo evita valores no deterministas (new Date) durante el prerender
  // y mantiene el contenido interactivo fuera del SSR (reglas de Next.js 16).
  const ready = useSyncExternalStore(subscribeNothing, () => true, () => false);
  if (!ready) {
    return (
      <main className="onboarding">
        <LanguageControl locale={locale} />
        <section className="onboarding-card">
          <p className="muted">{translate(locale, "Preparando tu autodiagnóstico…")}</p>
        </section>
      </main>
    );
  }
  return <QuestionnaireSession />;
}

function QuestionnaireSession() {
  const locale = useLocale();
  const bank = loadBank();
  const [notice, setNotice] = useState("");
  const [assessment, setAssessment] = useState<Assessment>(() => {
    const saved = loadOnboarding();
    return saved.assessment ?? createAssessment(bank);
  });
  const [index, setIndex] = useState(() => firstUnansweredIndex(bank, assessment));
  const [reviewing, setReviewing] = useState(false);
  const [noticeSnapshot] = useState(() => loadNotice());
  const [noticeAcceptance, setNoticeAcceptance] = useState<NoticeAcceptance | null>(
    noticeSnapshot.accepted,
  );
  const [noticeGateError] = useState<string | null>(noticeSnapshot.error);
  const [noticeOutdated] = useState(noticeSnapshot.outdated);
  const [noticeChecked, setNoticeChecked] = useState(false);
  const [decisions, setDecisions] = useState<GoalDecisions | null>(
    () => loadGoalDecisions().decisions,
  );
  const versionNotice = assessment.bankVersion !== bank.bankVersion;

  const effective = getEffectiveQuestions(bank, assessment);
  const complete = index >= effective.length;
  // El perfil se calcula una sola vez por assessment completado: computedAt estable
  // para las decisiones (evita regenerar timestamp en cada render).
  const profile = useMemo(
    () => (complete ? scoreAssessment(bank, assessment) : null),
    [complete, bank, assessment],
  );
  const baseline = useMemo(() => (profile ? computeBaseline(profile) : null), [profile]);
  const suggestions = useMemo(() => {
    if (!profile) return [];
    // R3: si el hábito ya está en su versión mínima en el plan, el motor lo declara.
    const snapshot = getBluSnapshot();
    const adaptedActions: Record<string, string> = {};
    if (!snapshot.error) {
      for (const adaptation of snapshot.state.adaptations) {
        adaptedActions[adaptation.habitId] = adaptation.to;
      }
    }
    return suggestGoals(bank, assessment, profile, 3, { adaptedActions });
  }, [profile, bank, assessment]);
  const current: Question | undefined = complete ? undefined : effective[index];
  const progressText = complete
    ? translate(locale, "Cuestionario completado")
    : translate(locale, "Pregunta {n} de {total}")
        .replace("{n}", String(index + 1))
        .replace("{total}", String(effective.length));

  function commit(next: Assessment) {
    const saved = saveOnboarding(next);
    if (!saved.ok) {
      setNotice(saved.error ?? "No se pudo guardar tu avance.");
    } else {
      setNotice("");
    }
    setAssessment(next);
    setIndex((i) => Math.min(i + 1, effective.length));
  }

  function restart() {
    clearOnboarding();
    setAssessment(createAssessment(bank));
    setIndex(0);
    setNotice("");
  }

  const startAfterNotice = () => {
    const acceptedAt = new Date().toISOString();
    const result = acceptNotice(acceptedAt);
    if (result.ok) {
      setNoticeAcceptance({ version: ONBOARDING_NOTICE_VERSION, acceptedAt });
      setNotice("");
    } else {
      setNotice(result.error ?? "No se pudo registrar tu aceptación en este navegador.");
    }
  };

  if (noticeGateError) {
    return (
      <main className="onboarding">
        <LanguageControl locale={locale} />
        <section className="error-card" role="alert">
          <span className="eyebrow">{translate(locale, "Autodiagnóstico")}</span>
          <h1>{translate(locale, "No pude leer tu aceptación del aviso")}</h1>
          <p>{translate(locale, noticeGateError)}</p>
          <button
            className="button button-dark"
            type="button"
            onClick={() => {
              clearNotice();
              window.location.reload();
            }}
          >
            {translate(locale, "Borrar el aviso y reintentar")}
          </button>
        </section>
      </main>
    );
  }

  if (!noticeAcceptance) {
    return (
      <main className="onboarding">
        <LanguageControl locale={locale} />
        <section className="onboarding-card" aria-labelledby="notice-heading">
          <span className="step-label">{translate(locale, "ANTES DE EMPEZAR")}</span>
          <h1 id="notice-heading">{translate(locale, "Antes de empezar, un aviso")}</h1>
          <div className="blu-intro">
            <BluPresence size="sm" />
            <p className="blu-intro-line">
              {translate(locale, "«Vamos a conocerte un poco. Tus respuestas se quedan en este navegador.»")}
            </p>
          </div>
          <p>
            {translate(locale, "Este almacenamiento no está cifrado: evita datos médicos o que te identifiquen. Puedes borrar todo con «Borrar datos del cuestionario» o «Borrar mis datos».")}
          </p>
          {noticeOutdated && (
            <p className="inline-notice" role="status">
              {translate(locale, "Actualizamos el aviso del cuestionario desde tu última aceptación. Márcalo de nuevo para continuar.")}
            </p>
          )}
          <label className="consent-row">
            <input
              checked={noticeChecked}
              onChange={(event) => setNoticeChecked(event.target.checked)}
              type="checkbox"
            />
            <span>{translate(locale, "Entiendo dónde se guardan mis respuestas y cómo borrarlas.")}</span>
          </label>
          <div className="adapt-row">
            <button
              className="button button-dark"
              disabled={!noticeChecked}
              onClick={startAfterNotice}
              type="button"
            >
              {translate(locale, "Comenzar")}
            </button>
            <Link className="text-button" href="/">
              {translate(locale, "Volver sin guardar nada")}
            </Link>
          </div>
          {notice && (
            <p className="inline-notice" role="status">
              {translate(locale, notice)}
            </p>
          )}
        </section>
      </main>
    );
  }

  if (complete && profile) {
    const activeDecisions =
      decisions && decisions.profileComputedAt === profile.computedAt ? decisions : null;

    const decideAccept = (suggestion: Suggestion) => {
      const now = new Date().toISOString();
      const result = acceptSuggestion(suggestion, profile.computedAt, now);
      if (result.ok) {
        setDecisions(result.decisions);
      } else {
        setNotice(result.error ?? "No se pudo guardar tu decisión en este navegador.");
      }
    };

    const decideReject = (suggestionId: string) => {
      const now = new Date().toISOString();
      const base: GoalDecisions = activeDecisions ?? {
        ...emptyDecisions(),
        profileComputedAt: profile.computedAt,
      };
      const result = rejectSuggestion(base, suggestionId, profile.computedAt, now);
      if (result.ok) {
        setDecisions(result.decisions);
      } else {
        setNotice(result.error ?? "No se pudo guardar tu decisión en este navegador.");
      }
    };

    return (
      <main className="onboarding">
        <LanguageControl locale={locale} />
        <section className="onboarding-card" aria-labelledby="result-heading">
          <span className="step-label">{translate(locale, "RESULTADO")}</span>
          <h1 id="result-heading">{translate(locale, "Tu autodiagnóstico de hábitos")}</h1>
          <p className="muted">{translate(locale, EXPERIMENTAL_NOTICE)}</p>
          {versionNotice && (
            <p className="inline-notice" role="status">
              {translate(locale, "El cuestionario se actualizó desde que empezaste; este resultado usa la versión que respondiste ({version}).").replace("{version}", profile.bankVersion)}
            </p>
          )}
          {notice && (
            <p className="inline-notice" role="status">
              {translate(locale, notice)}
            </p>
          )}
          {baseline && (
            <section className="review-card" aria-labelledby="baseline-heading">
              <span className="eyebrow">{translate(locale, "TU LÍNEA BASE")}</span>
              <h2 id="baseline-heading">{translate(locale, "Punto de partida")}</h2>
              {baseline.value === null ? (
                <p className="muted" role="status">
                  {translate(locale, "Aún no hay base suficiente: respondiste {coverage} de {total} dimensiones y se necesitan al menos {minimum}. Revisa tus respuestas y vuelve: se recalcula al instante.")
                    .replace("{coverage}", String(baseline.coverage))
                    .replace("{total}", String(baseline.totalPrinciples))
                    .replace("{minimum}", String(BASELINE_MIN_PRINCIPLES))}
                </p>
              ) : (
                <p className="baseline-value" role="status">
                  <strong>{baseline.value}</strong>{" "}
                  {translate(locale, "de 100 · basado en {coverage} de {total} dimensiones ({answered} de {questions} respuestas puntuables)")
                    .replace("{coverage}", String(baseline.coverage))
                    .replace("{total}", String(baseline.totalPrinciples))
                    .replace("{answered}", String(baseline.answeredQuestions))
                    .replace("{questions}", String(baseline.totalQuestions))}
                </p>
              )}
              <p className="muted">{translate(locale, baseline.disclaimer)}</p>
              <details>
                <summary className="text-button">{translate(locale, "¿Cómo se calcula?")}</summary>
                <p className="tiny-note">{translate(locale, baseline.formula)}</p>
              </details>
              <div className="adapt-row">
                <button
                  className="text-button"
                  onClick={() => {
                    setReviewing(true);
                    setIndex(0);
                  }}
                  type="button"
                >
                  {translate(locale, "Revisar mis respuestas")}
                </button>
                <span className="tiny-note">
                  {translate(locale, "Corregir recalcula tu línea base al momento.")}
                </span>
              </div>
              <p className="tiny-note">
                {translate(locale, "Cuando repitas la autoevaluación, la nueva línea base reemplaza a esta: por ahora no guardamos historial.")}
              </p>
            </section>
          )}

          <ul className="habit-grid compact" role="list">
            {profile.results.map((r) => (
              <li key={r.principleId} className="habit-option">
                <span className="category-label">{principleTitle(r.principleId, locale)}</span>
                <strong>
                  {r.band ? translate(locale, BAND_LABELS[r.band]) : translate(locale, "Sin nivel aún")}
                  {r.score !== null ? ` · ${r.score}/100` : ""}
                </strong>
                <span className="muted">
                  {r.confidence === "reduced" ? translate(locale, "Menor confianza (omitiste algunas preguntas).") : ""}
                </span>
              </li>
            ))}
          </ul>

          <section aria-labelledby="suggestions-heading">
            <h2 id="suggestions-heading">{translate(locale, "Sugerencias para partir")}</h2>
            <p className="muted">
              {translate(locale, "Este cuestionario propone hasta tres ideas. En Blu puedes cuidar hasta cuatro.")}
            </p>
            {suggestions.length === 0 ? (
              <p className="muted">
                {translate(locale, "Sin sugerencias por ahora. Tú decides siempre.")}{" "}
                <Link href="/">{translate(locale, "Elegir tus hábitos manualmente")}</Link>
              </p>
            ) : (
              <ul className="habit-grid compact" role="list">
                {suggestions.map((s) => {
                  const accepted = activeDecisions?.accepted.some((g) => g.suggestionId === s.id);
                  const rejected = activeDecisions?.rejected.includes(s.id);
                  return (
                    <li key={s.id} className="habit-option">
                      <span className="category-label">{translate(locale, s.title)}</span>
                      <p>{suggestionCopy(locale, s)}</p>
                      {accepted ? (
                        <p className="inline-notice" role="status">
                          {translate(locale, "Guardado en tus objetivos. Puedes ajustarlo en la pantalla de hábitos.")}
                        </p>
                      ) : rejected ? (
                        <p className="inline-notice" role="status">{translate(locale, "Rechazada; no se guardó nada.")}</p>
                      ) : (
                        <div className="adapt-row">
                          <button
                            aria-label={translate(locale, "Aceptar {title}").replace("{title}", translate(locale, s.title))}
                            className="button button-light"
                            type="button"
                            onClick={() => decideAccept(s)}
                          >
                            {translate(locale, "Aceptar")}
                          </button>
                          <button
                            aria-label={translate(locale, "Rechazar {title}").replace("{title}", translate(locale, s.title))}
                            className="text-button"
                            type="button"
                            onClick={() => decideReject(s.id)}
                          >
                            {translate(locale, "Rechazar")}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <p className="tiny-note">
            {translate(locale, "Puedes usar esto para elegir hábitos, o ignorarlo por completo: tú decides.")}
          </p>
          <div className="adapt-row">
            <button className="button button-dark" type="button" onClick={restart}>
              {translate(locale, "Repetir evaluación")}
            </button>
            <Link className="text-button" href="/">
              {translate(locale, "Volver a Blu")}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding">
      <LanguageControl locale={locale} />
      <section className="onboarding-card" aria-labelledby="question-heading">
        <p className="selection-count" role="status" aria-live="polite">
          {progressText}
        </p>
        {versionNotice && (
          <p className="inline-notice" role="status">
            {translate(locale, "El cuestionario cambió de versión desde tu última sesión; conservamos tu avance.")}
          </p>
        )}
        {notice && (
          <p className="inline-notice" role="status">
            {translate(locale, notice)}
          </p>
        )}
        {reviewing && (
          <button
            className="text-button"
            onClick={() => {
              setReviewing(false);
              setIndex(effective.length);
            }}
            type="button"
          >
            {translate(locale, "Volver a mi resultado")}
          </button>
        )}
        {current && (
          <QuestionStep
            key={current.id}
            question={current}
            previous={assessment.answers[current.id]}
            isLast={index === effective.length - 1}
            onAnswer={(value) => commit(answerQuestion(bank, assessment, current.id, value))}
            onSkip={current.skippable ? () => commit(skipQuestion(bank, assessment, current.id)) : null}
            onBack={index > 0 ? () => setIndex(index - 1) : null}
          />
        )}
        <p className="tiny-note">{translate(locale, bank.disclaimer)}</p>
      </section>
    </main>
  );
}

function suggestionCopy(locale: Locale, s: Suggestion): string {
  const head = translate(locale, "En «{title}» tu autodiagnóstico señaló «{band}».")
    .replace("{title}", translate(locale, s.title))
    .replace("{band}", translate(locale, BAND_LABELS[s.band]));
  let note = "";
  if (s.ruleId === "R3-ya-minima") {
    note = translate(locale, "Ya está en su versión más pequeña: mantenerla cuenta.");
  } else {
    const match = s.explanation.match(/Mencionaste: (.*?)\. /);
    if (match) {
      const barriers = match[1]
        .split(", ")
        .map((label) => translate(locale, label))
        .join(", ");
      note = translate(locale, "Mencionaste: {barriers}.").replace("{barriers}", barriers);
    }
  }
  const start = translate(locale, "Te sugerimos partir por: «{action}».").replace(
    "{action}",
    translate(locale, s.action),
  );
  const rule = translate(locale, "(Regla aplicada: {rule})").replace("{rule}", s.ruleId);
  return [head, note, start, rule].filter(Boolean).join(" ");
}

function principleTitle(id: string, locale: Locale): string {
  const found = loadBank().principles.find((p) => p.id === id);
  return found ? translate(locale, found.title) : id;
}

interface StepProps {
  question: Question;
  previous: Assessment["answers"][string] | undefined;
  isLast: boolean;
  onAnswer: (value: number | string | Array<number | string>) => void;
  onSkip: (() => void) | null;
  onBack: (() => void) | null;
}

function QuestionStep({ question, previous, isLast, onAnswer, onSkip, onBack }: StepProps) {
  const locale = useLocale();
  const [pending, setPending] = useState<number | string | Array<number | string> | null>(null);
  const [multiPending, setMultiPending] = useState<Array<number | string>>([]);

  const effectiveValue = pending ?? (previous?.kind === "value" ? previous.value : null);

  function toggleMulti(value: number | string) {
    setMultiPending((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (question.type === "multi_choice") {
      if (multiPending.length > 0) onAnswer(multiPending);
      return;
    }
    if (effectiveValue !== null && !Array.isArray(effectiveValue)) {
      onAnswer(effectiveValue);
    }
  }

  const canContinue =
    question.type === "multi_choice" ? multiPending.length > 0 : effectiveValue !== null;

  return (
    <form onSubmit={submit}>
      <h1 id="question-heading">{translate(locale, question.text)}</h1>

      {question.type === "likert5" && question.likertAnchors && (
        <>
          <LikertScale question={question} value={typeof effectiveValue === "number" ? effectiveValue : null} onSelect={(v) => setPending(v)} anchors={question.likertAnchors} />
          <div className="adapt-row" aria-hidden="true">
            <span className="tiny-note">{translate(locale, question.likertAnchors.low)}</span>
            <span className="tiny-note">{translate(locale, question.likertAnchors.high)}</span>
          </div>
        </>
      )}

      {question.type === "single_choice" && (
        <div role="radiogroup" aria-labelledby="question-heading">
          {question.options?.map((option) => (
            <label key={String(option.value)} className="consent-row">
              <input
                type="radio"
                name={question.id}
                checked={effectiveValue === option.value}
                onChange={() => setPending(option.value)}
              />
              <span>{translate(locale, option.label)}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === "multi_choice" && (
        <fieldset>
          <legend className="visually-hidden">{translate(locale, question.text)}</legend>
          {question.options?.map((option) => (
            <label key={String(option.value)} className="consent-row">
              <input
                type="checkbox"
                checked={multiPending.includes(option.value)}
                onChange={() => toggleMulti(option.value)}
              />
              <span>{translate(locale, option.label)}</span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="adapt-row">
        {onBack && (
          <button className="text-button" type="button" onClick={onBack}>
            {translate(locale, "Anterior")}
          </button>
        )}
        {onSkip && (
          <button className="text-button" type="button" onClick={onSkip}>
            {translate(locale, "Prefiero no responder")}
          </button>
        )}
        <button className="button button-dark" type="submit" disabled={!canContinue}>
          {isLast ? translate(locale, "Ver mi resultado") : translate(locale, "Siguiente")}
        </button>
      </div>
    </form>
  );
}

function LikertScale({
  question,
  value,
  onSelect,
  anchors,
}: {
  question: Question;
  value: number | null;
  onSelect: (v: number) => void;
  anchors: { low: string; high: string };
}) {
  const locale = useLocale();
  return (
    <div role="radiogroup" aria-labelledby="question-heading" className="adapt-row likert-row">
      {[0, 1, 2, 3, 4].map((v) => (
        <label key={v} className="consent-row">
          <input
            type="radio"
            name={question.id}
            aria-label={v === 0 ? translate(locale, anchors.low) : v === 4 ? translate(locale, anchors.high) : String(v + 1)}
            checked={value === v}
            onChange={() => onSelect(v)}
          />
          <span aria-hidden="true">{v + 1}</span>
        </label>
      ))}
    </div>
  );
}
