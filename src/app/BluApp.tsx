"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import Image from "next/image";
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
import { eraseAllLocalData } from "@/lib/erase";
import { summarizeDays } from "@/lib/history";
import { WeekBars } from "./WeekBars";
import { loadCatalog, type CatalogItem } from "@/lib/habit-catalog";
import { loadEducation } from "@/lib/habit-education";
import SpeakButton from "./SpeakButton";
import {
  getProfileSnapshot,
  getServerProfileSnapshot,
  saveNickname,
  subscribeProfile,
} from "@/lib/profile";
import {
  DAY_NAMES,
  buildDefaultPlan,
  getPlanSnapshot,
  getServerPlanSnapshot,
  savePlan,
  subscribePlans,
  toggleIntention,
} from "@/lib/weekly-plan";
import { loadReviews } from "@/lib/review";
import { loadOnboarding } from "@/lib/onboarding/storage";
import {
  getGoalsSnapshot,
  getServerGoalsSnapshot,
  loadGoalDecisions,
  subscribeGoals,
  type AcceptedGoal,
} from "@/lib/onboarding/goals-storage";
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
  const reviewState = useSyncExternalStore(subscribeReviews, getReviewSnapshot, getServerReviewSnapshot);
  const goalDecisions = useSyncExternalStore(subscribeGoals, getGoalsSnapshot, getServerGoalsSnapshot);
  const localProfile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getServerProfileSnapshot);
  const [nicknameDraft, setNicknameDraft] = useState(localProfile?.nickname ?? "");
  const [localModeNotice, setLocalModeNotice] = useState(false);
  const weeklyPlan = useSyncExternalStore(subscribePlans, getPlanSnapshot, getServerPlanSnapshot);
  const [planNotice, setPlanNotice] = useState("");
  const [historyPeriod, setHistoryPeriod] = useState<7 | 14 | 30>(7);
  const reviews = reviewState.reviews;
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
  const todayHabitsCompleted = state.selectedHabitIds.filter((habitId) =>
    state.checkInsByDate[todayKey]?.includes(habitId),
  ).length;
  const todayProgressMessage =
    todayHabitsCompleted === 0
      ? "Un paso pequeño también cuenta."
      : todayHabitsCompleted === state.selectedHabitIds.length
        ? "Hoy hiciste espacio para ti."
        : "Ya registraste un paso. Sigue a tu ritmo.";
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
    const reviews = loadReviews();
    const errors: string[] = [];
    if (snapshot.error) errors.push(`state: ${snapshot.error}`);
    if (onboarding.error) errors.push(`onboarding: ${onboarding.error}`);
    if (goals.error) errors.push(`goals: ${goals.error}`);
    if (reviews.error) errors.push(`reviews: ${reviews.error}`);
    const bundle = buildExportBundle({
      state: snapshot.error ? null : snapshot.state,
      onboarding: onboarding.assessment,
      goals: goals.decisions,
      reviews: reviews.reviews,
      exportedAt: new Date().toISOString(),
      errors,
    });
    const ok = downloadBundle(bundle, exportFileName(new Date()));
    const partial = errors.length > 0;
    setNotice(
      ok
        ? partial
          ? "La exportación quedó incompleta: no pude leer algunas categorías. El JSON descargado incluye el detalle en «errors»."
          : "Exportaste tus datos. Revisa tu carpeta de descargas."
        : "No pude preparar la exportación en este navegador.",
    );
  }

  const weekKey = getISOWeekKey(today);
  const thisWeekReview = reviews?.find((review) => review.weekKey === weekKey) ?? null;
  const historySummary = summarizeDays(state, today, historyPeriod);
  const habitCatalog = useMemo(() => loadCatalog(), []);
  const habitEducation = useMemo(() => loadEducation(), []);

  function applyMicrohabit(habitId: HabitId, item: CatalogItem) {
    const previous = currentAction(state, habitId);
    if (previous === item.smallerAction) {
      setNotice("Esa versión ya está activa para este hábito.");
      return;
    }
    updateBluState((current) => ({
      ...current,
      adaptations: [
        ...current.adaptations,
        { habitId, from: previous, to: item.smallerAction, barrier: "other", at: new Date().toISOString() },
      ],
    }));
    setNotice(`Listo: «${item.title}» quedó como tu versión actual.`);
  }
  const acceptedGoals = (goalDecisions?.accepted ?? []).filter((goal) =>
    HABITS.some((habit) => habit.id === goal.habitId),
  );

  function generateWeekPlan() {
    const now = new Date().toISOString();
    const habitsForPlan = state.selectedHabitIds.map((id) => {
      const habit = HABITS.find((item) => item.id === id);
      return { habitId: id, action: habit ? currentAction(state, id) : id };
    });
    const plan = buildDefaultPlan(weekKey, habitsForPlan, now);
    const saved = savePlan(plan);
    setPlanNotice(saved.ok ? "Semana sugerida creada; puedes moverla como quieras." : (saved.error ?? "No se pudo guardar."));
  }

  function handleToggleIntention(dayIndex: number, habitId: HabitId) {
    const habit = HABITS.find((item) => item.id === habitId);
    if (!habit || !weeklyPlan) return;
    const result = toggleIntention(
      weeklyPlan,
      dayIndex,
      { habitId, action: currentAction(state, habitId) },
      new Date().toISOString(),
    );
    if (result.error) {
      setPlanNotice(result.error);
      return;
    }
    const saved = savePlan(result.plan);
    setPlanNotice(saved.ok ? "" : (saved.error ?? "No se pudo guardar."));
  }

  function includeGoal(goal: AcceptedGoal) {
    const habitId = goal.habitId as HabitId;
    if (state.selectedHabitIds.includes(habitId)) return;
    if (state.selectedHabitIds.length >= 3) {
      setNotice("Puedes elegir hasta tres hábitos. Quita uno para incluir este.");
      return;
    }
    updateBluState((current) => ({
      ...current,
      selectedHabitIds: [...current.selectedHabitIds, habitId],
    }));
    const habit = HABITS.find((item) => item.id === habitId);
    setNotice(`Incluí «${habit?.title ?? goal.habitId}» en tus hábitos.`);
  }

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
    const result = await respondToMessage(text);
    if (result.usedFallback) {
      setLocalModeNotice(true); // una vez por sesión: honestidad sobre el modo local
    }
    const userMessage: ChatMessage = { role: "you", text };
    const bluMessage: ChatMessage = { role: "blu", text: result.text };
    setChatMessages((messages) =>
      [...messages, userMessage, bluMessage].slice(-40),
    );
    setChatInput("");
  }

  function clearData() {
    if (
      state.consentAcceptedAt &&
      !window.confirm(
        "¿Borrar de este navegador tus hábitos, registros, cuestionario, objetivos y revisiones de Blu?",
      )
    ) {
      return;
    }
    const erased = eraseAllLocalData();
    if (erased.ok) {
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
      setNotice("Se borraron todos los datos de Blu en este navegador.");
    } else {
      setNotice(
        `No se pudieron borrar algunas claves: ${erased.remaining.join(", ")}. Inténtalo desde la configuración del navegador.`,
      );
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
            <Image className="brand-mark" src="/blu-avatar.jpg" alt="" width={35} height={35} />
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
            {(draftSelectedHabitIds.length === 0 || (!consentReady && !purposeDraft.operativo)) && (
              <p className="tiny-note" role="status" aria-live="polite">
                {draftSelectedHabitIds.length === 0
                  ? "Elige al menos un hábito para continuar."
                  : "Falta aceptar el aviso (propósito operativo) para continuar."}
              </p>
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
      <header className="app-header">
        <div className="topbar">
          <a className="brand" href="#" aria-label="Blu, inicio">
            <Image className="brand-mark" src="/blu-avatar.jpg" alt="" width={35} height={35} />
            <span>blu</span>
          </a>
          <div className="topbar-right">
            <span className="prototype-tag">PROTOTIPO LOCAL</span>
            <button className="text-button" onClick={clearData} type="button">
              Borrar mis datos
            </button>
          </div>
        </div>
        <nav className="dashboard-nav" aria-label="Secciones principales">
          <a href="#habits-heading">Hoy</a>
          <a href="#week-plan">Tu semana</a>
          <a href="#review-heading">Progreso</a>
          <a href="#chat-heading">Pausa</a>
          <a href="#privacy-controls">Privacidad</a>
        </nav>
      </header>

      <section className="dashboard-hero" aria-labelledby="today-heading">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span className="hero-kicker-dot" aria-hidden="true" />
            Un día a la vez
          </span>
          <p className="hero-date">
            {today.toLocaleDateString("es-CL", { dateStyle: "long" })}
          </p>
          <h1 id="today-heading">Hoy, elige un paso <span>a tu ritmo.</span></h1>
          <p className="hero-description">
            No hay rachas que perder. Haz espacio para lo que te hace bien, sin exigencias.
          </p>
          <a className="hero-link" href="#habits-heading">
            Ver mis hábitos <span aria-hidden="true">↓</span>
          </a>
        </div>
        <div className="hero-progress">
          <span className="progress-caption">TUS PASOS DE HOY</span>
          <div className="progress-count">
            <strong>{todayHabitsCompleted}</strong>
            <span>
              / {state.selectedHabitIds.length}{" "}
              {state.selectedHabitIds.length === 1 ? "hábito" : "hábitos"}
            </span>
          </div>
          <div
            aria-label="Acciones de hoy"
            aria-valuemax={state.selectedHabitIds.length}
            aria-valuemin={0}
            aria-valuenow={todayHabitsCompleted}
            className="progress-track"
            role="progressbar"
          >
            <span
              style={{
                width: `${(todayHabitsCompleted / state.selectedHabitIds.length) * 100}%`,
              }}
            />
          </div>
          <p className="progress-message" aria-live="polite">{todayProgressMessage}</p>
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
                    <details>
                      <summary className="text-button">Otras versiones</summary>
                      <ul role="list">
                        {habitCatalog.principles
                          .find((entry) => entry.principleId === habit.id)
                          ?.items.filter((item) => item.smallerAction !== currentAction(state, habit.id))
                          .map((item) => (
                            <li key={item.id}>
                              <button
                                className="text-button"
                                onClick={() => applyMicrohabit(habit.id, item)}
                                type="button"
                              >
                                {item.title}: {item.smallerAction}
                              </button>
                            </li>
                          ))}
                      </ul>
                      <p className="tiny-note">{habitCatalog.disclaimer}</p>
                      <p className="tiny-note">¿Para qué puede servir?</p>
                      <ul role="list">
                        {habitEducation.principles
                          .find((entry) => entry.principleId === habit.id)
                          ?.notes.map((note) => (
                            <li key={note.id}>
                              <strong>{note.title}.</strong> {note.text}{" "}
                              <em>
                                Fuente: {note.sourceLabel} (
                                {note.sourceStatus === "verificada" ? "verificada" : "sin evidencia verificada"})
                              </em>
                            </li>
                          ))}
                      </ul>
                    </details>
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

          <section aria-labelledby="space-heading">
            <h2 id="space-heading" className="tiny-note">
              Tu espacio (opcional)
            </h2>
            <p className="tiny-note">
              Un apodo solo para ti, guardado en este navegador. No pedimos correo, nombre ni
              otros datos: la verificación de correo llegará solo cuando exista cuenta en una
              futura versión.
            </p>
            <div className="adapt-row">
              <label className="visually-hidden" htmlFor="nickname">Apodo (opcional)</label>
              <input
                id="nickname"
                maxLength={24}
                onChange={(event) => setNicknameDraft(event.target.value)}
                placeholder="Apodo (opcional)"
                value={nicknameDraft}
              />
              <button
                className="button button-light"
                onClick={() => {
                  const result = saveNickname(nicknameDraft || null, new Date().toISOString());
                  setNotice(result.ok ? "Tu espacio quedó guardado en este navegador." : (result.error ?? "No se pudo guardar."));
                }}
                type="button"
              >
                Guardar
              </button>
            </div>
          </section>

          {acceptedGoals.length > 0 && (
            <section aria-labelledby="accepted-goals-heading">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">DE TU AUTODIAGNÓSTICO</span>
                  <h2 id="accepted-goals-heading">Objetivos que aceptaste</h2>
                </div>
              </div>
              <div className="daily-list">
                {acceptedGoals.map((goal) => {
                  const habit = HABITS.find((item) => item.id === goal.habitId);
                  const already = state.selectedHabitIds.includes(goal.habitId as HabitId);
                  return (
                    <article key={goal.suggestionId} className="daily-card">
                      <div className="daily-copy">
                        <span className="category-label">{habit?.title ?? goal.habitId}</span>
                        <p>{goal.action}</p>
                      </div>
                      <button
                        aria-label={`${already ? "Ya está en tu plan" : "Incluir en tus hábitos"}: ${habit?.title ?? goal.habitId}`}
                        className="check-button"
                        disabled={already}
                        onClick={() => includeGoal(goal)}
                        type="button"
                      >
                        {already ? "En tu plan" : "Incluir"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <details className="review-card" id="week-plan">
            <summary aria-labelledby="week-plan-heading" className="review-top">
              <div>
                <span className="eyebrow">TU SEMANA</span>
                <h2 id="week-plan-heading">Intenciones sugeridas ({weekKey})</h2>
              </div>
            </summary>
            <div className="review-top">
              <div>
                <span className="eyebrow">TU SEMANA</span>
                <h2 id="week-plan-heading">Intenciones sugeridas ({weekKey})</h2>
              </div>
            </div>
            <p className="muted">
              Sugerencias, no obligaciones: un día vacío no rompe nada. Máximo 3 por día.
            </p>
            {!weeklyPlan && state.selectedHabitIds.length > 0 && (
              <button className="button button-light" onClick={generateWeekPlan} type="button">
                Sugerir mi semana
              </button>
            )}
            {weeklyPlan && (
              <ul role="list">
                {weeklyPlan.days.map((day) => (
                  <li key={day.dayIndex} className="consent-row">
                    <span className="category-label">{DAY_NAMES[day.dayIndex]}</span>
                    {day.intentions.length === 0 ? (
                      <span className="muted">Sin intenciones (está bien).</span>
                    ) : (
                      day.intentions.map((intention) => {
                        const habit = HABITS.find((item) => item.id === intention.habitId);
                        return (
                          <button
                            aria-label={`Quitar ${habit?.title ?? intention.habitId} del ${DAY_NAMES[day.dayIndex]}`}
                            className="text-button"
                            key={`${day.dayIndex}-${intention.habitId}`}
                            onClick={() => handleToggleIntention(day.dayIndex, intention.habitId as HabitId)}
                            type="button"
                          >
                            {habit?.title ?? intention.habitId} ✕
                          </button>
                        );
                      })
                    )}
                  </li>
                ))}
              </ul>
            )}
            {planNotice && (
              <p className="inline-notice" role="status">
                {planNotice}
              </p>
            )}
          </details>

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
            <fieldset>
              <legend className="tiny-note">Período del resumen</legend>
              {([7, 14, 30] as const).map((days) => (
                <label key={days} className="consent-row">
                  <input
                    checked={historyPeriod === days}
                    name="history-period"
                    onChange={() => setHistoryPeriod(days)}
                    type="radio"
                  />
                  <span>{days} días</span>
                </label>
              ))}
            </fieldset>
            <p className="review-note" role="status" aria-live="polite">
              Últimos {historySummary.periodDays} días: {historySummary.totalActions} acciones en{" "}
              {historySummary.activeDays} días con registro.
            </p>
            {historyPeriod === 7 && <WeekBars days={summarizeDays(state, today, 7).days} />}
            {historySummary.totalActions === 0 && (
              <p className="muted">
                Aún no hay registros en este período: tu primer paso puede ser pequeñísimo.
              </p>
            )}
            <div tabIndex={0} style={{ maxHeight: "9rem", overflowY: "auto" }}>
              <ul role="list">
                {historySummary.days.map((day) => (
                  <li key={day.date}>
                    <span className="tiny-note">{day.date.split("-").reverse().join("/")}</span>{" "}
                    {day.count === 0 ? <span className="muted">sin registros</span> : `${day.count} acción/es`}
                  </li>
                ))}
              </ul>
            </div>
            <p className="tiny-note">
              Métricas de uso del producto (descriptivas): no miden salud ni eficacia (BLU-1204).
            </p>
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
            {reviewState.error && (
              <p className="inline-notice" role="alert">
                No pude leer tus revisiones guardadas: {reviewState.error}
              </p>
            )}
            {thisWeekReview && (
              <p className="inline-notice" role="status">
                Revisión de esta semana guardada ({thisWeekReview.updatedAt.slice(0, 10)}). Puedes
                actualizarla cuando quieras.
              </p>
            )}
            {thisWeekReview?.decision === "adjust" && (
              <p className="inline-notice" role="status">
                Elegiste ajustar un hábito. En la pantalla principal, dentro de «Tus últimos siete
                días», selecciona el hábito y pulsa «Probar más pequeño». Nada cambia hasta que tú
                lo confirmes.{" "}
                <Link className="text-button" href="/">
                  Ir a mis hábitos
                </Link>
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
              <div className="blu-avatar" aria-hidden="true">
                <Image src="/blu-avatar.jpg" alt="" width={38} height={38} />
              </div>
              <div>
                <span className="eyebrow">ACOMPAÑAMIENTO</span>
                <h2 id="chat-heading">Una pausa con Blu</h2>
              </div>
            </div>
            <p className="chat-disclosure">
              Modo demostración: respuestas predefinidas, no IA generativa. Tus mensajes no se guardan.
            </p>
            {localModeNotice && (
              <p className="tiny-note" role="status">
                Respondí en modo local: no pude contactar al servidor. El texto sigue igual de
                privado, en este navegador.
              </p>
            )}
            <div aria-live="polite" className="chat-messages" role="log">
              {chatMessages.map((message, index) => (
                <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}>
                  <p>{message.text}</p>
                  {message.role === "blu" && <SpeakButton text={message.text} />}
                </div>
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

      <footer className="dashboard-footer" id="privacy-controls">
        <span>Blu es un prototipo local de bienestar; no diagnostica ni trata.</span>
        <p className="tiny-note">
          «Exportar mis datos» descarga un JSON con todo lo que Blu guarda en este navegador
          (hábitos, registros, cuestionario, objetivos y revisiones). «Borrar todos los datos»
          elimina todas esas claves y verifica el borrado.
        </p>
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
