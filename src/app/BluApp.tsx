"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import {
  HABITS,
  currentAction,
  getWeeklySummary,
  isBarrier,
  localDateKey,
  type Barrier,
  type HabitId,
} from "@/lib/blu";
import { respondToMessage } from "@/lib/conversation";
import { buildExportBundle, downloadBundle, exportFileName } from "@/lib/export";
import { loadOnboarding } from "@/lib/onboarding/storage";
import { loadGoalDecisions } from "@/lib/onboarding/goals-storage";
import {
  getISOWeekKey,
  getReviewSnapshot,
  getServerReviewSnapshot,
  saveReview,
  subscribeReviews,
  type Felt,
  type ReviewDecision,
} from "@/lib/review";
import {
  CONSENT_VERSION,
  acceptPurpose,
  hasPurpose,
  needsReconsent,
  withdrawPurpose,
  type PurposeId,
} from "@/lib/consent";
import {
  clearBluState,
  getBluSnapshot,
  getServerBluSnapshot,
  subscribeToBlu,
  updateBluState,
} from "@/lib/storage";

type ChatMessage = { role: "blu" | "you"; text: string };

export default function Home() {
  const snapshot = useSyncExternalStore(subscribeToBlu, getBluSnapshot, getServerBluSnapshot);
  const clockMinute = useSyncExternalStore(subscribeToClock, getClockSnapshot, getServerClockSnapshot);
  const state = snapshot.state;
  const [purposeDraft, setPurposeDraft] = useState<Record<PurposeId, boolean>>({
    operativo: false,
    mejora: false,
    investigacion: false,
  });
  const [managingConsent, setManagingConsent] = useState(false);
  const reviews = useSyncExternalStore(subscribeReviews, getReviewSnapshot, getServerReviewSnapshot);
  const [reviewDraft, setReviewDraft] = useState<{
    felt: Felt | null;
    decision: ReviewDecision | null;
  }>({ felt: null, decision: null });
  const [reviewNotice, setReviewNotice] = useState("");
  const [editingSelection, setEditingSelection] = useState(false);
  const [draftSelectedHabitIds, setDraftSelectedHabitIds] = useState<HabitId[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "blu",
      text: "Hola, soy Blu en modo demostración. ¿Qué haría que un hábito se sintiera más posible hoy?",
    },
  ]);
  const [adaptHabitId, setAdaptHabitId] = useState<HabitId | "">("");
  const [barrier, setBarrier] = useState<Barrier>("time");
  const [notice, setNotice] = useState("");
  const today = new Date(clockMinute * 60_000);
  const todayKey = localDateKey(today);
  const weeklySummary = getWeeklySummary(state, today);
  const consentReady = hasPurpose(state.consent, "operativo") && !needsReconsent(state.consent);
  const showConsentEditor = !consentReady || managingConsent;

  function continueSelection() {
    const now = new Date().toISOString();
    let consent = state.consent;
    if (!consentReady) {
      if (!purposeDraft.operativo) return;
      consent = acceptPurpose(consent, "operativo", now);
      if (purposeDraft.mejora) consent = acceptPurpose(consent, "mejora", now);
      if (purposeDraft.investigacion) consent = acceptPurpose(consent, "investigacion", now);
    } else {
      for (const purpose of ["mejora", "investigacion"] as PurposeId[]) {
        if (hasPurpose(consent, purpose) && !purposeDraft[purpose]) {
          consent = withdrawPurpose(consent, purpose, now);
        }
      }
    }
    updateBluState((current) => ({
      ...current,
      consent,
      consentAcceptedAt: current.consentAcceptedAt ?? now,
      selectedHabitIds: draftSelectedHabitIds,
    }));
    setEditingSelection(false);
    setManagingConsent(false);
    setNotice("");
  }

  function openConsentManager() {
    setPurposeDraft({
      operativo: true,
      mejora: hasPurpose(state.consent, "mejora"),
      investigacion: hasPurpose(state.consent, "investigacion"),
    });
    setDraftSelectedHabitIds(state.selectedHabitIds);
    setManagingConsent(true);
  }

  function exportData() {
    const snapshot = getBluSnapshot();
    const onboarding = loadOnboarding();
    const goals = loadGoalDecisions();
    const errors: string[] = [];
    if (snapshot.error) errors.push(`state: ${snapshot.error}`);
    if (onboarding.error) errors.push(`onboarding: ${onboarding.error}`);
    if (goals.error) errors.push(`goals: ${goals.error}`);
    const bundle = buildExportBundle({
      state: snapshot.error ? null : snapshot.state,
      onboarding: onboarding.assessment,
      goals: goals.decisions,
      exportedAt: new Date().toISOString(),
      errors,
    });
    const ok = downloadBundle(bundle, exportFileName(new Date()));
    setNotice(
      ok
        ? "Exportaste tus datos. Revisa tu carpeta de descargas."
        : "No pude preparar la exportación en este navegador.",
    );
  }

  const weekKey = getISOWeekKey(today);
  const thisWeekReview = reviews?.find((review) => review.weekKey === weekKey) ?? null;

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = saveReview(
      {
        weekKey,
        felt: reviewDraft.felt ?? undefined,
        decision: reviewDraft.decision ?? undefined,
      },
      new Date().toISOString(),
    );
    setReviewNotice(
      result.ok
        ? "Revisión guardada. Gracias por mirar tu semana."
        : (result.error ?? "No se pudo guardar tu revisión."),
    );
    if (result.ok) setReviewDraft({ felt: null, decision: null });
  }

  function skipReview() {
    const result = saveReview({ weekKey }, new Date().toISOString());
    setReviewNotice(
      result.ok
        ? "Quedó registrado que omitiste esta semana."
        : (result.error ?? "No se pudo guardar tu revisión."),
    );
  }

  function toggleHabit(habitId: HabitId) {
    const alreadySelected = draftSelectedHabitIds.includes(habitId);
    if (!alreadySelected && draftSelectedHabitIds.length >= 3) {
      setNotice("Puedes elegir hasta tres hábitos. Quita uno para elegir otro.");
      return;
    }
    setNotice("");
    setDraftSelectedHabitIds((selected) =>
      selected.includes(habitId)
        ? selected.filter((id) => id !== habitId)
        : [...selected, habitId],
    );
  }

  function toggleCheckIn(habitId: HabitId) {
    updateBluState((current) => {
      const todayIds = current.checkInsByDate[todayKey] ?? [];
      const updated = todayIds.includes(habitId)
        ? todayIds.filter((id) => id !== habitId)
        : [...todayIds, habitId];
      return {
        ...current,
        checkInsByDate: { ...current.checkInsByDate, [todayKey]: updated },
      };
    });
  }

  function simplifyHabit() {
    if (!adaptHabitId) return;
    const habit = HABITS.find((item) => item.id === adaptHabitId);
    if (!habit) return;
    const previous = currentAction(state, habit.id);
    if (previous === habit.smallerAction) {
      setNotice("Este hábito ya está en su versión más pequeña.");
      return;
    }
    updateBluState((current) => ({
      ...current,
      adaptations: [
        ...current.adaptations,
        {
          habitId: habit.id,
          from: previous,
          to: habit.smallerAction,
          barrier,
          at: new Date().toISOString(),
        },
      ],
    }));
    setNotice("Listo. Dejé registrada la versión más pequeña que elegiste.");
  }

  function undoLastAdaptation() {
    updateBluState((current) => ({
      ...current,
      adaptations: current.adaptations.slice(0, -1),
    }));
    setNotice("Se deshizo el último ajuste. Puedes elegir otro cuando quieras.");
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    const reply = await respondToMessage(text);
    const userMessage: ChatMessage = { role: "you", text };
    const bluMessage: ChatMessage = { role: "blu", text: reply };
    setChatMessages((messages) =>
      [...messages, userMessage, bluMessage].slice(-40),
    );
    setChatInput("");
  }

  function clearData() {
    if (
      state.consentAcceptedAt &&
      !window.confirm("¿Borrar las preferencias y los registros locales de Blu?")
    ) {
      return;
    }
    if (clearBluState()) {
      setEditingSelection(false);
      setManagingConsent(false);
      setPurposeDraft({ operativo: false, mejora: false, investigacion: false });
      setDraftSelectedHabitIds([]);
      setChatMessages([
        {
          role: "blu",
          text: "Hola, soy Blu en modo demostración. ¿Qué haría que un hábito se sintiera más posible hoy?",
        },
      ]);
      setNotice("Se borraron los datos de Blu guardados en este navegador.");
    }
  }

  if (snapshot.error) {
    return (
      <main className="error-screen">
        <section className="error-card" role="alert">
          <span className="eyebrow">Blu · almacenamiento local</span>
          <h1>No pude acceder a tus datos</h1>
          <p>{snapshot.error}</p>
          <p>Si reinicias, se eliminará el estado local de Blu de este navegador.</p>
          <button className="button button-dark" onClick={clearData} type="button">
            Borrar datos locales y reiniciar
          </button>
        </section>
      </main>
    );
  }

  if (!state.consentAcceptedAt || state.selectedHabitIds.length === 0 || editingSelection || managingConsent) {
    return (
      <main className="onboarding">
        <header className="topbar">
          <a className="brand" href="#" aria-label="Blu, inicio">
            <span className="brand-mark">b</span>
            <span>blu</span>
          </a>
          <span className="prototype-tag">PROTOTIPO LOCAL</span>
        </header>
        <section className="welcome-panel">
          <div className="welcome-copy">
            <span className="eyebrow">TU BIENESTAR, UN DÍA A LA VEZ</span>
            <h1>Un cambio pequeño también cuenta.</h1>
            <p>
              Elige algo que te gustaría explorar. No necesitas cambiarlo todo hoy ni hacerlo
              perfecto.
            </p>
            <div className="disclaimer">
              <span aria-hidden="true">ⓘ</span>
              <p>
                Blu es un prototipo de bienestar, no una herramienta clínica. No ofrece consejos
                médicos ni promete vivir más años.
              </p>
            </div>
          </div>
          <div className="onboarding-card">
            <div className="card-heading">
              <span className="step-label">
                {editingSelection ? "AJUSTA TU SELECCIÓN" : "PRIMER PASO"}
              </span>
              <span className="step-count">01 / 02</span>
            </div>
            <h2>¿Qué te gustaría cuidar?</h2>
            <p className="muted">Elige entre uno y tres temas. Tú decides el ritmo.</p>
            <div className="habit-grid">
              {HABITS.map((habit) => {
                const selected = draftSelectedHabitIds.includes(habit.id);
                return (
                  <button
                    aria-pressed={selected}
                    className={`habit-option${selected ? " selected" : ""}`}
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id)}
                    type="button"
                  >
                    <span className="habit-icon" aria-hidden="true">
                      {habit.icon}
                    </span>
                    <span>{habit.title}</span>
                    <span className="selection-indicator" aria-hidden="true">
                      {selected ? "✓" : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p aria-live="polite" className="selection-count">
              {draftSelectedHabitIds.length} de 3 elegidos
            </p>
            {showConsentEditor && (
              <fieldset>
                <legend className="tiny-note">
                  Consentimientos · aviso versión {CONSENT_VERSION}
                </legend>
                {PURPOSES.map((purpose) => (
                  <label key={purpose.id} className="consent-row">
                    <input
                      checked={purposeDraft[purpose.id]}
                      disabled={purpose.id === "operativo" && consentReady}
                      onChange={(event) =>
                        setPurposeDraft((draft) => ({
                          ...draft,
                          [purpose.id]: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{purpose.label}</span>
                  </label>
                ))}
                {consentReady && (
                  <p className="tiny-note">
                    Para retirar el propósito operativo usa «Borrar mis datos».
                  </p>
                )}
              </fieldset>
            )}
            <button
              className="button button-dark full-width"
              disabled={
                draftSelectedHabitIds.length === 0 ||
                (!consentReady && !purposeDraft.operativo)
              }
              onClick={continueSelection}
              type="button"
            >
              {editingSelection ? "Guardar selección" : "Empezar con lo que elegí"}{" "}
              <span aria-hidden="true">→</span>
            </button>
            {editingSelection && (
              <button
                className="text-button cancel-edit"
                onClick={() => {
                  setDraftSelectedHabitIds(state.selectedHabitIds);
                  setEditingSelection(false);
                }}
                type="button"
              >
                Cancelar
              </button>
            )}
            {notice && <p className="inline-notice" role="status">{notice}</p>}
            <p className="tiny-note">No escribas información médica ni datos que te identifiquen.</p>
            <p className="tiny-note">
              ¿Prefieres partir con una autoevaluación?{" "}
              <Link href="/cuestionario">Hacer el autodiagnóstico de hábitos (opcional, experimental)</Link>
            </p>
          </div>
        </section>
        <footer className="page-footer">
          <span>Inspirado en siete dimensiones de bienestar</span>
          <span>Sin cuenta · Sin conexión a IA · Datos en este navegador</span>
        </footer>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Blu, inicio">
          <span className="brand-mark">b</span>
          <span>blu</span>
        </a>
        <div className="topbar-right">
          <span className="prototype-tag">PROTOTIPO LOCAL</span>
          <button className="text-button" onClick={clearData} type="button">
            Borrar mis datos
          </button>
        </div>
      </header>

      <section className="dashboard-intro">
        <div>
          <span className="eyebrow">
            HOY · {today.toLocaleDateString("es-CL", { dateStyle: "long" })}
          </span>
          <h1>¿Qué pequeño paso te hace bien?</h1>
          <p>No hay rachas que perder. Registra lo que sí ocurrió, a tu manera.</p>
        </div>
        <div className="day-orb" aria-hidden="true">
          <span>◌</span>
          <small>un día<br />a la vez</small>
        </div>
      </section>

      {notice && <p className="toast" role="status">{notice}</p>}

      {state.consentAcceptedAt && needsReconsent(state.consent) && (
        <p className="inline-notice" role="status">
          Actualizamos el aviso de consentimiento (versión {CONSENT_VERSION}). Tu uso sigue
          igual hasta que renueves.{" "}
          <button className="text-button" onClick={openConsentManager} type="button">
            Revisar y renovar
          </button>
        </p>
      )}

      <div className="content-grid">
        <section className="main-column" aria-labelledby="habits-heading">
          <div className="section-heading">
            <div>
              <span className="eyebrow">TU ESPACIO</span>
              <h2 id="habits-heading">Hábitos que elegiste</h2>
            </div>
            <button
              className="text-button"
              onClick={() => {
                setDraftSelectedHabitIds(state.selectedHabitIds);
                setEditingSelection(true);
              }}
              type="button"
            >
              Cambiar selección
            </button>
          </div>
          <div className="daily-list">
            {state.selectedHabitIds.map((id) => {
              const habit = HABITS.find((item) => item.id === id);
              if (!habit) return null;
              const done = state.checkInsByDate[todayKey]?.includes(id) ?? false;
              return (
                <article className={`daily-card${done ? " completed" : ""}`} key={habit.id}>
                  <div className="daily-icon" aria-hidden="true">{habit.icon}</div>
                  <div className="daily-copy">
                    <span className="category-label">{habit.title}</span>
                    <p>{currentAction(state, habit.id)}</p>
                  </div>
                  <button
                    aria-label={`${done ? "Desmarcar" : "Marcar"} ${habit.title}`}
                    aria-pressed={done}
                    className="check-button"
                    onClick={() => toggleCheckIn(habit.id)}
                    type="button"
                  >
                    {done ? "✓" : "Lo hice"}
                  </button>
                </article>
              );
            })}
          </div>

          <section className="review-card" aria-labelledby="review-heading">
            <div className="review-top">
              <div>
                <span className="eyebrow">MIRADA AMABLE</span>
                <h2 id="review-heading">Tus últimos siete días</h2>
              </div>
              <span className="review-icon" aria-hidden="true">↗</span>
            </div>
            <div className="review-stats">
              <div>
                <strong>{weeklySummary.actionsCompleted}</strong>
                <span>acciones registradas</span>
              </div>
              <div>
                <strong>{weeklySummary.activeDays}<small> / 7</small></strong>
                <span>días con algún registro</span>
              </div>
            </div>
            <p className="review-note">
              Es un registro personal, no una medida de salud. ¿Te gustaría hacer más pequeño alguno de tus pasos?
            </p>
            <div className="adapt-row">
              <label className="visually-hidden" htmlFor="adapt-habit">Hábito a simplificar</label>
              <select
                id="adapt-habit"
                onChange={(event) => {
                  const selected = HABITS.find((item) => item.id === event.target.value);
                  setAdaptHabitId(selected?.id ?? "");
                }}
                value={adaptHabitId}
              >
                <option value="">Elige un hábito</option>
                {state.selectedHabitIds.map((id) => {
                  const habit = HABITS.find((item) => item.id === id);
                  return habit ? <option key={id} value={id}>{habit.title}</option> : null;
                })}
              </select>
              <label className="visually-hidden" htmlFor="barrier">Qué lo hizo difícil</label>
              <select
                id="barrier"
                onChange={(event) => {
                  if (isBarrier(event.target.value)) setBarrier(event.target.value);
                }}
                value={barrier}
              >
                <option value="time">Me faltó tiempo</option>
                <option value="energy">Tenía poca energía</option>
                <option value="remembering">Se me olvidó</option>
                <option value="other">Otra razón</option>
              </select>
              <button
                className="button button-light"
                disabled={!adaptHabitId}
                onClick={simplifyHabit}
                type="button"
              >
                Probar más pequeño
              </button>
            </div>
            {state.adaptations.length > 0 && (
              <div className="adaptation-record">
                <p>
                  Último ajuste: «{state.adaptations[state.adaptations.length - 1].from}» → «
                  {state.adaptations[state.adaptations.length - 1].to}»
                </p>
                <button className="text-button" onClick={undoLastAdaptation} type="button">
                  Deshacer último ajuste
                </button>
              </div>
            )}
          </section>

          <section className="review-card" aria-labelledby="weekly-review-heading">
            <div className="review-top">
              <div>
                <span className="eyebrow">MIRADA SEMANAL</span>
                <h2 id="weekly-review-heading">Revisión de tu semana</h2>
              </div>
            </div>
            <p className="muted">Últimos 7 días · es un registro personal, no una medida de salud.</p>
            {weeklySummary.actionsCompleted === 0 && (
              <p className="muted">
                Aún no tienes registros esta semana: también es válido empezar pequeño hoy.
              </p>
            )}
            {thisWeekReview && (
              <p className="inline-notice" role="status">
                Revisión de esta semana guardada ({thisWeekReview.updatedAt.slice(0, 10)}). Puedes
                actualizarla cuando quieras.
              </p>
            )}
            <form onSubmit={submitReview}>
              <fieldset>
                <legend>¿Cómo te sentiste con tus hábitos?</legend>
                {FEEL_OPTIONS.map((option) => (
                  <label key={option.value} className="consent-row">
                    <input
                      checked={reviewDraft.felt === option.value}
                      name="review-felt"
                      onChange={() => setReviewDraft((draft) => ({ ...draft, felt: option.value }))}
                      type="radio"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>¿Qué quieres hacer la próxima semana?</legend>
                {DECISION_OPTIONS.map((option) => (
                  <label key={option.value} className="consent-row">
                    <input
                      checked={reviewDraft.decision === option.value}
                      name="review-decision"
                      onChange={() =>
                        setReviewDraft((draft) => ({ ...draft, decision: option.value }))
                      }
                      type="radio"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
              <div className="adapt-row">
                <button
                  className="button button-light"
                  disabled={reviewDraft.felt === null && reviewDraft.decision === null}
                  type="submit"
                >
                  Guardar revisión
                </button>
                <button className="text-button" onClick={skipReview} type="button">
                  Prefiero no responder
                </button>
              </div>
            </form>
            {reviewNotice && (
              <p className="inline-notice" role="status">
                {reviewNotice}
              </p>
            )}
          </section>

          <p className="evidence-note">
            <span aria-hidden="true">ⓘ</span> Las ideas de este prototipo no son recomendaciones clínicas;
            su evidencia específica está pendiente de revisión.
          </p>
        </section>

        <aside className="side-column">
          <section className="chat-card" aria-labelledby="chat-heading">
            <div className="chat-heading">
              <div className="blu-avatar" aria-hidden="true">b</div>
              <div>
                <span className="eyebrow">ACOMPAÑAMIENTO</span>
                <h2 id="chat-heading">Una pausa con Blu</h2>
              </div>
            </div>
            <p className="chat-disclosure">
              Modo demostración: respuestas predefinidas, no IA generativa. Tus mensajes no se guardan.
            </p>
            <div aria-live="polite" className="chat-messages" role="log">
              {chatMessages.map((message, index) => (
                <p className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}>
                  {message.text}
                </p>
              ))}
            </div>
            <form className="chat-form" onSubmit={sendMessage}>
              <label className="visually-hidden" htmlFor="chat-input">Escribe una reflexión</label>
              <input
                autoComplete="off"
                id="chat-input"
                maxLength={400}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="¿Qué tienes en mente?"
                value={chatInput}
              />
              <button aria-label="Enviar mensaje" disabled={!chatInput.trim()} type="submit">↑</button>
            </form>
            <p className="chat-privacy">No incluyas datos personales ni información médica.</p>
          </section>
          <section className="principle-card">
            <span className="eyebrow">UNA IDEA PARA HOY</span>
            <p>La conexión y el propósito se construyen también con gestos pequeños y elegidos por ti.</p>
            <span className="principle-caption">Reflexión, no consejo clínico</span>
          </section>
        </aside>
      </div>

      <footer className="dashboard-footer">
        <span>Blu es un prototipo local de bienestar; no diagnostica ni trata.</span>
        <div className="adapt-row">
          <button className="text-button" onClick={exportData} type="button">
            Exportar mis datos
          </button>
          <button className="text-button" onClick={openConsentManager} type="button">
            Consentimientos
          </button>
          <button className="text-button" onClick={clearData} type="button">
            Borrar todos los datos
          </button>
        </div>
      </footer>
    </main>
  );
}

function subscribeToClock(onChange: () => void): () => void {
  const timer = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(timer);
}

function getClockSnapshot(): number {
  return Math.floor(Date.now() / 60_000);
}

function getServerClockSnapshot(): number {
  return 0;
}

const PURPOSES: Array<{ id: PurposeId; label: string }> = [
  {
    id: "operativo",
    label:
      "Entiendo que esto es un prototipo. Guardo mis hábitos y registros solo en este navegador, sin cifrado ni sincronización, y puedo borrarlos desde Blu. (requerido)",
  },
  {
    id: "mejora",
    label:
      "Acepto que datos agregados y anónimos orienten la mejora del producto. (opcional)",
  },
  {
    id: "investigacion",
    label:
      "Acepto que datos agregados y anónimos se usen en investigación con revisión ética. (opcional)",
  },
];

const FEEL_OPTIONS: Array<{ value: Felt; label: string }> = [
  { value: "better", label: "Me sentí bien" },
  { value: "same", label: "Más o menos igual" },
  { value: "harder", label: "Se me hizo difícil" },
];

const DECISION_OPTIONS: Array<{ value: ReviewDecision; label: string }> = [
  { value: "keep", label: "Mantener como está" },
  { value: "adjust", label: "Ajustar un hábito" },
];
