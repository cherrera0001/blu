import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ActionButton } from "./ActionButton";
import { colors, fonts, space, type as typeScale } from "../theme";

export interface OptionsPanelProps {
  onEditSelection: () => void;
  onClear: () => void;
}

/**
 * Menú de opciones colapsable: no compite con la acción principal de Hoy.
 */
export function OptionsPanel({ onEditSelection, onClear }: OptionsPanelProps) {
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
  hint: {
    fontSize: typeScale.tiny,
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 20,
  },
});
