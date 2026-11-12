import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActionButton } from "./ActionButton";
import { colors, fonts, type as typeScale } from "../theme";
import { speakText, stopSpeaking, type SpeakResult } from "../voice/speak";

export interface SpeakButtonProps {
  text: string;
  label?: string;
  testID?: string;
  preferNatural?: boolean;
  naturalAvailable?: boolean;
  /** soft = voz (no compite con CTA principal); outline = secundario */
  variant?: "soft" | "outline" | "ghost";
}

/**
 * Escuchar: voz natural ElevenLabs (BFF) con respaldo local.
 * Visualmente es una acción de acompañamiento, no el CTA principal de la pantalla.
 */
export function SpeakButton({
  text,
  label = "Escuchar",
  testID = "speak-button",
  preferNatural = true,
  naturalAvailable = true,
  variant = "soft",
}: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<SpeakResult | null>(null);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  async function onPress() {
    if (!text.trim()) return;
    if (speaking || loading) {
      stopSpeaking();
      setSpeaking(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSpeaking(true);
    setMode(null);
    try {
      const result = await speakText(text, {
        preferNatural: preferNatural && naturalAvailable,
      });
      setMode(result);
    } finally {
      setLoading(false);
      setSpeaking(false);
    }
  }

  const title = loading ? "Preparando voz…" : speaking ? "Detener" : label;
  const hint =
    mode === "natural"
      ? "Voz natural de Blu (audio generado en el servidor)"
      : mode === "local"
        ? "Voz del teléfono (respaldo)"
        : mode === "failed"
          ? "No pude reproducir el audio. Intenta de nuevo."
          : naturalAvailable && preferNatural
            ? "La voz natural envía este texto al servidor de Blu; no se guarda."
            : "Puedes oír a Blu con la voz del teléfono";

  return (
    <View style={styles.wrap}>
      <ActionButton
        label={title}
        onPress={onPress}
        variant={speaking || loading ? "outline" : variant}
        busy={loading}
        testID={testID}
        accessibilityLabel={speaking ? "Detener lectura" : "Escuchar en voz alta"}
      />
      <Text style={styles.hint} testID={`${testID}-hint`}>
        {hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    alignItems: "center",
    width: "100%",
  },
  hint: {
    fontSize: typeScale.tiny,
    color: colors.muted,
    fontFamily: fonts.body,
    textAlign: "center",
  },
});
