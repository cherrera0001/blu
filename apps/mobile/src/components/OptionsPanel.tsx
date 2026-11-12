import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LOCALES, LOCALE_NATIVE_NAMES, type Locale } from "blu-core/i18n";
import { DEFAULT_REMINDER_HOUR, REMINDER_HOURS, type ReminderPreference } from "blu-core/reminder";
import { ActionButton } from "./ActionButton";
import { useI18n } from "../i18n";
import { colors, fonts, space, type as typeScale } from "../theme";

export interface OptionsPanelProps {
  onEditSelection: () => void;
  onClear: () => void;
  /** true = solo voz del teléfono: el texto nunca va a /api/voice (specs/026 FR-005). */
  deviceVoiceOnly: boolean;
  onToggleDeviceVoice: () => void;
  /** «Mis datos»: qué guarda Blu, en llano. */
  storedLines: string[];
  onExport: () => void;
  locale: Locale;
  onChangeLocale: (locale: Locale) => void;
  /** Recordatorio local opt-in (ADR-0010); false si el teléfono negó el permiso. */
  reminder: ReminderPreference | undefined;
  onReminderChange: (enabled: boolean, hour?: number) => Promise<boolean>;
}

/**
 * Menú de opciones colapsable: no compite con la acción principal de Hoy.
 */
