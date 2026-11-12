import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { colors, fonts, space, type as typeScale } from "../theme";

export type ActionVariant =
  | "primary"
  | "secondary"
  | "soft"
  | "outline"
  | "danger"
  | "ghost";

export interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: ActionVariant;
  testID?: string;
  disabled?: boolean;
  busy?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/**
 * Botón con roles visuales distintos (no todo el mismo azul lleno).
 * primary = acción principal · soft = voz · secondary = destino · outline/ghost = opciones · danger = irreversible
 */
export function ActionButton({
  label,
  onPress,
  variant = "primary",
  testID,
  disabled = false,
  busy = false,
  accessibilityLabel,
  style,
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !disabled && styles.pressed,
        (disabled || busy) && styles.disabled,
        style,
      ]}
      testID={testID}
    >
      {busy ? (
        <ActivityIndicator
          color={
            variant === "outline" || variant === "ghost" || variant === "soft"
              ? colors.ctaDeep
              : colors.ctaText
          }
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "primary" && styles.labelOnFill,
            variant === "secondary" && styles.labelOnFill,
            variant === "soft" && styles.labelSoft,
            variant === "outline" && styles.labelOutline,
            variant === "danger" && styles.labelDanger,
            variant === "ghost" && styles.labelGhost,
            (disabled || busy) && styles.labelDisabled,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: space.touch,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  primary: {
    backgroundColor: colors.cta,
  },
  secondary: {
    backgroundColor: colors.ink,
  },
  soft: {
    backgroundColor: colors.soft,
    borderWidth: 2,
    borderColor: colors.softBorder,
  },
  outline: {
    backgroundColor: colors.cardSolid,
    borderWidth: 2,
    borderColor: colors.cta,
  },
  danger: {
    backgroundColor: colors.dangerBg,
    borderWidth: 2,
    borderColor: colors.danger,
  },
  ghost: {
    backgroundColor: "transparent",
    minHeight: space.touch,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  // Deshabilitado sin opacidad: el texto sigue legible (contraste ≥ 4,5:1) y
  // se ve claramente distinto de un botón activo.
  disabled: {
    backgroundColor: colors.tint,
    borderColor: colors.cardBorder,
  },
  labelDisabled: {
    color: colors.muted,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.body,
    textAlign: "center",
  },
  labelOnFill: {
    color: colors.ctaText,
  },
  labelSoft: {
    color: colors.ctaDeep,
  },
  labelOutline: {
    color: colors.ctaDeep,
  },
  labelDanger: {
    color: colors.danger,
  },
  labelGhost: {
    color: colors.ctaDeep,
    fontFamily: fonts.bodyBold,
    textDecorationLine: "underline",
  },
});
