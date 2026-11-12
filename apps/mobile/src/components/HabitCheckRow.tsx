import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SmallerOption } from "blu-core/adapt";
import type { Barrier } from "blu-core/blu";
import type { WhyNote } from "../content/why";
import { useI18n } from "../i18n";
import { colors, fonts, space, type as typeScale } from "../theme";

export interface HabitCheckRowProps {
  title: string;
  action: string;
  done: boolean;
  onToggle: () => void;
  /** Versiones menores para ese motivo (máx. 3); presente si hay alguna. */
  getOptions?: (barrier: Barrier) => SmallerOption[];
  onSimplify?: (barrier: Barrier, to: string) => void;
  /** Presente si la persona ya ajustó este hábito y puede volver atrás. */
  onUndo?: () => void;
  /** «¿Por qué este paso?»: notas breves con fuente honesta. */
  why?: WhyNote[];
  whyDisclaimer?: string;
  testID?: string;
}

const BARRIERS: { id: Barrier; label: string }[] = [
  { id: "time", label: "Me faltó tiempo" },
  { id: "energy", label: "Tenía poca energía" },
  { id: "remembering", label: "Se me olvidó" },
  { id: "other", label: "Otra razón" },
];

/**
 * Fila de check-in. El bloque superior es el control de marcar; debajo, una vía
 * discreta para bajar la exigencia sin culpa (paridad web, BLU-1102).
 */
