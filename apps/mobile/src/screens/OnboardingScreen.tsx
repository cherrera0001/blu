import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  HABITS,
  MAX_SELECTED_HABITS,
  type HabitId,
  type BluState,
} from "blu-core/blu";
import { acceptPurpose, emptyConsent } from "blu-core/consent";
import { toggleHabitSelection } from "../selection";
import { APP_VERSION } from "../version";

export interface OnboardingScreenProps {
  state: BluState;
  onComplete: (next: BluState) => void;
}

export function OnboardingScreen({ state, onComplete }: OnboardingScreenProps) {
  const [draft, setDraft] = useState<HabitId[]>(state.selectedHabitIds);
  const [noticeAccepted, setNoticeAccepted] = useState(
    Boolean(state.consentAcceptedAt),
  );
  const [message, setMessage] = useState("");

  function onToggle(habitId: HabitId) {
    const result = toggleHabitSelection(draft, habitId);
    setDraft(result.next);
    setMessage(result.message);
  }

  function onContinue() {
    if (draft.length === 0) {
      setMessage("Elige al menos un tema para continuar.");
      return;
    }
    if (!noticeAccepted) {
      setMessage("Marca el aviso para poder continuar.");
      return;
    }
    const now = new Date().toISOString();
    const consent = acceptPurpose(
      state.consent.updatedAt ? state.consent : emptyConsent(),
      "operativo",
      now,
    );
    onComplete({
      ...state,
      consent,
      consentAcceptedAt: state.consentAcceptedAt ?? now,
      selectedHabitIds: draft,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} testID="onboarding-screen">
      <Text style={styles.brand}>Blu</Text>
      <Text style={styles.title}>Empezamos con una elección sencilla</Text>
      <Text style={styles.lead}>
        Verás siete temas. Elige entre 1 y 4. Después podrás marcar cada día lo
        que hiciste.
      </Text>

      <Text style={styles.count} testID="topics-available-count">
        Hay {HABITS.length} temas · elige hasta {MAX_SELECTED_HABITS}
      </Text>

      <View style={styles.grid} testID="habit-options-grid">
        {HABITS.map((habit) => {
          const selected = draft.includes(habit.id);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={habit.id}
              onPress={() => onToggle(habit.id)}
              style={[styles.option, selected && styles.optionSelected]}
              testID={`habit-${habit.id}`}
            >
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{habit.title}</Text>
                <Text style={styles.optionDesc}>{habit.description}</Text>
              </View>
              <Text style={styles.marker}>{selected ? "✓" : "+"}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.selection} testID="selection-count">
        Elegidos: {draft.length} de {MAX_SELECTED_HABITS}
      </Text>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: noticeAccepted }}
        onPress={() => setNoticeAccepted((v) => !v)}
        style={styles.consentRow}
        testID="consent-operativo"
      >
        <Text style={styles.consentBox}>{noticeAccepted ? "☑" : "☐"}</Text>
        <Text style={styles.consentLabel}>
          Guardo mis elecciones solo en este dispositivo. Blu no es un servicio
          médico.
        </Text>
      </Pressable>

      {message ? (
        <Text role="status" style={styles.message} testID="onboarding-message">
          {message}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={draft.length === 0 || !noticeAccepted}
        onPress={onContinue}
        style={[
          styles.cta,
          (draft.length === 0 || !noticeAccepted) && styles.ctaDisabled,
        ]}
        testID="continue-button"
      >
        <Text style={styles.ctaText}>Continuar con lo que elegí</Text>
      </Pressable>

      <Text style={styles.version} testID="app-version">
        Blu {APP_VERSION}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 48,
    backgroundColor: "#F4F7FB",
    gap: 12,
  },
  brand: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1B3A4B",
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    color: "#1B3A4B",
    lineHeight: 34,
  },
  lead: {
    fontSize: 18,
    color: "#334E5C",
    lineHeight: 28,
  },
  count: {
    fontSize: 16,
    color: "#4A6673",
    marginTop: 8,
  },
  grid: {
    gap: 10,
    marginTop: 4,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#D7E2EA",
  },
  optionSelected: {
    borderColor: "#1B3A4B",
    backgroundColor: "#E8F1F6",
  },
  optionCopy: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1B3A4B",
  },
  optionDesc: {
    fontSize: 15,
    color: "#4A6673",
    lineHeight: 22,
  },
  marker: {
    fontSize: 22,
    color: "#1B3A4B",
    width: 28,
    textAlign: "center",
  },
  selection: {
    fontSize: 17,
    color: "#1B3A4B",
    fontWeight: "500",
  },
  consentRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  consentBox: {
    fontSize: 22,
    lineHeight: 28,
  },
  consentLabel: {
    flex: 1,
    fontSize: 16,
    color: "#334E5C",
    lineHeight: 24,
  },
  message: {
    fontSize: 16,
    color: "#8A4B12",
    lineHeight: 24,
  },
  cta: {
    marginTop: 8,
    backgroundColor: "#1B3A4B",
    paddingVertical: 16,
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  version: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 14,
    color: "#7A909C",
  },
});
