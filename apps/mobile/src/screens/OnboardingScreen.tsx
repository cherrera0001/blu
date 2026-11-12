import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  HABITS,
  MAX_SELECTED_HABITS,
  type HabitId,
  type BluState,
} from "blu-core/blu";
import { acceptPurpose, emptyConsent } from "blu-core/consent";
import { readCompanion } from "blu-core/companion";
import { ActionButton } from "../components/ActionButton";
import { BluCompanion } from "../components/BluCompanion";
import { ScreenShell } from "../components/ScreenShell";
import { SpeakButton } from "../components/SpeakButton";
import { toggleHabitSelection } from "../selection";
import { colors, fonts, space, type as typeScale } from "../theme";
import { APP_VERSION } from "../version";

export interface OnboardingScreenProps {
  state: BluState;
  naturalAvailable: boolean;
  onComplete: (next: BluState) => void;
}

export function OnboardingScreen({
  state,
  naturalAvailable,
  onComplete,
}: OnboardingScreenProps) {
  const [draft, setDraft] = useState<HabitId[]>(state.selectedHabitIds);
  const [noticeAccepted, setNoticeAccepted] = useState(
    Boolean(state.consentAcceptedAt),
  );
  const [message, setMessage] = useState("");
  const companion = useMemo(
    () => readCompanion({ ...state, selectedHabitIds: draft }, new Date()),
    [state, draft],
  );

  const listenText = useMemo(() => {
    return `Blu. ${companion.line} Hay ${HABITS.length} temas. Elige hasta ${MAX_SELECTED_HABITS}. ${message || "Cuando termines, continúa con lo que elegiste."}`;
  }, [companion.line, message]);

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

  const canContinue = draft.length > 0 && noticeAccepted;

  return (
    <ScreenShell testID="onboarding-screen">
      <Text style={styles.brand}>Blu</Text>
      <BluCompanion view={companion} size="lg" />
      <SpeakButton
        text={listenText}
        label="Escuchar a Blu"
        naturalAvailable={naturalAvailable}
        variant="soft"
        testID="speak-onboarding"
      />

      <View style={styles.section}>
        <Text style={styles.title}>Elige hasta 4 temas</Text>
        <Text style={styles.lead}>
          Un toque para elegir. Después, cada día marcas solo lo que pudiste hacer.
        </Text>
        <Text style={styles.count} testID="topics-available-count">
          Hay {HABITS.length} temas · elegidos {draft.length} de {MAX_SELECTED_HABITS}
        </Text>
      </View>

      <View style={styles.grid} testID="habit-options-grid">
        {HABITS.map((habit) => {
          const selected = draft.includes(habit.id);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={habit.id}
              onPress={() => onToggle(habit.id)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
              testID={`habit-${habit.id}`}
            >
              <View style={[styles.chip, selected && styles.chipOn]}>
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                  {selected ? "Elegido" : "Elegir"}
                </Text>
              </View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{habit.title}</Text>
                <Text style={styles.optionDesc}>{habit.description}</Text>
              </View>
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
        <View style={[styles.consentBox, noticeAccepted && styles.consentBoxOn]}>
          <Text style={styles.consentMark}>{noticeAccepted ? "✓" : ""}</Text>
        </View>
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

      <ActionButton
        label="Continuar con lo que elegí"
        variant="primary"
        disabled={!canContinue}
        onPress={onContinue}
        testID="continue-button"
      />

      <Text style={styles.version} testID="app-version">
        Blu {APP_VERSION}
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
  },
  title: {
    fontSize: typeScale.title,
    fontFamily: fonts.displaySoft,
    color: colors.ink,
    lineHeight: 38,
  },
  lead: {
    fontSize: typeScale.lead,
    fontFamily: fonts.body,
    color: colors.inkSoft,
    lineHeight: 30,
  },
  count: {
    fontSize: typeScale.meta,
    fontFamily: fonts.bodySemi,
    color: colors.ctaDeep,
  },
  grid: {
    gap: 12,
  },
  option: {
    gap: 10,
    padding: 16,
    minHeight: space.touch + 16,
    borderRadius: 18,
    backgroundColor: colors.cardSolid,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  optionSelected: {
    borderColor: colors.cta,
    backgroundColor: colors.tint,
  },
  optionPressed: {
    opacity: 0.92,
  },
  chip: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.softBorder,
  },
  chipOn: {
    backgroundColor: colors.cta,
    borderColor: colors.ctaDeep,
  },
  chipText: {
    fontSize: typeScale.tiny,
    fontFamily: fonts.bodyBold,
    color: colors.ctaDeep,
  },
  chipTextOn: {
    color: colors.ctaText,
  },
  optionCopy: {
    gap: 4,
  },
  optionTitle: {
    fontSize: typeScale.body,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  optionDesc: {
    fontSize: typeScale.meta,
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 24,
  },
  selection: {
    fontSize: typeScale.body,
    fontFamily: fonts.bodySemi,
    color: colors.ink,
  },
  consentRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    paddingVertical: 10,
    minHeight: space.touch,
  },
  consentBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.softBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardSolid,
  },
  consentBoxOn: {
    backgroundColor: colors.cta,
    borderColor: colors.ctaDeep,
  },
  consentMark: {
    color: colors.ctaText,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  consentLabel: {
    flex: 1,
    fontSize: typeScale.meta,
    fontFamily: fonts.body,
    color: colors.inkSoft,
    lineHeight: 26,
  },
  message: {
    fontSize: typeScale.meta,
    fontFamily: fonts.body,
    color: colors.warn,
    lineHeight: 24,
  },
  version: {
    marginTop: 16,
    textAlign: "center",
    fontSize: typeScale.tiny,
    fontFamily: fonts.body,
    color: colors.faint,
  },
});
