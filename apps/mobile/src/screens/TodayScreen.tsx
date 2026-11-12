import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  HABITS,
  currentAction,
  getWeeklySummary,
  localDateKey,
  type BluState,
  type HabitId,
} from "blu-core/blu";
import { APP_VERSION } from "../version";

export interface TodayScreenProps {
  state: BluState;
  now?: Date;
  onChange: (next: BluState) => void;
  onClear: () => void;
  onEditSelection: () => void;
}

export function TodayScreen({
  state,
  now = new Date(),
  onChange,
  onClear,
  onEditSelection,
}: TodayScreenProps) {
  const todayKey = localDateKey(now);
  const checked = state.checkInsByDate[todayKey] ?? [];
  const summary = useMemo(() => getWeeklySummary(state, now), [state, now]);
  const [busy, setBusy] = useState(false);

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
      "Se borrará todo lo guardado en este dispositivo y volverás al inicio. ¿Continuar?",
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

  return (
    <ScrollView contentContainerStyle={styles.container} testID="today-screen">
      <Text style={styles.brand}>Blu</Text>
      <Text style={styles.title}>Hoy</Text>
      <Text style={styles.lead}>
        Marca lo que pudiste hacer. No hay puntuación: solo un registro para ti.
      </Text>

      <View style={styles.summary} testID="weekly-summary">
        <Text style={styles.summaryText}>
          Últimos 7 días: {summary.actionsCompleted}{" "}
          {summary.actionsCompleted === 1 ? "paso" : "pasos"} en{" "}
          {summary.activeDays} {summary.activeDays === 1 ? "día" : "días"}.
        </Text>
      </View>

      <View style={styles.list}>
        {state.selectedHabitIds.map((habitId) => {
          const habit = HABITS.find((item) => item.id === habitId);
          if (!habit) return null;
          const done = checked.includes(habitId);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              key={habitId}
              onPress={() => toggleCheckIn(habitId)}
              style={[styles.row, done && styles.rowDone]}
              testID={`checkin-${habitId}`}
            >
              <Text style={styles.check}>{done ? "☑" : "☐"}</Text>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{habit.title}</Text>
                <Text style={styles.rowAction}>{currentAction(state, habitId)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onEditSelection}
        style={styles.secondary}
        testID="edit-selection"
      >
        <Text style={styles.secondaryText}>Cambiar temas</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={confirmClear}
        style={styles.danger}
        testID="clear-data"
      >
        <Text style={styles.dangerText}>Borrar mis datos</Text>
      </Pressable>

      <Text style={styles.version} testID="app-version">
        Blu {APP_VERSION} · datos solo en este dispositivo
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 48,
    backgroundColor: "#F4F7FB",
    gap: 14,
  },
  brand: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1B3A4B",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#1B3A4B",
  },
  lead: {
    fontSize: 18,
    color: "#334E5C",
    lineHeight: 28,
  },
  summary: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#E8F1F6",
  },
  summaryText: {
    fontSize: 16,
    color: "#1B3A4B",
    lineHeight: 24,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#D7E2EA",
    alignItems: "flex-start",
  },
  rowDone: {
    borderColor: "#2F6F4E",
    backgroundColor: "#EEF7F1",
  },
  check: {
    fontSize: 22,
    lineHeight: 28,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1B3A4B",
  },
  rowAction: {
    fontSize: 15,
    color: "#4A6673",
    lineHeight: 22,
  },
  secondary: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 17,
    color: "#1B3A4B",
    fontWeight: "500",
  },
  danger: {
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerText: {
    fontSize: 17,
    color: "#8B2E2E",
    fontWeight: "500",
  },
  version: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    color: "#7A90A0",
  },
});
