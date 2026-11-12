import { useMemo, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import {
  HABITS,
  currentAction,
  getWeeklySummary,
  localDateKey,
  type BluState,
  type HabitId,
} from "blu-core/blu";
import {
  canSimplify,
  isAdapted,
  simplifyHabit,
  smallerOptions,
  undoLastAdaptation,
} from "blu-core/adapt";
import { readCompanion } from "blu-core/companion";
import { getISOWeekKey, reviewDue, upsertReview } from "blu-core/review";
import { WeeklyReviewCard } from "../components/WeeklyReviewCard";
import { reviewReply } from "../content/review-copy";
import { acceptPurpose, needsReconsent } from "blu-core/consent";
import { OPERATIVE_NOTICE } from "../content/notice";
import { summarizeDays } from "blu-core/history";
import { ActionButton } from "../components/ActionButton";
import { BluCompanion } from "../components/BluCompanion";
import { HabitCheckRow } from "../components/HabitCheckRow";
import { OptionsPanel } from "../components/OptionsPanel";
import { ScreenShell } from "../components/ScreenShell";
import { WHY_DISCLAIMER, whyNotes } from "../content/why";
import { buildMobileExport, exportMessage, storedSummary } from "../export";
import { SpeakButton } from "../components/SpeakButton";
import { WeekBars } from "../components/WeekBars";
import { colors, fonts, space, type as typeScale } from "../theme";
import { APP_VERSION } from "../version";

export interface TodayScreenProps {
  state: BluState;
  now?: Date;
  naturalAvailable: boolean;
  onChange: (next: BluState) => void;
  onClear: () => void;
  onEditSelection: () => void;
  onOpenChat: () => void;
}

export function TodayScreen({
  state,
  now = new Date(),
  naturalAvailable,
  onChange,
  onClear,
  onEditSelection,
  onOpenChat,
}: TodayScreenProps) {
  const todayKey = localDateKey(now);
  const checked = useMemo(
    () => state.checkInsByDate[todayKey] ?? [],
    [state.checkInsByDate, todayKey],
  );
  const summary = useMemo(() => getWeeklySummary(state, now), [state, now]);
  const history = useMemo(() => summarizeDays(state, now, 7), [state, now]);
  const companion = useMemo(() => readCompanion(state, now), [state, now]);
  const [busy, setBusy] = useState(false);
  const [reviewSaved, setReviewSaved] = useState<string | null>(null);
  const showReview = reviewSaved !== null || reviewDue(state.weeklyReviews, now);

  const listenText = useMemo(() => {
    const habits = state.selectedHabitIds
      .map((id) => {
        const habit = HABITS.find((h) => h.id === id);
        if (!habit) return null;
        const done = checked.includes(id);
        return `${habit.title}: ${done ? "ya marcado" : "pendiente"}. ${currentAction(state, id)}`;
      })
      .filter(Boolean)
      .join(" ");
    return `${companion.line} Resumen de hoy. ${habits}`;
  }, [companion.line, state, checked]);

  function toggleCheckIn(habitId: HabitId) {
    const current = state.checkInsByDate[todayKey] ?? [];
    const nextIds = current.includes(habitId)
      ? current.filter((id) => id !== habitId)
      : [...current, habitId];
    onChange({
      ...state,
      checkInsByDate: {
        ...state.checkInsByDate,
        [todayKey]: nextIds,
      },
    });
  }

  async function exportData() {
    // Solo por acción de la persona; el sistema muestra a dónde enviarla.
    try {
      await Share.share({
        title: "Mis datos de Blu",
        message: exportMessage(buildMobileExport(state, new Date())),
      });
    } catch {
      Alert.alert("Mis datos", "No pude preparar la copia. Inténtalo otra vez.");
    }
  }

  function confirmClear() {
    if (busy) return;
    Alert.alert(
      "Borrar mis datos",
      "Se borrará lo guardado en este teléfono y volverás al inicio.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: () => {
            setBusy(true);
            onClear();
            setBusy(false);
          },
        },
      ],
    );
  }

  const doneCount = checked.filter((id) => state.selectedHabitIds.includes(id)).length;
  const total = state.selectedHabitIds.length;

  return (
    <ScreenShell testID="today-screen">
      <BluCompanion view={companion} size="md" />

      {needsReconsent(state.consent) ? (
        <View style={styles.renew} testID="consent-renew" accessibilityRole="summary">
          <Text style={styles.renewTitle}>Actualizamos el aviso</Text>
          <Text style={styles.renewText}>{OPERATIVE_NOTICE}</Text>
          <Text style={styles.summaryNote}>Puedes seguir usando Blu igual mientras tanto.</Text>
          <ActionButton
            label="Entendido"
            variant="outline"
            onPress={() =>
              onChange({
                ...state,
                consent: acceptPurpose(state.consent, "operativo", new Date().toISOString()),
              })
            }
            testID="consent-renew-accept"
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.title}>Hoy</Text>
        <Text style={styles.lead}>Marca lo que pudiste hacer. Sin puntuación.</Text>
        <Text style={styles.progress} testID="today-progress">
          {doneCount} de {total} {total === 1 ? "tema" : "temas"} marcados
        </Text>
      </View>

      <View style={styles.list}>
        {state.selectedHabitIds.map((habitId) => {
          const habit = HABITS.find((item) => item.id === habitId);
          if (!habit) return null;
          const done = checked.includes(habitId);
          return (
            <HabitCheckRow
              key={habitId}
              title={habit.title}
              action={currentAction(state, habitId)}
              done={done}
              onToggle={() => toggleCheckIn(habitId)}
              getOptions={(barrier) => smallerOptions(state, habitId, barrier)}
              onSimplify={
                canSimplify(state, habitId)
                  ? (barrier, to) =>
                      onChange(
                        simplifyHabit(state, habitId, barrier, new Date().toISOString(), to).state,
                      )
                  : undefined
              }
              onUndo={
                isAdapted(state, habitId)
                  ? () => onChange(undoLastAdaptation(state, habitId))
                  : undefined
              }
              why={whyNotes(habitId)}
              whyDisclaimer={WHY_DISCLAIMER}
              testID={`checkin-${habitId}`}
            />
          );
        })}
      </View>

      {showReview ? (
        <WeeklyReviewCard
          savedReply={reviewSaved}
          onSave={(input) => {
            onChange({
              ...state,
              weeklyReviews: upsertReview(
                state.weeklyReviews ?? [],
                { weekKey: getISOWeekKey(now), ...input },
                new Date().toISOString(),
              ),
            });
            setReviewSaved(reviewReply(input));
          }}
        />
      ) : null}

      <View style={styles.destinations}>
        <Text style={styles.destLabel}>Con Blu</Text>
        <Text style={styles.destHint}>Blu te lee tu día en voz alta.</Text>
        <SpeakButton
          text={listenText}
          label="Escuchar a Blu"
          naturalAvailable={naturalAvailable}
          variant="soft"
          testID="speak-today"
        />
        <Text style={styles.destHint}>Si quieres, conversamos un rato.</Text>
        <ActionButton
          label="Hablar con Blu"
          variant="secondary"
          onPress={onOpenChat}
          testID="open-chat"
        />
      </View>

      <View style={styles.summary} testID="weekly-summary">
        <Text style={styles.summaryText}>
          {summary.actionsCompleted === 0
            ? "Esta semana aún no hay marcas. Un paso pequeño cuenta, cuando quieras."
            : `Últimos 7 días: ${summary.actionsCompleted} ${
                summary.actionsCompleted === 1 ? "paso" : "pasos"
              } en ${summary.activeDays} ${summary.activeDays === 1 ? "día" : "días"}.`}
        </Text>
        <WeekBars days={history.days} />
        <Text style={styles.summaryNote}>Es un registro tuyo, no una nota.</Text>
      </View>

      <OptionsPanel
        onEditSelection={onEditSelection}
        onClear={confirmClear}
        storedLines={storedSummary(state)}
        onExport={exportData}
        deviceVoiceOnly={state.voicePreference === "device"}
        onToggleDeviceVoice={() =>
          onChange({
            ...state,
            voicePreference: state.voicePreference === "device" ? "natural" : "device",
          })
        }
      />

      <Text style={styles.version} testID="app-version">
        Blu {APP_VERSION} · datos solo en este teléfono
      </Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 6,
    marginTop: 4,
  },
  title: {
    fontSize: typeScale.title,
    fontFamily: fonts.displaySoft,
    color: colors.ink,
  },
  lead: {
    fontSize: typeScale.lead,
    fontFamily: fonts.body,
    color: colors.inkSoft,
    lineHeight: 30,
  },
  progress: {
    fontSize: typeScale.meta,
    fontFamily: fonts.bodySemi,
    color: colors.ctaDeep,
  },
  summary: {
    gap: 10,
    paddingVertical: 4,
  },
  summaryText: {
    fontSize: typeScale.body,
    fontFamily: fonts.bodySemi,
    color: colors.inkSoft,
    lineHeight: 28,
  },
  list: {
    gap: 12,
  },
  destinations: {
    gap: 10,
    marginTop: space.gap,
  },
  destHint: {
    fontSize: typeScale.meta,
    fontFamily: fonts.body,
    color: colors.inkSoft,
    marginTop: 4,
  },
  renew: {
    gap: 8,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.softBorder,
    backgroundColor: colors.soft,
  },
  renewTitle: {
    fontSize: typeScale.body,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  renewText: {
    fontSize: typeScale.meta,
    fontFamily: fonts.body,
    color: colors.inkSoft,
    lineHeight: 24,
  },
  summaryNote: {
    fontSize: typeScale.tiny,
    fontFamily: fonts.body,
    color: colors.muted,
  },
  destLabel: {
    fontSize: typeScale.meta,
    fontFamily: fonts.bodySemi,
    color: colors.muted,
  },
  version: {
    marginTop: 8,
    textAlign: "center",
    fontSize: typeScale.tiny,
    fontFamily: fonts.body,
    color: colors.muted,
  },
});
