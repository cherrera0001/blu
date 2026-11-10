"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import {
  HABITS,
  MAX_SELECTED_HABITS,
  currentAction,
  getWeeklySummary,
  isBarrier,
  localDateKey,
  type Barrier,
  type HabitId,
} from "@/lib/blu";
import { readCompanion } from "@/lib/companion";
import { getLocale, subscribeLocale, translate, type Locale } from "@/lib/i18n";
import { LanguageControl } from "./LanguageControl";
import {
  DECLARED_LABELS,
  DECLARED_LEVELS,
  refinePortrait,
  savePortrait,
  getPortraitSnapshot,
  getServerPortraitSnapshot,
  subscribePortrait,
  type DeclaredLevel,
  type Portrait,
  type RefinedPortrait,
} from "@/lib/portrait";
import { respondToMessage, type FallbackReason } from "@/lib/conversation";
import {
  disableReminders,
  enableReminders,
  getReminderPermission,
  loadReminderSettings,
  maybeSendReminder,
  subscribeReminders,
  type ReminderPermission,
} from "@/lib/reminders";
import BluPresence, { type BluPresenceState } from "./BluPresence";
import { buildExportBundle, downloadBundle, exportFileName } from "@/lib/export";
import { eraseAllLocalData } from "@/lib/erase";
import { summarizeDays } from "@/lib/history";
import { WeekBars } from "./WeekBars";
import { loadCatalog, type CatalogItem } from "@/lib/habit-catalog";
import { loadEducation } from "@/lib/habit-education";
import { TraceabilityNote } from "./TraceabilityNote";
import { activeTelemetry, initTelemetry } from "@/lib/observability/telemetry";
import SpeakButton, { speakLocalText, stopActiveSpeech, type VoiceProfile } from "./SpeakButton";
import { BLU_GREETING } from "@/lib/conversation";
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

let reminderSnapshotCache: {
  enabled: boolean;
  permission: ReminderPermission;
  version: number;
} | null = null;
const serverReminderSnapshot = {
  enabled: false,
  permission: "unsupported" as const,
  version: 0,
};

/** Snapshot estable para useSyncExternalStore (mismo objeto mientras nada cambia). */
function getReminderSnapshot(version: number) {
  const enabled = loadReminderSettings().enabled;
  const permission = getReminderPermission();
  if (
    reminderSnapshotCache &&
    reminderSnapshotCache.version === version &&
    reminderSnapshotCache.enabled === enabled &&
    reminderSnapshotCache.permission === permission
  ) {
    return reminderSnapshotCache;
  }
  reminderSnapshotCache = { enabled, permission, version };
  return reminderSnapshotCache;
}

const PILLAR_IDS: HabitId[] = ["nourishment", "movement", "community", "purpose"];

