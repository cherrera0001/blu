import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import {
  HABITS,
  currentAction,
  getWeeklySummary,
  localDateKey,
  type BluState,
  type HabitId,
} from "blu-core/blu";
import { readCompanion } from "blu-core/companion";
import { summarizeDays } from "blu-core/history";
import { ActionButton } from "../components/ActionButton";
import { BluCompanion } from "../components/BluCompanion";
import { HabitCheckRow } from "../components/HabitCheckRow";
import { OptionsPanel } from "../components/OptionsPanel";
import { ScreenShell } from "../components/ScreenShell";
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
      <Text style={styles.brand}>Blu</Text>
      <BluCompanion view={companion} size="lg" />

      <SpeakButton
        text={listenText}
        label="Escuchar a Blu"
        naturalAvailable={naturalAvailable}
        variant="soft"
        testID="speak-today"
      />

      <View style={styles.section}>
        <Text style={styles.title}>Hoy</Text>
        <Text style={styles.lead}>Marca lo que pudiste hacer. Sin puntuación.</Text>
        <Text style={styles.progress} testID="today-progress">
          {doneCount} de {total} {total === 1 ? "tema" : "temas"} marcados
        </Text>
      </View>

      <View style={styles.summary} testID="weekly-summary">
        <Text style={styles.summaryText}>
          Últimos 7 días: {summary.actionsCompleted}{" "}
          {summary.actionsCompleted === 1 ? "paso" : "pasos"} en{" "}
          {summary.activeDays} {summary.activeDays === 1 ? "día" : "días"}.
        </Text>
        <WeekBars days={history.days} />
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
              testID={`checkin-${habitId}`}
            />
          );
        })}
      </View>

      <View style={styles.destinations}>
        <Text style={styles.destLabel}>Con Blu</Text>
        <ActionButton
          label="Hablar con Blu"
          variant="secondary"
          onPress={onOpenChat}
          testID="open-chat"
        />
      </View>

      <OptionsPanel
        onEditSelection={onEditSelection}
        onClear={confirmClear}
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
  brand: {
    fontSize: typeScale.brand,
    fontFamily: fonts.display,
    color: colors.ink,
    textAlign: "center",
    letterSpacing: -1,
  },
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
    color: colors.faint,
  },
});
