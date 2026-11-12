import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Felt, ReviewDecision, ReviewInput } from "blu-core/review";
import { useI18n } from "../i18n";
import { colors, fonts, type as typeScale } from "../theme";

const FEELS: { value: Felt; label: string }[] = [
  { value: "better", label: "Me sentí bien" },
  { value: "same", label: "Más o menos igual" },
  { value: "harder", label: "Se me hizo difícil" },
];

const DECISIONS: { value: ReviewDecision; label: string }[] = [
  { value: "keep", label: "Seguir como está" },
  { value: "adjust", label: "Probar algo más pequeño" },
];

export interface WeeklyReviewCardProps {
  onSave: (input: Omit<ReviewInput, "weekKey">) => void;
  /** Texto a mostrar tras guardar (la tarjeta queda como acuse breve). */
  savedReply: string | null;
}

/**
 * Revisión semanal mínima (BLU-1202): una pregunta, dos decisiones, todo
 * opcional. Solo aparece de viernes a domingo y desaparece al responder o saltar.
 */
export function WeeklyReviewCard({ onSave, savedReply }: WeeklyReviewCardProps) {
  const { t } = useI18n();
  const [felt, setFelt] = useState<Felt | null>(null);

  if (savedReply) {
    return (
      <View style={styles.card} testID="weekly-review-saved" accessibilityLiveRegion="polite">
        <Text style={styles.title}>{t("Tu semana")}</Text>
        <Text style={styles.text}>{savedReply}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card} testID="weekly-review">
      <Text style={styles.title}>{t("Tu semana")}</Text>
      {felt === null ? (
        <>
          <Text style={styles.text}>{t("Si quieres, cuéntame cómo te fue. Puedes saltarlo.")}</Text>
          {FEELS.map((f) => (
            <Pressable
              key={f.value}
              accessibilityRole="button"
              onPress={() => setFelt(f.value)}
              style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
              testID={`review-felt-${f.value}`}
            >
              <Text style={styles.choiceText}>{t(f.label)}</Text>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.text}>{t("¿Qué prefieres para la próxima semana?")}</Text>
          {DECISIONS.map((d) => (
            <Pressable
              key={d.value}
              accessibilityRole="button"
              onPress={() => onSave({ felt, decision: d.value })}
              style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
              testID={`review-decision-${d.value}`}
            >
              <Text style={styles.choiceText}>{t(d.label)}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => onSave({ felt })}
            style={styles.link}
            testID="review-only-felt"
          >
            <Text style={styles.linkText}>{t("Guardar solo cómo me sentí")}</Text>
          </Pressable>
        </>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => onSave({})}
        style={styles.link}
        testID="review-skip"
      >
        <Text style={styles.linkText}>{t("Prefiero no responder")}</Text>
      </Pressable>
      <Text style={styles.note}>{t("Es un registro tuyo, no una medida de salud.")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardSolid,
  },
  title: {
    fontSize: typeScale.lead,
    fontFamily: fonts.displaySoft,
    color: colors.ink,
  },
  text: {
    fontSize: typeScale.body,
    fontFamily: fonts.body,
    color: colors.inkSoft,
    lineHeight: 26,
  },
  choice: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.softBorder,
    backgroundColor: colors.soft,
  },
  pressed: {
    opacity: 0.85,
  },
  choiceText: {
    fontSize: typeScale.body,
    fontFamily: fonts.bodySemi,
    color: colors.ink,
  },
  link: {
    minHeight: 44,
    justifyContent: "center",
  },
  linkText: {
    fontSize: typeScale.meta,
    fontFamily: fonts.bodySemi,
    color: colors.ctaDeep,
    textDecorationLine: "underline",
  },
  note: {
    fontSize: typeScale.tiny,
    fontFamily: fonts.body,
    color: colors.muted,
  },
});