export function HabitCheckRow({
  title,
  action,
  done,
  onToggle,
  getOptions,
  onSimplify,
  onUndo,
  why,
  whyDisclaimer,
  testID,
}: HabitCheckRowProps) {
  const { t } = useI18n();
  const [asking, setAsking] = useState(false);
  const [barrier, setBarrier] = useState<Barrier | null>(null);
  const options = barrier && getOptions ? getOptions(barrier) : [];
  const closeAsk = () => {
    setAsking(false);
    setBarrier(null);
  };
  const [showWhy, setShowWhy] = useState(false);
  const canAdapt = !done && Boolean(onSimplify || onUndo);
  const hasWhy = Boolean(why && why.length);

  return (
    <View style={[styles.row, done && styles.rowDone]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${title}. ${done ? t("Marcado") : t("Pendiente")}. ${action}`}
        onPress={onToggle}
        style={({ pressed }) => [styles.check, pressed && styles.pressed]}
        testID={testID}
      >
        <View style={[styles.box, done && styles.boxDone]}>
          <Text style={styles.mark}>{done ? "✓" : ""}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.action}>{action}</Text>
          <Text style={styles.status}>{done ? t("Hecho hoy") : t("Toca para marcar")}</Text>
        </View>
      </Pressable>

      {canAdapt || hasWhy ? (
        <View style={styles.adapt}>
          {asking && onSimplify && canAdapt ? (
            <View style={styles.ask} testID={testID ? `${testID}-barriers` : undefined}>
              {barrier === null ? (
                <>
                  <Text style={styles.askTitle}>{t("¿Qué lo hizo difícil? Probamos algo más pequeño.")}</Text>
                  {BARRIERS.map((b) => (
                    <Pressable
                      key={b.id}
                      accessibilityRole="button"
                      onPress={() => setBarrier(b.id)}
                      style={({ pressed }) => [styles.barrier, pressed && styles.pressed]}
                      testID={testID ? `${testID}-barrier-${b.id}` : undefined}
                    >
                      <Text style={styles.barrierText}>{t(b.label)}</Text>
                    </Pressable>
                  ))}
                </>
              ) : (
                <>
                  <Text style={styles.askTitle}>{t("Elige la que te parezca posible hoy:")}</Text>
                  {options.map((option, index) => (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${t(option.title)}. ${t(option.text)}`}
                      onPress={() => {
                        onSimplify(barrier, option.text);
                        closeAsk();
                      }}
                      style={({ pressed }) => [styles.barrier, pressed && styles.pressed]}
                      testID={testID ? `${testID}-option-${index}` : undefined}
                    >
                      <Text style={styles.optionTitle}>{t(option.title)}</Text>
                      <Text style={styles.barrierText}>{t(option.text)}</Text>
                    </Pressable>
                  ))}
                  <Text style={styles.whySource}>{t("Puedes volver a la versión anterior cuando quieras.")}</Text>
                </>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={closeAsk}
                style={styles.link}
              >
                <Text style={styles.linkText}>{t("Ahora no")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.links}>
              {hasWhy ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showWhy }}
                  onPress={() => setShowWhy((v) => !v)}
                  style={styles.link}
                  testID={testID ? `${testID}-why` : undefined}
                >
                  <Text style={styles.linkText}>{t("¿Por qué este paso?")}</Text>
                </Pressable>
              ) : null}
              {canAdapt && onSimplify ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint={t("Te propongo una versión más pequeña de este paso")}
                  onPress={() => setAsking(true)}
                  style={styles.link}
                  testID={testID ? `${testID}-simplify` : undefined}
                >
                  <Text style={styles.linkText}>{t("Se me hace difícil")}</Text>
                </Pressable>
              ) : null}
              {canAdapt && onUndo ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onUndo}
                  style={styles.link}
                  testID={testID ? `${testID}-undo` : undefined}
                >
                  <Text style={styles.linkText}>{t("Volver a la versión anterior")}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
          {showWhy && hasWhy ? (
            <View style={styles.why} testID={testID ? `${testID}-why-notes` : undefined}>
              {why!.map((note) => (
                <View key={note.id} style={styles.whyNote}>
                  <Text style={styles.whyTitle}>{note.title}</Text>
                  <Text style={styles.whyText}>{note.text}</Text>
                  <Text style={styles.whySource}>{note.sourceLine}</Text>
                </View>
              ))}
              {whyDisclaimer ? <Text style={styles.whySource}>{whyDisclaimer}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 20,
    backgroundColor: colors.cardSolid,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },
  rowDone: {
    borderColor: colors.warm,
    backgroundColor: colors.warmBg,
  },
  check: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: space.touch + 20,
    alignItems: "flex-start",
  },
  pressed: {
    opacity: 0.85,
  },
  box: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    // ≥3:1 sobre blanco (WCAG 1.4.11): el control debe verse sin estar marcado.
    borderColor: colors.cta,
    backgroundColor: colors.cardSolid,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  boxDone: {
    borderColor: colors.warm,
    backgroundColor: colors.warm,
  },
  mark: {
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: colors.ctaText,
    lineHeight: 22,
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
    color: colors.inkSoft,
    lineHeight: 24,
  },
  status: {
    marginTop: 2,
    fontSize: typeScale.tiny,
    fontFamily: fonts.bodySemi,
    color: colors.inkSoft,
  },
  adapt: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  links: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 18,
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
  why: {
    gap: 12,
    paddingTop: 4,
    paddingBottom: 10,
  },
  whyNote: {
    gap: 4,
  },
  whyTitle: {
    fontSize: typeScale.meta,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  whyText: {
    fontSize: typeScale.meta,
    fontFamily: fonts.body,
    color: colors.inkSoft,
    lineHeight: 24,
  },
  whySource: {
    fontSize: typeScale.tiny,
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 20,
  },
  ask: {
    gap: 8,
    paddingVertical: 8,
  },
  askTitle: {
    fontSize: typeScale.meta,
    fontFamily: fonts.bodySemi,
    color: colors.ink,
    lineHeight: 24,
  },
  barrier: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.softBorder,
    backgroundColor: colors.soft,
  },
  optionTitle: {
    fontSize: typeScale.tiny,
    fontFamily: fonts.bodyBold,
    color: colors.muted,
    marginTop: 8,
  },
  barrierText: {
    fontSize: typeScale.meta,
    fontFamily: fonts.bodySemi,
    color: colors.ink,
  },
});
