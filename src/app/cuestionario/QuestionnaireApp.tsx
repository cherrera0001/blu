"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
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
        <section className="error-card" role="alert">
          <span className="eyebrow">Autodiagnóstico</span>
          <h1>No pude cargar el cuestionario</h1>
          <p>{bankState.error}</p>
          <button
            className="button button-dark"
            type="button"
            onClick={() => {
              clearOnboarding();
              clearNotice();
              window.location.reload();
            }}
          >
            Borrar datos del cuestionario y reintentar
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
  // La puerta de monteo evita valores no deterministas (new Date) durante el prerender
  // y mantiene el contenido interactivo fuera del SSR (reglas de Next.js 16).
  const ready = useSyncExternalStore(subscribeNothing, () => true, () => false);
  if (!ready) {
    return (
      <main className="onboarding">
        <section className="onboarding-card">
          <p className="muted">Preparando tu autodiagnóstico…</p>
        </section>
      </main>
    );
  }
  return <QuestionnaireSession />;
}

function QuestionnaireSession() {
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
    ? "Cuestionario completado"
    : `Pregunta ${index + 1} de ${effective.length}`;

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
        <section className="error-card" role="alert">
          <span className="eyebrow">Autodiagnóstico</span>
          <h1>No pude leer tu aceptación del aviso</h1>
          <p>{noticeGateError}</p>
          <button
            className="button button-dark"
            type="button"
            onClick={() => {
              clearNotice();
              window.location.reload();
            }}
          >
            Borrar el aviso y reintentar
          </button>
        </section>
      </main>
    );
  }

  if (!noticeAcceptance) {
    return (
      <main className="onboarding">
        <section className="onboarding-card" aria-labelledby="notice-heading">
          <span className="step-label">ANTES DE EMPEZAR</span>
          <h1 id="notice-heading">Antes de empezar, un aviso</h1>
          <div className="blu-intro">
            <Image alt="" className="blu-presence sm" height={28} src="/blu-avatar.jpg" width={28} />
            <p className="blu-intro-line">
              «Vamos a conocerte un poco. Tus respuestas se quedan en este navegador.»
            </p>
          </div>
          <p>
            Este almacenamiento <strong>no está cifrado</strong>: evita datos médicos o que te
            identifiquen. Puedes borrar todo con «Borrar datos del cuestionario» o «Borrar mis
            datos».
          </p>
          {noticeOutdated && (
            <p className="inline-notice" role="status">
              Actualizamos el aviso del cuestionario desde tu última aceptación. Márcalo de nuevo
              para continuar.
            </p>
          )}
          <label className="consent-row">
            <input
              checked={noticeChecked}
              onChange={(event) => setNoticeChecked(event.target.checked)}
              type="checkbox"
            />
            <span>Entiendo dónde se guardan mis respuestas y cómo borrarlas.</span>
          </label>
          <div className="adapt-row">
            <button
              className="button button-dark"
              disabled={!noticeChecked}
              onClick={startAfterNotice}
              type="button"
            >
              Comenzar
            </button>
            <Link className="text-button" href="/">
              Volver sin guardar nada
            </Link>
          </div>
          {notice && (
            <p className="inline-notice" role="status">
              {notice}
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
        <section className="onboarding-card" aria-labelledby="result-heading">
          <span className="step-label">RESULTADO</span>
          <h1 id="result-heading">Tu autodiagnóstico de hábitos</h1>
          <p className="muted">{EXPERIMENTAL_NOTICE}</p>
          {versionNotice && (
            <p className="inline-notice" role="status">
              El cuestionario se actualizó desde que empezaste; este resultado usa la versión que
              respondiste ({profile.bankVersion}).
            </p>
          )}
          {notice && (
            <p className="inline-notice" role="status">
              {notice}
            </p>
          )}
          {baseline && (
            <section className="review-card" aria-labelledby="baseline-heading">
              <span className="eyebrow">TU LÍNEA BASE</span>
              <h2 id="baseline-heading">Punto de partida</h2>
              {baseline.value === null ? (
                <p className="muted" role="status">
                  Aún no hay base suficiente: respondiste {baseline.coverage} de{" "}
                  {baseline.totalPrinciples} dimensiones y se necesitan al menos{" "}
                  {BASELINE_MIN_PRINCIPLES}. Revisa tus respuestas y vuelve: se recalcula al
                  instante.
                </p>
              ) : (
                <p className="baseline-value" role="status">
                  <strong>{baseline.value}</strong> de 100 · basado en {baseline.coverage} de{" "}
                  {baseline.totalPrinciples} dimensiones ({baseline.answeredQuestions} de {baseline.totalQuestions} respuestas puntuables)
                </p>
              )}
              <p className="muted">{baseline.disclaimer}</p>
              <details>
                <summary className="text-button">¿Cómo se calcula?</summary>
                <p className="tiny-note">{baseline.formula}</p>
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
                  Revisar mis respuestas
                </button>
                <span className="tiny-note">
                  Corregir recalcula tu línea base al momento.
                </span>
              </div>
              <p className="tiny-note">
                Cuando repitas la autoevaluación, la nueva línea base reemplaza a esta: por ahora
                no guardamos historial.
              </p>
            </section>
          )}

          <ul className="habit-grid compact" role="list">
            {profile.results.map((r) => (
              <li key={r.principleId} className="habit-option">
                <span className="category-label">{principleTitle(r.principleId)}</span>
                <strong>
                  {r.band ? BAND_LABELS[r.band] : "Sin nivel aún"}
                  {r.score !== null ? ` · ${r.score}/100` : ""}
                </strong>
                <span className="muted">
                  {r.confidence === "reduced" ? "Menor confianza (omitiste algunas preguntas)." : ""}
                </span>
              </li>
            ))}
          </ul>

          <section aria-labelledby="suggestions-heading">
            <h2 id="suggestions-heading">Sugerencias para partir (hasta tres)</h2>
            {suggestions.length === 0 ? (
              <p className="muted">
                Sin sugerencias por ahora. Puedes{" "}
                <Link href="/">elegir tus hábitos manualmente</Link>: tú decides siempre.
              </p>
            ) : (
              <ul className="habit-grid compact" role="list">
                {suggestions.map((s) => {
                  const accepted = activeDecisions?.accepted.some((g) => g.suggestionId === s.id);
                  const rejected = activeDecisions?.rejected.includes(s.id);
                  return (
                    <li key={s.id} className="habit-option">
                      <span className="category-label">{s.title}</span>
                      <p>{s.explanation}</p>
                      {accepted ? (
                        <p className="inline-notice" role="status">
                          Guardado en tus objetivos. Puedes ajustarlo en la pantalla de hábitos.
                        </p>
                      ) : rejected ? (
                        <p className="inline-notice" role="status">Rechazada; no se guardó nada.</p>
                      ) : (
                        <div className="adapt-row">
                          <button
                            aria-label={`Aceptar ${s.title}`}
                            className="button button-light"
                            type="button"
                            onClick={() => decideAccept(s)}
                          >
                            Aceptar
                          </button>
                          <button
                            aria-label={`Rechazar ${s.title}`}
                            className="text-button"
                            type="button"
                            onClick={() => decideReject(s.id)}
                          >
                            Rechazar
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
            Puedes usar esto para elegir hábitos, o ignorarlo por completo: tú decides.
          </p>
          <div className="adapt-row">
            <button className="button button-dark" type="button" onClick={restart}>
              Repetir evaluación
            </button>
            <Link className="text-button" href="/">
              Volver a Blu
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding">
      <section className="onboarding-card" aria-labelledby="question-heading">
        <p className="selection-count" role="status" aria-live="polite">
          {progressText}
        </p>
        {versionNotice && (
          <p className="inline-notice" role="status">
            El cuestionario cambió de versión desde tu última sesión; conservamos tu avance.
          </p>
        )}
        {notice && (
          <p className="inline-notice" role="status">
            {notice}
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
            Volver a mi resultado
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
        <p className="tiny-note">{bank.disclaimer}</p>
      </section>
    </main>
  );
}

function principleTitle(id: string): string {
  const found = loadBank().principles.find((p) => p.id === id);
  return found ? found.title : id;
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
      <h1 id="question-heading">{question.text}</h1>

      {question.type === "likert5" && question.likertAnchors && (
        <>
          <LikertScale question={question} value={typeof effectiveValue === "number" ? effectiveValue : null} onSelect={(v) => setPending(v)} anchors={question.likertAnchors} />
          <div className="adapt-row" aria-hidden="true">
            <span className="tiny-note">{question.likertAnchors.low}</span>
            <span className="tiny-note">{question.likertAnchors.high}</span>
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
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === "multi_choice" && (
        <fieldset>
          <legend className="visually-hidden">{question.text}</legend>
          {question.options?.map((option) => (
            <label key={String(option.value)} className="consent-row">
              <input
                type="checkbox"
                checked={multiPending.includes(option.value)}
                onChange={() => toggleMulti(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="adapt-row">
        {onBack && (
          <button className="text-button" type="button" onClick={onBack}>
            Anterior
          </button>
        )}
        {onSkip && (
          <button className="text-button" type="button" onClick={onSkip}>
            Prefiero no responder
          </button>
        )}
        <button className="button button-dark" type="submit" disabled={!canContinue}>
          {isLast ? "Ver mi resultado" : "Siguiente"}
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
  return (
    <div role="radiogroup" aria-labelledby="question-heading" className="adapt-row likert-row">
      {[0, 1, 2, 3, 4].map((v) => (
        <label key={v} className="consent-row">
          <input
            type="radio"
            name={question.id}
            aria-label={v === 0 ? anchors.low : v === 4 ? anchors.high : String(v + 1)}
            checked={value === v}
            onChange={() => onSelect(v)}
          />
          <span aria-hidden="true">{v + 1}</span>
        </label>
      ))}
    </div>
  );
}
