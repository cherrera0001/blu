import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, type as typeScale } from "../theme";

/**
 * Botón «volver» visible: forma de botón (fondo, borde, flecha grande), no un
 * texto suelto. Personas mayores lo buscan arriba a la izquierda y necesitan
 * reconocerlo sin adivinar (docs/ux/prueba-uso-senior.md).
 */
export function BackButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}
      testID={testID}
    >
      {/* Flecha dibujada (no un carácter): mismo grosor en cualquier fuente o teléfono. */}
      <View style={styles.arrow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.chevron} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    minHeight: 52,
    paddingLeft: 6,
    paddingRight: 18,
    borderRadius: 26,
    backgroundColor: colors.cardSolid,
    borderWidth: 2,
    borderColor: colors.cta,
  },
  pressed: {
    backgroundColor: colors.soft,
  },
  arrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cta,
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: {
    width: 13,
    height: 13,
    borderLeftWidth: 3.5,
    borderBottomWidth: 3.5,
    borderColor: colors.ctaText,
    transform: [{ rotate: "45deg" }],
    marginLeft: 5,
  },
  label: {
    fontSize: typeScale.body,
    fontFamily: fonts.bodyBold,
    color: colors.ctaDeep,
  },
});