export function OptionsPanel({
  onEditSelection,
  onClear,
  deviceVoiceOnly,
  onToggleDeviceVoice,
  storedLines,
  onExport,
  locale,
  onChangeLocale,
  reminder,
  onReminderChange,
}: OptionsPanelProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [reminderDenied, setReminderDenied] = useState(false);
  const reminderOn = reminder?.enabled === true;
  const reminderHour = reminder?.hour ?? DEFAULT_REMINDER_HOUR;

  async function toggleReminder() {
    const ok = await onReminderChange(!reminderOn, reminderHour);
    setReminderDenied(!ok);
  }

  return (
    <View style={styles.wrap} testID="options-panel">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
        testID="options-toggle"
      >
        <Text style={styles.toggleLabel}>{t("Opciones")}</Text>
        <Text style={styles.chevron}>{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View style={styles.body} testID="options-body">
          <Text style={styles.hint}>{t("Ajustes del dispositivo. No afectan a tu día de hoy.")}</Text>
          <View accessibilityRole="radiogroup" style={styles.data} testID="language-picker">
            <Text style={styles.dataTitle}>{t("Idioma")}</Text>
            {LOCALES.map((code) => {
              const selected = code === locale;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLanguage={code}
                  onPress={() => onChangeLocale(code)}
                  style={({ pressed }) => [
                    styles.langRow,
                    selected && styles.langRowOn,
                    pressed && styles.togglePressed,
                  ]}
                  testID={`locale-${code}`}
                >
                  <Text style={styles.switchLabel}>{LOCALE_NATIVE_NAMES[code]}</Text>
                  <Text style={styles.chevron}>{selected ? "✓" : ""}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: deviceVoiceOnly }}
            accessibilityHint={t("Si está activo, Escuchar usa la voz del teléfono y no envía texto al servidor.")}
            onPress={onToggleDeviceVoice}
            style={({ pressed }) => [styles.switchRow, pressed && styles.togglePressed]}
            testID="voice-device-only"
          >
            <View style={styles.switchText}>
              <Text style={styles.switchLabel}>{t("Usar solo la voz del teléfono")}</Text>
              <Text style={styles.hint}>
                {deviceVoiceOnly
                  ? t("Activo: Escuchar no envía texto al servidor.")
                  : t("Inactivo: la voz natural envía el texto al servidor de Blu.")}
              </Text>
            </View>
            <View style={[styles.switchTrack, deviceVoiceOnly && styles.switchTrackOn]}>
              <View style={[styles.switchThumb, deviceVoiceOnly && styles.switchThumbOn]} />
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: reminderOn }}
            accessibilityHint={t("Como máximo uno al día. Se programa en este teléfono; nada sale de él.")}
            onPress={toggleReminder}
            style={({ pressed }) => [styles.switchRow, pressed && styles.togglePressed]}
            testID="reminder-toggle"
          >
            <View style={styles.switchText}>
              <Text style={styles.switchLabel}>{t("Un recordatorio amable")}</Text>
              <Text style={styles.hint}>
                {t("Como máximo uno al día. Se programa en este teléfono; nada sale de él.")}
              </Text>
            </View>
            <View style={[styles.switchTrack, reminderOn && styles.switchTrackOn]}>
              <View style={[styles.switchThumb, reminderOn && styles.switchThumbOn]} />
            </View>
          </Pressable>
          {reminderDenied ? (
            <Text style={styles.hint} testID="reminder-denied">
              {t("El teléfono no dio permiso para avisos. Puedes activarlo en los ajustes del sistema.")}
            </Text>
          ) : null}
          {reminderOn ? (
            <View accessibilityRole="radiogroup" style={styles.hours} testID="reminder-hours">
              {REMINDER_HOURS.map((hour) => {
                const selected = hour === reminderHour;
                return (
                  <Pressable
                    key={hour}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => void onReminderChange(true, hour)}
                    style={({ pressed }) => [
                      styles.hourChip,
                      selected && styles.langRowOn,
                      pressed && styles.togglePressed,
                    ]}
                    testID={`reminder-hour-${hour}`}
                  >
                    <Text style={styles.switchLabel}>{`${hour}:00`}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <View style={styles.data} testID="my-data">
            <Text style={styles.dataTitle}>{t("Mis datos")}</Text>
            <Text style={styles.hint}>{t("Esto es lo que Blu guarda en este teléfono:")}</Text>
            {storedLines.map((line) => (
              <Text key={line} style={styles.dataLine}>
                · {line}
              </Text>
            ))}
            <ActionButton
              label={t("Compartir una copia de mis datos")}
              variant="outline"
              onPress={onExport}
              testID="export-data"
            />
            <Text style={styles.hint}>
              {t("Tú eliges a dónde enviarla. Blu no la sube a ningún servidor.")}
            </Text>
          </View>
          <ActionButton
            label={t("Cambiar temas")}
            variant="outline"
            onPress={onEditSelection}
            testID="edit-selection"
          />
          <ActionButton
            label={t("Borrar mis datos")}
            variant="danger"
            onPress={onClear}
            testID="clear-data"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    marginTop: 8,
  },
  toggle: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  togglePressed: {
    opacity: 0.9,
  },
  toggleLabel: {
    fontSize: typeScale.body,
    fontFamily: fonts.bodySemi,
    color: colors.inkSoft,
  },
  chevron: {
    fontSize: 18,
    color: colors.muted,
    width: 24,
    textAlign: "center",
  },
  body: {
    gap: space.gap,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.cardSolid,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  data: {
    gap: 6,
    paddingVertical: 4,
  },
  dataTitle: {
    fontSize: typeScale.body,
    fontFamily: fonts.bodySemi,
    color: colors.ink,
  },
  dataLine: {
    fontSize: typeScale.meta,
    fontFamily: fonts.body,
    color: colors.inkSoft,
    lineHeight: 24,
  },
  hours: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hourChip: {
    minHeight: 48,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.softBorder,
  },
  langRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.softBorder,
  },
  langRowOn: {
    borderColor: colors.ctaDeep,
    backgroundColor: colors.soft,
  },
  switchRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    fontSize: typeScale.body,
    fontFamily: fonts.bodySemi,
    color: colors.ink,
  },
  switchTrack: {
    width: 52,
    height: 32,
    borderRadius: 16,
    padding: 3,
    backgroundColor: colors.muted,
    justifyContent: "center",
  },
  switchTrackOn: {
    backgroundColor: colors.cta,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cardSolid,
  },
  switchThumbOn: {
    alignSelf: "flex-end",
  },
  hint: {
    fontSize: typeScale.tiny,
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 20,
  },
});
