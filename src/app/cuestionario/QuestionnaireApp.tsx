"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
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
import { clearOnboarding, loadOnboarding, saveOnboarding } from "@/lib/onboarding/storage";

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
  const versionNotice = assessment.bankVersion !== bank.bankVersion;

  const effective = getEffectiveQuestions(bank, assessment);
  const complete = index >= effective.length;
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

  if (complete) {
    const profile = scoreAssessment(bank, assessment);
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
          <ul className="habit-grid" role="list">
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