export default function Home() {
  const snapshot = useSyncExternalStore(subscribeToBlu, getBluSnapshot, getServerBluSnapshot);
  const clockMinute = useSyncExternalStore(subscribeToClock, getClockSnapshot, getServerClockSnapshot);
  const locale = useSyncExternalStore(subscribeLocale, getLocale, () => "es" as Locale);
  const portrait = useSyncExternalStore(subscribePortrait, getPortraitSnapshot, getServerPortraitSnapshot);
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
  const [localModeReason, setLocalModeReason] = useState<FallbackReason | null>(null);
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
  const [portraitEditing, setPortraitEditing] = useState(false);
  const [portraitDismissed, setPortraitDismissed] = useState(false);
  const [portraitDraft, setPortraitDraft] = useState<Partial<Record<HabitId, DeclaredLevel>>>({});
  const [chatInput, setChatInput] = useState("");
  const [assistantRemote, setAssistantRemote] = useState(false);
  const [chatPresence, setChatPresence] = useState<BluPresenceState>("welcome");
  const [heroPresence, setHeroPresence] = useState<BluPresenceState>("welcome");
  const [reminderVersion, setReminderVersion] = useState(0);
  const [reminderNotice, setReminderNotice] = useState("");
  const reminderState = useSyncExternalStore(
    subscribeReminders,
    () => getReminderSnapshot(reminderVersion),
    () => serverReminderSnapshot,
  );
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>("warm");
  const [azureVoiceEnabled, setAzureVoiceEnabled] = useState(false);
  const [azureVoiceLoading, setAzureVoiceLoading] = useState(false);
  const [azureVoiceNotice, setAzureVoiceNotice] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "blu",
      text: BLU_GREETING,
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
  const todayProgressMessage = translate(
    locale,
    todayHabitsCompleted === 0
      ? "Un paso pequeño también cuenta."
      : todayHabitsCompleted === state.selectedHabitIds.length
        ? "Hoy hiciste espacio para ti."
        : "Ya registraste un paso. Sigue a tu ritmo.",
  );
  const companion = readCompanion(state, today);
  function phrase(key: string, vars: Record<string, string> = {}): string {
    let text = translate(locale, key);
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(translate(locale, value));
    }
    return text;
  }
  const welcomeSpeech = [
    translate(locale, "Hola, soy Blu. Te acompaño en pasos pequeños, sin promesas grandes."),
    translate(locale, "Un cambio pequeño también cuenta."),
    translate(
      locale,
      "Elige algo que te gustaría explorar. No necesitas cambiarlo todo hoy ni hacerlo perfecto.",
    ),
  ].join(" ");
  const todaySpeech = [
    translate(locale, "Hoy, elige un paso a tu ritmo."),
    translate(locale, "No hay rachas que perder. Haz espacio para lo que te hace bien, sin exigencias."),
    translate(locale, companion.line),
    todayProgressMessage,
  ].join(" ");
  const screenSpeech =
    !state.consentAcceptedAt || state.selectedHabitIds.length === 0 || editingSelection
      ? welcomeSpeech
      : todaySpeech;
  const spokenLocale = useRef<Locale | null>(null);
  useEffect(() => {
    if (spokenLocale.current === null) {
      spokenLocale.current = locale;
      return;
    }
    if (spokenLocale.current === locale) return;
    spokenLocale.current = locale;
    speakLocalText(screenSpeech, locale);
  }, [locale, screenSpeech]);
  const refined = refinePortrait(portrait, state, today);
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

  function saveStartingPoint() {
    const next: Portrait = {
      version: 1,
      declaredAt: new Date().toISOString(),
      levels: portraitDraft,
    };
    if (!savePortrait(next)) {
      setNotice(translate(locale, "No pude guardar el punto de partida en este navegador."));
      return;
    }
    setPortraitEditing(false);
    setPortraitDismissed(false);
    setNotice(translate(locale, "Punto de partida guardado. Se irá afinando con los pasos que marques."));
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

  async function toggleAzureVoice() {
    if (azureVoiceEnabled) {
      stopActiveSpeech();
      setAzureVoiceEnabled(false);
      setAzureVoiceNotice(
        translate(locale, "Voz del dispositivo activada. La lectura no envía el texto fuera de tu dispositivo."),
      );
      return;
    }

    setAzureVoiceLoading(true);
    setAzureVoiceNotice("");
    try {
      const response = await fetch("/api/voice", { cache: "no-store" });
      const result: unknown = await response.json();
      const natural =
        typeof result === "object" &&
        result !== null &&
        (("naturalAvailable" in result && result.naturalAvailable === true) ||
          ("elevenlabsAvailable" in result && result.elevenlabsAvailable === true) ||
          ("azureAvailable" in result && result.azureAvailable === true));
      if (!response.ok || !natural) {
        setAzureVoiceNotice(
          translate(locale, "La voz natural aún no está configurada. Puedes seguir usando la voz de tu dispositivo."),
        );
        return;
      }
      setAzureVoiceEnabled(true);
      setAzureVoiceNotice(translate(locale, "Voz natural activada para esta sesión."));
    } catch {
      setAzureVoiceNotice(
        translate(locale, "No pude comprobar la voz natural. Puedes seguir usando la voz de tu dispositivo."),
      );
    } finally {
      setAzureVoiceLoading(false);
    }
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
          ? translate(locale, "La exportación quedó incompleta: no pude leer algunas categorías. El JSON descargado incluye el detalle en «errors».")
          : translate(locale, "Exportaste tus datos. Revisa tu carpeta de descargas.")
        : translate(locale, "No pude preparar la exportación en este navegador."),
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
      setNotice(translate(locale, "Esa versión ya está activa para este hábito."));
      return;
    }
    updateBluState((current) => ({
      ...current,
      adaptations: [
        ...current.adaptations,
        { habitId, from: previous, to: item.smallerAction, barrier: "other", at: new Date().toISOString() },
      ],
    }));
    setNotice(
      phrase("Listo: «{title}» quedó como tu versión actual.", { title: item.title }),
    );
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
    setPlanNotice(
      saved.ok
        ? translate(locale, "Semana sugerida creada; puedes moverla como quieras.")
        : (saved.error ?? translate(locale, "No se pudo guardar.")),
    );
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
    setPlanNotice(saved.ok ? "" : (saved.error ?? translate(locale, "No se pudo guardar.")));
  }

  function includeGoal(goal: AcceptedGoal) {
    const habitId = goal.habitId as HabitId;
    if (state.selectedHabitIds.includes(habitId)) return;
    if (state.selectedHabitIds.length >= MAX_SELECTED_HABITS) {
      setNotice(translate(locale, "Puedes elegir hasta cuatro hábitos. Quita uno para incluir este."));
      return;
    }
    updateBluState((current) => ({
      ...current,
      selectedHabitIds: [...current.selectedHabitIds, habitId],
    }));
    const habit = HABITS.find((item) => item.id === habitId);
    setNotice(phrase("Incluí «{title}» en tus hábitos.", { title: habit?.title ?? goal.habitId }));
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
        ? translate(locale, "Revisión guardada. Gracias por mirar tu semana.")
        : (result.error ?? translate(locale, "No se pudo guardar tu revisión.")),
    );
    if (result.ok) setReviewDraft({ felt: null, decision: null });
  }

  function skipReview() {
    const result = saveReview({ weekKey }, new Date().toISOString());
    setReviewNotice(
      result.ok
        ? translate(locale, "Quedó registrado que omitiste esta semana.")
        : (result.error ?? "No se pudo guardar tu revisión."),
    );
  }

  function toggleHabit(habitId: HabitId) {
    const alreadySelected = draftSelectedHabitIds.includes(habitId);
    if (!alreadySelected && draftSelectedHabitIds.length >= MAX_SELECTED_HABITS) {
      setNotice(translate(locale, "Puedes elegir hasta cuatro hábitos. Quita uno para elegir otro."));
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
    if (!state.checkInsByDate[todayKey]?.includes(habitId)) {
      setHeroPresence("acknowledge"); // primer gesto real: la persona marcó un paso (UX-07)
      activeTelemetry()?.record("checkin_completado"); // sin hábito: lista blanca v1
    }
  }

  // Telemetría mínima sin PII (BLU-1404): solo con consentimiento «mejora»,
  // eventos de la lista blanca, buffer local sin frontera de red. La sesión
  // arranca cuando el consentimiento se activa (nunca antes).
  const telemetryConsent = useRef(false);
  const telemetryStarted = useRef(false);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    initTelemetry({
      hasConsent: () => telemetryConsent.current,
      now: () => new Date().toISOString(),
    });
  }, []);
  useEffect(() => {
    telemetryConsent.current = hasPurpose(state.consent, "mejora");
    if (telemetryConsent.current && !telemetryStarted.current) {
      telemetryStarted.current = true;
      activeTelemetry()?.record("app_opened");
    }
  }, [state.consent]);

  // Recordatorio amable local (BLU-1502): sin servidor ni cuenta; solo con Blu abierta.
  useEffect(() => {
    const check = () => {
      maybeSendReminder({
        todayHabitIds: state.selectedHabitIds,
        doneHabitIds: state.checkInsByDate[todayKey] ?? [],
      });
    };
    check();
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, [state.selectedHabitIds, state.checkInsByDate, todayKey]);

  async function toggleReminders() {
    setReminderNotice("");
    if (reminderState.enabled) {
      disableReminders();
      setReminderVersion((v) => v + 1);
      setReminderNotice(translate(locale, "Recordatorio desactivado. Puedes activarlo cuando quieras."));
      return;
    }
    const result = await enableReminders();
    setReminderVersion((v) => v + 1);
    setReminderNotice(
      result.ok
        ? translate(locale, "Recordatorio activado: máximo uno al día, solo si quedan pasos sin marcar.")
        : translate(locale, "Sin permiso del navegador, no activo nada. Puedes intentarlo de nuevo desde la configuración del sitio."),
    );
  }

  function simplifyHabit() {
    if (!adaptHabitId) return;
    const habit = HABITS.find((item) => item.id === adaptHabitId);
    if (!habit) return;
    const previous = currentAction(state, habit.id);
    if (previous === habit.smallerAction) {
      setNotice(translate(locale, "Este hábito ya está en su versión más pequeña."));
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
    setNotice(translate(locale, "Listo. Dejé registrada la versión más pequeña que elegiste."));
  }

  function undoLastAdaptation() {
    updateBluState((current) => ({
      ...current,
      adaptations: current.adaptations.slice(0, -1),
    }));
    setNotice(translate(locale, "Se deshizo el último ajuste. Puedes elegir otro cuando quieras."));
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setChatPresence("responding");
    const result = await respondToMessage(text, {
      locale,
      habitIds: state.selectedHabitIds,
      todayDone: todayHabitsCompleted,
      todayTotal: state.selectedHabitIds.length,
      mood: companion.mood,
      declared: portrait?.levels ?? {},
      observedDays: refined.observedDays,
    });
    setAssistantRemote(result.providerId === "remote");
    activeTelemetry()?.record("chat_mensaje_enviado", {
      modo: result.providerId === "remote" ? "remoto" : "local",
    });
    setChatPresence(result.usedFallback ? "unavailable" : "acknowledge");
    if (result.usedFallback) {
      setLocalModeReason((current) => current ?? result.fallbackReason); // una vez por sesión (UX-06)
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
        translate(locale, "¿Borrar de este navegador tus hábitos, registros, cuestionario, objetivos y revisiones de Blu?"),
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
      setPortraitDraft({});
      setPortraitEditing(false);
      setPortraitDismissed(false);
      setChatMessages([
        {
          role: "blu",
          text: BLU_GREETING,
        },
      ]);
      setChatPresence("welcome");
      setHeroPresence("welcome");
      setNotice(translate(locale, "Se borraron todos los datos de Blu en este navegador."));
    } else {
      setNotice(
        phrase("No se pudieron borrar algunas claves: {keys}. Inténtalo desde la configuración del navegador.", {
          keys: erased.remaining.join(", "),
        }),
      );
    }
  }

  if (snapshot.error) {
    return (
      <div className="error-screen">
        <LanguageControl locale={locale} />
        <section className="error-card" role="alert">
          <span className="eyebrow">{translate(locale, "Privacidad y datos")}</span>
          <h1>{translate(locale, "No pude acceder a tus datos")}</h1>
          <p>{translate(locale, snapshot.error)}</p>
          <p>{translate(locale, "Si eliges reiniciar, se borrarán los datos de Blu guardados en este navegador.")}</p>
          <button className="button button-dark" onClick={clearData} type="button">
            {translate(locale, "Borrar datos y reiniciar")}
          </button>
        </section>
      </div>
    );
  }

  if (!state.consentAcceptedAt || state.selectedHabitIds.length === 0 || editingSelection || managingConsent) {
    return (
      <div className="onboarding">
        <header className="topbar">
          <a className="brand" href="#" aria-label={translate(locale, "Blu, inicio")}>
            <BluPresence size="sm" />
            <span>blu</span>
          </a>
          <span className="prototype-tag">{translate(locale, "Versión de prueba")}</span>
          <LanguageControl locale={locale} />
        </header>
        <section className="welcome-panel">
          <div className="welcome-copy">
            <div className="blu-intro">
              <BluPresence size="lg" state="welcome" />
              <p className="blu-intro-line">
                {translate(locale, "Hola, soy Blu. Te acompaño en pasos pequeños, sin promesas grandes.")}
              </p>
              <SpeakButton
                locale={locale}
                text={translate(locale, "Hola, soy Blu. Te acompaño en pasos pequeños, sin promesas grandes.")}
              />
            </div>
            <span className="eyebrow">{translate(locale, "TU BIENESTAR, UN DÍA A LA VEZ")}</span>
            <h1>{translate(locale, "Un cambio pequeño también cuenta.")}</h1>
            <p>
              {translate(
                locale,
                "Elige algo que te gustaría explorar. No necesitas cambiarlo todo hoy ni hacerlo perfecto.",
              )}
            </p>
            <div className="disclaimer">
              <span aria-hidden="true">ⓘ</span>
              <p>
                {translate(
                  locale,
                  "Blu es un prototipo de bienestar, no una herramienta clínica. No ofrece consejos médicos ni promete vivir más años.",
                )}
              </p>
            </div>
          </div>
          <div className="onboarding-card">
            <div className="card-heading">
              <span className="step-label">
                {editingSelection
                  ? translate(locale, "AJUSTA TU SELECCIÓN")
                  : translate(locale, "PRIMER PASO")}
              </span>
              <span className="step-count">01 / 02</span>
            </div>
            <h2>{translate(locale, "¿Qué te gustaría cuidar?")}</h2>
            <p className="muted">{translate(locale, "Elige entre uno y cuatro temas. Tú decides el ritmo.")}</p>
            <div className="habit-grid">
              {[
                ...PILLAR_IDS.flatMap((id) => {
                  const habit = HABITS.find((item) => item.id === id);
                  return habit ? [habit] : [];
                }),
                ...HABITS.filter(
                  (habit) => !PILLAR_IDS.includes(habit.id) && draftSelectedHabitIds.includes(habit.id),
                ),
              ].map((habit) => {
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
                    <span>{translate(locale, habit.title)}</span>
                    <span className="selection-indicator" aria-hidden="true">
                      {selected ? "✓" : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
            {draftSelectedHabitIds.some((id) => !PILLAR_IDS.includes(id)) && (
              <p className="tiny-note">
                {translate(
                  locale,
                  "Algunos temas que ya tenías no están entre los cuatro pilares. Puedes quitarlos y elegir de nuevo.",
                )}
              </p>
            )}
            <p aria-live="polite" className="selection-count">
              {draftSelectedHabitIds.length} {translate(locale, "de 4 elegidos")}
            </p>
            {showConsentEditor && (
              <fieldset>
                <legend className="tiny-note">
                  {phrase("Consentimientos · aviso versión {version}", { version: CONSENT_VERSION })}
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
                    <span>{translate(locale, purpose.label)}</span>
                  </label>
                ))}
                {consentReady && (
                  <p className="tiny-note">
                    {translate(locale, "Para retirar el propósito operativo usa «Borrar mis datos».")}
                  </p>
                )}
              </fieldset>
            )}
            {(draftSelectedHabitIds.length === 0 || (!consentReady && !purposeDraft.operativo)) && (
              <p className="tiny-note" role="status" aria-live="polite">
                {draftSelectedHabitIds.length === 0
                  ? translate(locale, "Elige al menos un hábito para continuar.")
                  : translate(locale, "Falta aceptar el aviso (propósito operativo) para continuar.")}
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
              {editingSelection
                ? translate(locale, "Guardar selección")
                : translate(locale, "Empezar con lo que elegí")}{" "}
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
                {translate(locale, "Cancelar")}
              </button>
            )}
            {notice && <p className="inline-notice" role="status">{notice}</p>}
            <p className="tiny-note">{translate(locale, "No escribas información médica ni datos que te identifiquen.")}</p>
            <p className="tiny-note">
              {translate(locale, "¿Prefieres partir con una autoevaluación?")}{" "}
              <Link href="/cuestionario">
                {translate(locale, "Hacer el autodiagnóstico largo (opcional, experimental)")}
              </Link>
            </p>
          </div>
        </section>
        <footer className="page-footer">
          <span>{translate(locale, "Cuatro pilares: alimentación, movimiento, comunidad y propósito.")}</span>
          <span>{translate(locale, "Sin cuenta · Tus hábitos se guardan en este navegador")}</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="app-header">
        <div className="topbar">
          <a className="brand" href="#" aria-label={translate(locale, "Blu, inicio")}>
            <BluPresence size="sm" />
            <span>blu</span>
          </a>
          <div className="topbar-right">
            <span className="prototype-tag">{translate(locale, "Versión de prueba")}</span>
            <LanguageControl locale={locale} />
            <button className="text-button" onClick={clearData} type="button">
              {translate(locale, "Borrar mis datos")}
            </button>
          </div>
        </div>
        <nav className="dashboard-nav" aria-label={translate(locale, "Secciones principales")}>
          <a href="#chat-heading" onClick={() => setChatPresence("pause")}>
            {translate(locale, "Pausa con Blu")}
          </a>
          <a href="#habits-heading">{translate(locale, "Hoy")}</a>
          <a href="#week-plan">{translate(locale, "Tu semana")}</a>
          <a href="#review-heading">{translate(locale, "Progreso")}</a>
          <a href="#privacy-controls">{translate(locale, "Privacidad")}</a>
        </nav>
      </header>

      <section className="dashboard-hero" aria-labelledby="today-heading">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span className="hero-kicker-dot" aria-hidden="true" />
            {translate(locale, "Un día a la vez")}
          </span>
          <p className="hero-date">
            {today.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 id="today-heading">
            {locale === "es" ? (
              <>
                Hoy, elige un paso <span>a tu ritmo.</span>
              </>
            ) : (
              translate(locale, "Hoy, elige un paso a tu ritmo.")
            )}
          </h1>
          <p className="hero-description">
            {translate(locale, "No hay rachas que perder. Haz espacio para lo que te hace bien, sin exigencias.")}
          </p>
          <a className="hero-link" href="#habits-heading">
            {translate(locale, "Ir a mis hábitos")} <span aria-hidden="true">↓</span>
          </a>
        </div>
        <div className="hero-blu">
          <BluPresence mood={companion.mood} pose={companion.pose} size="lg" state={heroPresence} />
          <p className="companion-line">{translate(locale, companion.line)}</p>
          <SpeakButton locale={locale} text={todaySpeech} />
        </div>
        <div className="hero-progress">
          <span className="progress-caption">{translate(locale, "TU PASO DE HOY")}</span>
          <div className="progress-count">
            <strong>{todayHabitsCompleted}</strong>
            <span>
              / {state.selectedHabitIds.length}{" "}
              {translate(locale, state.selectedHabitIds.length === 1 ? "hábito" : "hábitos")}
            </span>
          </div>
          <div
            aria-label={translate(locale, "Acciones de hoy")}
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
        <div className="reminder-box">
          <button
            className="text-button"
            disabled={reminderState.permission === "unsupported"}
            onClick={toggleReminders}
            type="button"
          >
            {translate(locale, reminderState.enabled ? "Desactivar recordatorio" : "Activar recordatorio de la mañana")}
          </button>
          <p className="tiny-note">
            {translate(
              locale,
              reminderState.permission === "unsupported"
                ? "Tu navegador no permite recordatorios."
                : reminderState.permission === "denied" && !reminderState.enabled
                  ? "Quedaron bloqueados en el navegador; puedes permitirlos en la configuración del sitio."
                  : "Máximo uno al día, solo si quedan pasos sin marcar. Funciona con Blu abierta; sin cuenta ni servidor.",
            )}
          </p>
          {reminderNotice && (
            <p className="inline-notice" role="status">{reminderNotice}</p>
          )}
        </div>
      </section>

      {notice && <p className="toast" role="status">{notice}</p>}

      <PortraitPanel
        draft={portraitDraft}
        habitIds={state.selectedHabitIds}
        locale={locale}
        onDismiss={() => {
          setPortraitEditing(false);
          setPortraitDismissed(true);
        }}
        onDraft={(habitId, level) =>
          setPortraitDraft((current) => ({ ...current, [habitId]: level }))
        }
        onEdit={() => {
          setPortraitDraft(portrait?.levels ?? {});
          setPortraitDismissed(false);
          setPortraitEditing(true);
        }}
        onSave={saveStartingPoint}
        open={portraitEditing || (portrait === null && !portraitDismissed)}
        refined={refined}
      />

      {state.consentAcceptedAt && needsReconsent(state.consent) && (
        <p className="inline-notice" role="status">
          {phrase("Actualizamos el aviso de consentimiento (versión {version}). Tu uso sigue igual hasta que renueves.", { version: CONSENT_VERSION })}{" "}
          <button className="text-button" onClick={openConsentManager} type="button">
            {translate(locale, "Revisar y renovar")}
          </button>
        </p>
      )}

      <div className="content-grid">
        <section className="main-column" aria-labelledby="habits-heading">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{translate(locale, "TU ESPACIO")}</span>
              <h2 id="habits-heading">{translate(locale, "Hábitos que elegiste")}</h2>
            </div>
            <button
              className="text-button"
              onClick={() => {
                setDraftSelectedHabitIds(state.selectedHabitIds);
                setEditingSelection(true);
              }}
              type="button"
            >
              {translate(locale, "Cambiar selección")}
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
                    <span className="category-label">{translate(locale, habit.title)}</span>
                    <p>{translate(locale, currentAction(state, habit.id))}</p>
                    <details>
                      <summary className="text-button">{translate(locale, "Otras versiones")}</summary>
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
                                {translate(locale, item.title)}: {translate(locale, item.smallerAction)}
                              </button>
                            </li>
                          ))}
                      </ul>
                      <p className="tiny-note">{translate(locale, habitCatalog.disclaimer)}</p>
                    </details>
                    <details className="why-suggested">
                      <summary className="text-button">{translate(locale, "¿Por qué me lo sugiere?")}</summary>
                      <ul role="list">
                        {habitEducation.principles
                          .find((entry) => entry.principleId === habit.id)
                          ?.notes.map((note) => (
                            <li key={note.id}>
                              <strong>{translate(locale, note.title)}.</strong> {translate(locale, note.text)}{" "}
                              <TraceabilityNote locale={locale} note={note} />
                            </li>
                          ))}
                      </ul>
                    </details>
                  </div>
                  <button
                    aria-label={`${translate(locale, done ? "Desmarcar" : "Marcar")} ${translate(locale, habit.title)}`}
                    aria-pressed={done}
                    className="check-button"
                    onClick={() => toggleCheckIn(habit.id)}
                    type="button"
                  >
                    {done ? "✓" : translate(locale, "Lo hice")}
                  </button>
                </article>
              );
            })}
          </div>

          <section aria-labelledby="space-heading">
            <details className="space-details">
              <summary>
                <h2 id="space-heading" className="tiny-note">
                  {translate(locale, "Personaliza tu espacio")}
                </h2>
                <span className="optional-label">{translate(locale, "Opcional")}</span>
              </summary>
            <p className="tiny-note">
              {translate(locale, "Un apodo solo para ti, guardado en este navegador. No pedimos correo, nombre ni otros datos: la verificación de correo llegará solo cuando exista cuenta en una futura versión.")}
            </p>
            <div className="adapt-row">
              <label className="visually-hidden" htmlFor="nickname">{translate(locale, "Apodo (opcional)")}</label>
              <input
                id="nickname"
                maxLength={24}
                onChange={(event) => setNicknameDraft(event.target.value)}
                placeholder={translate(locale, "Apodo (opcional)")}
                value={nicknameDraft}
              />
              <button
                className="button button-light"
                onClick={() => {
                  const result = saveNickname(nicknameDraft || null, new Date().toISOString());
                  setNotice(
                    result.ok
                      ? translate(locale, "Tu espacio quedó guardado en este navegador.")
                      : (result.error ?? translate(locale, "No se pudo guardar.")),
                  );
                }}
                type="button"
              >
                {translate(locale, "Guardar")}
              </button>
            </div>
            </details>
          </section>

          {acceptedGoals.length > 0 && (
            <section aria-labelledby="accepted-goals-heading">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{translate(locale, "DE TU AUTODIAGNÓSTICO")}</span>
                  <h2 id="accepted-goals-heading">{translate(locale, "Objetivos que aceptaste")}</h2>
                </div>
              </div>
              <div className="daily-list">
                {acceptedGoals.map((goal) => {
                  const habit = HABITS.find((item) => item.id === goal.habitId);
                  const already = state.selectedHabitIds.includes(goal.habitId as HabitId);
                  return (
                    <article key={goal.suggestionId} className="daily-card">
                      <div className="daily-copy">
                        <span className="category-label">{translate(locale, habit?.title ?? goal.habitId)}</span>
                        <p>{translate(locale, goal.action)}</p>
                      </div>
                      <button
                        aria-label={`${translate(locale, already ? "Ya está en tu plan" : "Incluir en tus hábitos")}: ${translate(locale, habit?.title ?? goal.habitId)}`}
                        className="check-button"
                        disabled={already}
                        onClick={() => includeGoal(goal)}
                        type="button"
                      >
                        {translate(locale, already ? "En tu plan" : "Incluir")}
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
                <span className="eyebrow">{translate(locale, "TU SEMANA")}</span>
                <h2 id="week-plan-heading">{translate(locale, "Tu plan de la semana")}</h2>
              </div>
            </summary>
            <p className="muted">
              {translate(locale, "Sugerencias, no obligaciones: un día vacío no rompe nada. Máximo 3 por día.")}
            </p>
            {!weeklyPlan && state.selectedHabitIds.length > 0 && (
              <button className="button button-light" onClick={generateWeekPlan} type="button">
                {translate(locale, "Sugerir mi semana")}
              </button>
            )}
            {weeklyPlan && (
              <ul role="list">
                {weeklyPlan.days.map((day) => (
                  <li key={day.dayIndex} className="consent-row">
                    <span className="category-label">{translate(locale, DAY_NAMES[day.dayIndex])}</span>
                    {day.intentions.length === 0 ? (
                      <span className="muted">{translate(locale, "Sin intenciones (está bien).")}</span>
                    ) : (
                      day.intentions.map((intention) => {
                        const habit = HABITS.find((item) => item.id === intention.habitId);
                        const title = translate(locale, habit?.title ?? intention.habitId);
                        const dayName = translate(locale, DAY_NAMES[day.dayIndex]);
                        return (
                          <button
                            aria-label={phrase("Quitar {title} del {day}", { title, day: dayName })}
                            className="text-button"
                            key={`${day.dayIndex}-${intention.habitId}`}
                            onClick={() => handleToggleIntention(day.dayIndex, intention.habitId as HabitId)}
                            type="button"
                          >
                            {title} ✕
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

          <section className="review-card activity-card" aria-labelledby="review-heading">
            <div className="review-top">
              <div>
                <span className="eyebrow">{translate(locale, "REGISTRO PERSONAL")}</span>
                <h2 id="review-heading">{translate(locale, "Tu actividad")}</h2>
              </div>
            </div>
            <div className="review-stats">
              <div>
                <strong>{historySummary.totalActions}</strong>
                <span>{translate(locale, "acciones registradas")}</span>
              </div>
              <div>
                <strong>{historySummary.activeDays}<small> / {historySummary.periodDays}</small></strong>
                <span>{translate(locale, "días con algún registro")}</span>
              </div>
            </div>
            <fieldset className="period-picker">
              <legend>{translate(locale, "Ver período")}</legend>
              {([7, 14, 30] as const).map((days) => (
                <label key={days} className="consent-row">
                  <input
                    checked={historyPeriod === days}
                    name="history-period"
                    onChange={() => setHistoryPeriod(days)}
                    type="radio"
                  />
                  <span>{phrase("{n} días", { n: String(days) })}</span>
                </label>
              ))}
            </fieldset>
            <p className="review-note" role="status" aria-live="polite">
              {phrase("Últimos {period} días: {actions} acciones en {active} días con registro.", {
                period: String(historySummary.periodDays),
                actions: String(historySummary.totalActions),
                active: String(historySummary.activeDays),
              })}
            </p>
            {historySummary.totalActions === 0 && (
              <div className="review-empty-state">
                <p>{phrase("Aún no hay pasos registrados en estos {period} días.", { period: String(historySummary.periodDays) })}</p>
                <a href="#habits-heading">{translate(locale, "Cuando pruebes uno, podrás marcarlo aquí.")}</a>
              </div>
            )}
            {historySummary.totalActions > 0 && (
              <div className="review-history">
                {historyPeriod === 7 && <WeekBars days={historySummary.days} locale={locale} />}
                <ul
                  aria-label={phrase("Detalle de los últimos {period} días", { period: String(historySummary.periodDays) })}
                  className="history-days"
                >
                  {historySummary.days.map((day) => (
                    <li
                      className={day.count > 0 ? "history-day has-activity" : "history-day"}
                      key={day.date}
                    >
                      <time dateTime={day.date}>{formatHistoryDate(day.date, locale)}</time>
                      <span>
                        {day.count === 0
                          ? translate(locale, "Sin pasos")
                          : `${day.count} ${translate(locale, day.count === 1 ? "paso" : "pasos")}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="tiny-note">
              {translate(locale, "Métricas de uso del producto (descriptivas): no miden salud ni eficacia (BLU-1204).")}
            </p>
            <p className="review-note">
              {translate(locale, "Es un registro personal, no una medida de salud. ¿Quieres probar una versión más pequeña?")}
            </p>
            <div className="adapt-row">
              <label className="visually-hidden" htmlFor="adapt-habit">{translate(locale, "Hábito a simplificar")}</label>
              <select
                id="adapt-habit"
                onChange={(event) => {
                  const selected = HABITS.find((item) => item.id === event.target.value);
                  setAdaptHabitId(selected?.id ?? "");
                }}
                value={adaptHabitId}
              >
                <option value="">{translate(locale, "Elige un hábito")}</option>
                {state.selectedHabitIds.map((id) => {
                  const habit = HABITS.find((item) => item.id === id);
                  return habit ? <option key={id} value={id}>{translate(locale, habit.title)}</option> : null;
                })}
              </select>
              <label className="visually-hidden" htmlFor="barrier">{translate(locale, "Qué lo hizo difícil")}</label>
              <select
                id="barrier"
                onChange={(event) => {
                  if (isBarrier(event.target.value)) setBarrier(event.target.value);
                }}
                value={barrier}
              >
                <option value="time">{translate(locale, "Me faltó tiempo")}</option>
                <option value="energy">{translate(locale, "Tenía poca energía")}</option>
                <option value="remembering">{translate(locale, "Se me olvidó")}</option>
                <option value="other">{translate(locale, "Otra razón")}</option>
              </select>
              <button
                className="button button-light"
                disabled={!adaptHabitId}
                onClick={simplifyHabit}
                type="button"
              >
                {translate(locale, "Probar más pequeño")}
              </button>
            </div>
            {state.adaptations.length > 0 && (
              <div className="adaptation-record">
                <p>
                  {phrase("Último ajuste: «{from}» → «{to}»", {
                    from: state.adaptations[state.adaptations.length - 1].from,
                    to: state.adaptations[state.adaptations.length - 1].to,
                  })}
                </p>
                <button className="text-button" onClick={undoLastAdaptation} type="button">
                  {translate(locale, "Deshacer último ajuste")}
                </button>
              </div>
            )}
          </section>

          <section className="review-card" aria-labelledby="weekly-review-heading">
            <div className="review-top">
              <div>
                <span className="eyebrow">{translate(locale, "MIRADA SEMANAL")}</span>
                <h2 id="weekly-review-heading">{translate(locale, "Revisión de tu semana")}</h2>
              </div>
            </div>
            <p className="muted">{translate(locale, "Últimos 7 días · es un registro personal, no una medida de salud.")}</p>
            <p className="review-intro">
              {translate(locale, "Si quieres, cuéntame cómo te fue y qué prefieres para la próxima semana.")}
            </p>
            {weeklySummary.actionsCompleted === 0 && (
              <p className="muted">
                {translate(locale, "Aún no tienes registros esta semana: también es válido empezar pequeño hoy.")}
              </p>
            )}
            {reviewState.error && (
              <p className="inline-notice" role="alert">
                {phrase("No pude leer tus revisiones guardadas: {detail}", { detail: reviewState.error })}
              </p>
            )}
            {thisWeekReview && (
              <p className="inline-notice" role="status">
                {phrase("Revisión de esta semana guardada ({date}). Puedes actualizarla cuando quieras.", {
                  date: thisWeekReview.updatedAt.slice(0, 10),
                })}
              </p>
            )}
            {thisWeekReview?.decision === "adjust" && (
              <p className="inline-notice" role="status">
                {translate(locale, "Elegiste ajustar un hábito. En «Tu actividad», selecciona el hábito y pulsa «Probar más pequeño». Nada cambia hasta que tú lo confirmes.")}{" "}
                <Link className="text-button" href="/">
                  {translate(locale, "Ir a mis hábitos")}
                </Link>
              </p>
            )}
            <details className="review-details" key={thisWeekReview ? "saved" : "fresh"}>
              <summary className="text-button review-summary">
                {thisWeekReview ? translate(locale, "Actualizar mi respuesta") : translate(locale, "Responder cómo me sentí")}
              </summary>
            <form onSubmit={submitReview}>
              <fieldset>
                <legend>{translate(locale, "¿Cómo te sentiste con tus hábitos?")}</legend>
                {FEEL_OPTIONS.map((option) => (
                  <label key={option.value} className="consent-row">
                    <input
                      checked={reviewDraft.felt === option.value}
                      name="review-felt"
                      onChange={() => setReviewDraft((draft) => ({ ...draft, felt: option.value }))}
                      type="radio"
                    />
                    <span>{translate(locale, option.label)}</span>
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>{translate(locale, "¿Qué quieres hacer la próxima semana?")}</legend>
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
                    <span>{translate(locale, option.label)}</span>
                  </label>
                ))}
              </fieldset>
              <div className="adapt-row">
                <button
                  className="button button-light"
                  disabled={reviewDraft.felt === null && reviewDraft.decision === null}
                  type="submit"
                >
                  {translate(locale, "Guardar revisión")}
                </button>
                <button className="text-button" onClick={skipReview} type="button">
                  {translate(locale, "Prefiero no responder")}
                </button>
              </div>
            </form>
            </details>
            {reviewNotice && (
              <p className="inline-notice" role="status">
                {reviewNotice}
              </p>
            )}
          </section>

          <p className="evidence-note">
            <span aria-hidden="true">ⓘ</span>{" "}
            {translate(locale, "Las ideas de este prototipo no son recomendaciones clínicas; su evidencia específica está pendiente de revisión.")}
          </p>
        </section>

        <aside className="side-column">
          <section className="chat-card" aria-labelledby="chat-heading">
            <div className="chat-heading">
              <BluPresence size="sm" state={chatPresence} />
              <div>
                <span className="eyebrow">{translate(locale, "ACOMPAÑAMIENTO")}</span>
                <h2 id="chat-heading">{translate(locale, "Una pausa con Blu")}</h2>
              </div>
            </div>
            <p aria-live="polite" className="chat-disclosure">
              {assistantRemote
                ? translate(locale, "Ahora respondo con IA (modo remoto): tu mensaje se procesa con un proveedor externo a través del servidor de Blu. No guardamos tu historial; evita compartir datos personales o de salud.")
                : translate(locale, "Respondo con reglas sencillas, no con IA generativa. Tu mensaje llega al servidor de Blu para preparar la respuesta; no guardamos un historial de la conversación.")}
            </p>
            {localModeReason && (
              <p className="tiny-note" role="status">
                {localModeReason === "rate_limited"
                  ? translate(locale, "El servidor pidió esperar. Usé reglas sencillas en tu dispositivo para responder.")
                  : translate(locale, "El servidor no pudo responder. Usé reglas sencillas en tu dispositivo.")}
                {" "}
                {translate(locale, "Tu mensaje se envió al servidor para intentar responder; evita compartir datos personales o de salud.")}
              </p>
            )}
            {chatPresence === "responding" && (
              <p className="chat-thinking" role="status">{translate(locale, "Blu está pensando…")}</p>
            )}
            <div className="chat-voice-settings">
              <label className="chat-voice-control" htmlFor="voice-style">
                <span>{translate(locale, "Estilo de voz")}</span>
                <select
                  id="voice-style"
                  onChange={(event) => {
                    if (event.target.value === "warm" || event.target.value === "balanced") {
                      setVoiceProfile(event.target.value);
                    }
                  }}
                  value={voiceProfile}
                >
                  <option value="warm">{translate(locale, "Cálida")}</option>
                  <option value="balanced">{translate(locale, "Equilibrada")}</option>
                </select>
              </label>
              <p className="chat-voice-hint">
                {translate(locale, "La voz disponible depende de las opciones de tu dispositivo.")}
              </p>
              <p className="chat-voice-cloud-note">
                {translate(locale, "Si activas la voz natural, se enviará solo el texto de Blu que elijas escuchar a un proveedor de voz para crear el audio. No compartas información personal o de salud.")}
              </p>
              <button
                className="text-button chat-voice-toggle"
                disabled={azureVoiceLoading}
                onClick={toggleAzureVoice}
                type="button"
              >
                {azureVoiceLoading
                  ? translate(locale, "Comprobando…")
                  : azureVoiceEnabled
                    ? translate(locale, "Usar voz del dispositivo")
                    : translate(locale, "Activar voz natural")}
              </button>
              {azureVoiceNotice && <p className="chat-voice-status" role="status">{azureVoiceNotice}</p>}
            </div>
            <div aria-live="polite" className="chat-messages" role="log">
              {chatMessages.map((message, index) => (
                <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}>
                  {message.role === "blu" && (
                    <BluPresence size="sm" />
                  )}
                  <div className="chat-bubble-body">
                    <p>{message.role === "blu" ? translate(locale, message.text) : message.text}</p>
                    {message.role === "blu" && (
                      <SpeakButton
                        azureAvailable={azureVoiceEnabled}
                        locale={locale}
                        mode={azureVoiceEnabled ? "azure" : "local"}
                        profile={voiceProfile}
                        text={translate(locale, message.text)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <form className="chat-form" onSubmit={sendMessage}>
              <label className="visually-hidden" htmlFor="chat-input">{translate(locale, "Escribe una reflexión")}</label>
              <input
                autoComplete="off"
                id="chat-input"
                maxLength={400}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder={translate(locale, "¿Qué tienes en mente?")}
                value={chatInput}
              />
              <button aria-label={translate(locale, "Enviar mensaje")} disabled={!chatInput.trim()} type="submit">
                {translate(locale, "Enviar")}
              </button>
            </form>
            <p className="chat-privacy">{translate(locale, "No incluyas datos personales ni información médica.")}</p>
            <section className="principle-card" aria-label={translate(locale, "Una idea para acompañarte")}>
              <span className="eyebrow">{translate(locale, "UNA IDEA PARA HOY")}</span>
              <p>
                {translate(
                  locale,
                  "La conexión y el propósito también se construyen con gestos pequeños, elegidos por ti.",
                )}
              </p>
              <span className="principle-caption">{translate(locale, "Reflexión, no consejo clínico")}</span>
            </section>
          </section>
        </aside>
      </div>

      <footer className="dashboard-footer" id="privacy-controls">
        <div className="privacy-panel">
          <div className="privacy-panel-copy">
            <h2 className="privacy-title">{translate(locale, "Tus datos, bajo tu control")}</h2>
            <p className="privacy-lead">
              {translate(
                locale,
                "Todo lo que guardas en Blu vive en este navegador. Puedes llevártelo o borrarlo cuando quieras: sin cuentas y sin nube.",
              )}
            </p>
          </div>
          <ul className="privacy-actions" role="list">
            <li>
              <button className="privacy-action" onClick={exportData} type="button">
                <span className="privacy-action-name">{translate(locale, "Exportar mis datos")}</span>
                <span className="privacy-action-desc">
                  {translate(locale, "Un archivo JSON con todo lo guardado aquí.")}
                </span>
              </button>
            </li>
            <li>
              <button className="privacy-action" onClick={openConsentManager} type="button">
                <span className="privacy-action-name">{translate(locale, "Consentimientos")}</span>
                <span className="privacy-action-desc">
                  {translate(locale, "Revisa o retira lo que permitiste.")}
                </span>
              </button>
            </li>
            <li>
              <button className="privacy-action privacy-action--danger" onClick={clearData} type="button">
                <span className="privacy-action-name">{translate(locale, "Borrar todos los datos")}</span>
                <span className="privacy-action-desc">
                  {translate(locale, "Elimina todo y verifica el borrado.")}
                </span>
              </button>
            </li>
          </ul>
        </div>
        <p className="privacy-legal">
          {translate(
            locale,
            "Blu es un prototipo de bienestar: acompaña hábitos, no diagnostica ni trata.",
          )}
        </p>
      </footer>
    </div>
  );
}

function formatHistoryDate(dateKey: string, locale: Locale = "es"): string {
  const date = new Date(`${dateKey}T12:00:00`);
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" })
    .format(date)
    .replace(/\.$/, "");
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

function portraitLine(
  locale: Locale,
  item: { declared: DeclaredLevel | null; marks: number },
  windowDays: number,
): string {
  if (!item.declared) return translate(locale, "Aún no hay una evaluación inicial de este hábito.");
  const label = translate(locale, DECLARED_LABELS[item.declared]);
  if (item.marks === 0) {
    return translate(
      locale,
      "Declaraste «{label}». Todavía no hay práctica registrada: el retrato se afina cuando marques un paso.",
    ).replace("{label}", label);
  }
  const unit = translate(locale, item.marks === 1 ? "vez" : "veces");
  return translate(
    locale,
    "Declaraste «{label}». En {days} días lo marcaste {n} {unit}. Eso actualiza el punto de partida, sin convertirlo en una nota.",
  )
    .replace("{label}", label)
    .replace("{days}", String(windowDays))
    .replace("{n}", String(item.marks))
    .replace("{unit}", unit);
}

function PortraitPanel({
  locale,
  habitIds,
  draft,
  refined,
  open,
  onDraft,
  onSave,
  onDismiss,
  onEdit,
}: {
  locale: Locale;
  habitIds: HabitId[];
  draft: Partial<Record<HabitId, DeclaredLevel>>;
  refined: RefinedPortrait;
  open: boolean;
  onDraft: (habitId: HabitId, level: DeclaredLevel) => void;
  onSave: () => void;
  onDismiss: () => void;
  onEdit: () => void;
}) {
  if (!open) {
    const portraitHasDeclaration = refined.habits.some((item) => item.declared);
    return (
      <section className="portrait-card" aria-labelledby="portrait-heading">
        <div className="section-heading">
          <h2 id="portrait-heading">{translate(locale, "Tu punto de partida")}</h2>
          <button className="text-button" onClick={onEdit} type="button">
            {translate(locale, portraitHasDeclaration ? "Actualizar lo que declaré" : "Completar punto de partida")}
          </button>
        </div>
        <ul className="portrait-list">
          {refined.habits.map((item) => {
            const habit = HABITS.find((entry) => entry.id === item.habitId);
            return (
              <li key={item.habitId}>
                <strong>{habit ? translate(locale, habit.title) : item.habitId}</strong>
                <p>{portraitLine(locale, item, refined.windowDays)}</p>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  const ready = habitIds.some((id) => draft[id]);
  return (
    <section className="portrait-card" aria-labelledby="portrait-heading">
      <h2 id="portrait-heading">{translate(locale, "Tu punto de partida")}</h2>
      <p className="muted">
        {translate(
          locale,
          "Esto no es un diagnóstico. Es lo que declaras hoy; la práctica de los próximos días lo va afinando.",
        )}
      </p>
      {habitIds.map((habitId) => {
        const habit = HABITS.find((entry) => entry.id === habitId);
        if (!habit) return null;
        const title = translate(locale, habit.title);
        return (
          <fieldset className="portrait-habit" key={habitId}>
            <legend>{title}</legend>
            <div className="portrait-choices">
              {DECLARED_LEVELS.map((level) => {
                const label = translate(locale, DECLARED_LABELS[level]);
                const selected = draft[habitId] === level;
                return (
                  <button
                    aria-pressed={selected}
                    className={`habit-option${selected ? " selected" : ""}`}
                    key={level}
                    onClick={() => onDraft(habitId, level)}
                    type="button"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <button className="button button-dark" disabled={!ready} onClick={onSave} type="button">
        {translate(locale, "Guardar mi punto de partida")}
      </button>
      <button className="text-button cancel-edit" onClick={onDismiss} type="button">
        {translate(locale, "Ahora no")}
      </button>
    </section>
  );
}
