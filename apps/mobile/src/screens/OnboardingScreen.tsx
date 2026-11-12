import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  HABITS,
  MAX_SELECTED_HABITS,
  type HabitId,
  type BluState,
} from "blu-core/blu";
import { acceptPurpose, emptyConsent, needsReconsent } from "blu-core/consent";
import { OPERATIVE_NOTICE } from "../content/notice";
import { readCompanion } from "blu-core/companion";
import { ActionButton } from "../components/ActionButton";
import { BackButton } from "../components/BackButton";
import { BluCompanion } from "../components/BluCompanion";
import { ScreenShell } from "../components/ScreenShell";
import { SpeakButton } from "../components/SpeakButton";
import { toggleHabitSelection } from "../selection";
import { colors, fonts, space, type as typeScale } from "../theme";
import { useI18n } from "../i18n";
import { APP_VERSION } from "../version";

export interface OnboardingScreenProps {
  state: BluState;
  naturalAvailable: boolean;
  onComplete: (next: BluState) => void;
  /** Presente al cambiar temas desde Hoy: volver sin guardar cambios. */
  onCancel?: () => void;
}

export function OnboardingScreen({
  state,
  naturalAvailable,
  onComplete,
  onCancel,
}: OnboardingScreenProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<HabitId[]>(state.selectedHabitIds);
  // Con un aviso nuevo (otra versión), hay que volver a marcarlo.
  const [noticeAccepted, setNoticeAccepted] = useState(
    Boolean(state.consentAcceptedAt) && !needsReconsent(state.consent),
  );
  const [message, setMessage] = useState("");
  // `message` guarda la clave en castellano; se traduce al mostrar.
  const shownMessage = message ? t(message, { max: MAX_SELECTED_HABITS }) : "";
  const companion = useMemo(
    () => readCompanion({ ...state, selectedHabitIds: draft }, new Date()),
    [state, draft],
  );

  const listenText = useMemo(() => {
    return [
      `Blu. ${t(companion.line)}`,
      t("Hay {n} temas. Elige hasta {max}.", { n: HABITS.length, max: MAX_SELECTED_HABITS }),
      shownMessage || t("Cuando termines, continúa con lo que elegiste."),
    ].join(" ");
  }, [companion.line, shownMessage, t]);

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
      {onCancel ? (
        <BackButton label={t("Volver sin cambiar")} onPress={onCancel} testID="onboarding-back" />
      ) : null}
      <Text style={styles.brand}>Blu</Text>
      {/* md: los temas deben asomar en la primera pantalla, sin tener que adivinar que hay que bajar. */}
      <BluCompanion view={companion} size="md" />
      <SpeakButton
        text={listenText}
        label={t("Escuchar a Blu")}
        naturalAvailable={naturalAvailable}
        variant="soft"
        testID="speak-onboarding"
      />

      <View style={styles.section}>
        <Text style={styles.title}>{t("Elige hasta {max} temas", { max: MAX_SELECTED_HABITS })}</Text>
        <Text style={styles.lead}>
          {t("Un toque para elegir. Después, cada día marcas solo lo que pudiste hacer.")}
        </Text>
        <Text style={styles.count} testID="topics-available-count">
          {t("Hay {n} temas · elegidos {done} de {max}", {
            n: HABITS.length,
            done: draft.length,
            max: MAX_SELECTED_HABITS,
          })}
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
                  {selected ? t("Elegido") : t("Elegir")}
                </Text>
              </View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{t(habit.title)}</Text>
                <Text style={styles.optionDesc}>{t(habit.description)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

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
        <Text style={styles.consentLabel}>{t(OPERATIVE_NOTICE)}</Text>
      </Pressable>

      {message ? (
        <Text role="status" style={styles.message} testID="onboarding-message">
          {shownMessage}
        </Text>
      ) : null}

      {/* Nunca deshabilitado: un botón apagado no explica qué falta. Al tocarlo,
          el mensaje de arriba dice qué hacer. */}
      {!canContinue && !message ? (
        <Text style={styles.pending} testID="continue-pending">
          {draft.length === 0
            ? t("Elige al menos un tema para continuar.")
            : t("Marca el aviso para poder continuar.")}
        </Text>
      ) : null}
      <ActionButton
        label={t("Continuar con lo que elegí")}
        variant="primary"
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
  pending: {
    fontSize: typeScale.meta,
    fontFamily: fonts.bodySemi,
    color: colors.inkSoft,
    lineHeight: 24,
    textAlign: "center",
  },
  version: {
    marginTop: 16,
    textAlign: "center",
    fontSize: typeScale.tiny,
    fontFamily: fonts.body,
    color: colors.faint,
  },
});
