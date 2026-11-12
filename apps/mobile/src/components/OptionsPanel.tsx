import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ActionButton } from "./ActionButton";
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
}: OptionsPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap} testID="options-panel">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
        testID="options-toggle"
      >
        <Text style={styles.toggleLabel}>Opciones</Text>
        <Text style={styles.chevron}>{open ? "▾" : "▸"}</Text>
      </Pressable>

      {open ? (
        <View style={styles.body} testID="options-body">
          <Text style={styles.hint}>Ajustes del dispositivo. No afectan a tu día de hoy.</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: deviceVoiceOnly }}
            accessibilityHint="Si está activo, Escuchar usa la voz del teléfono y no envía texto al servidor."
            onPress={onToggleDeviceVoice}
            style={({ pressed }) => [styles.switchRow, pressed && styles.togglePressed]}
            testID="voice-device-only"
          >
            <View style={styles.switchText}>
              <Text style={styles.switchLabel}>Usar solo la voz del teléfono</Text>
              <Text style={styles.hint}>
                {deviceVoiceOnly
                  ? "Activo: Escuchar no envía texto al servidor."
                  : "Inactivo: la voz natural envía el texto al servidor de Blu."}
              </Text>
            </View>
            <View style={[styles.switchTrack, deviceVoiceOnly && styles.switchTrackOn]}>
              <View style={[styles.switchThumb, deviceVoiceOnly && styles.switchThumbOn]} />
            </View>
          </Pressable>
          <View style={styles.data} testID="my-data">
            <Text style={styles.dataTitle}>Mis datos</Text>
            <Text style={styles.hint}>Esto es lo que Blu guarda en este teléfono:</Text>
            {storedLines.map((line) => (
              <Text key={line} style={styles.dataLine}>
                · {line}
              </Text>
            ))}
            <ActionButton
              label="Compartir una copia de mis datos"
              variant="outline"
              onPress={onExport}
              testID="export-data"
            />
            <Text style={styles.hint}>
              Tú eliges a dónde enviarla. Blu no la sube a ningún servidor.
            </Text>
          </View>
          <ActionButton
            label="Cambiar temas"
            variant="outline"
            onPress={onEditSelection}
            testID="edit-selection"
          />
          <ActionButton
            label="Borrar mis datos"
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
