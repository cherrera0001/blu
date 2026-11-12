import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, space, type as typeScale } from "../theme";

export interface HabitCheckRowProps {
  title: string;
  action: string;
  done: boolean;
  onToggle: () => void;
  testID?: string;
}

/** Fila de check-in: el círculo es el control; el resto es lectura. */
export function HabitCheckRow({
  title,
  action,
  done,
  onToggle,
  testID,
}: HabitCheckRowProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${title}. ${done ? "Marcado" : "Pendiente"}. ${action}`}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.row,
        done && styles.rowDone,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <View style={[styles.box, done && styles.boxDone]}>
        <Text style={[styles.mark, done && styles.markDone]}>{done ? "✓" : ""}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.action}>{action}</Text>
        <Text style={styles.status}>{done ? "Hecho hoy" : "Toca para marcar"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: space.touch + 20,
    borderRadius: 20,
    backgroundColor: colors.cardSolid,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: "flex-start",
  },
  rowDone: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  pressed: {
    opacity: 0.92,
  },
  box: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: colors.softBorder,
    backgroundColor: colors.cardSolid,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  boxDone: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  mark: {
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: colors.ctaText,
    lineHeight: 22,
  },
  markDone: {
    color: colors.ctaText,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: typeScale.body,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  action: {
    fontSize: typeScale.meta,
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 24,
  },
  status: {
    marginTop: 2,
    fontSize: typeScale.tiny,
    fontFamily: fonts.bodySemi,
    color: colors.inkSoft,
  },
});
