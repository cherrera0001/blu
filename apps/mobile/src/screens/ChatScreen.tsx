import { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { createInitialState, type BluState } from "blu-core/blu";
import { readCompanion } from "blu-core/companion";
import { ActionButton } from "../components/ActionButton";
import { BackButton } from "../components/BackButton";
import { BluCompanion } from "../components/BluCompanion";
import { SpeakButton } from "../components/SpeakButton";
import { BLU_API_BASE } from "../config";
import { httpJson } from "../net/http";
import { buildChatScene } from "../chat/scene";
import { describeReplySource, parseReplySource, type ReplySource } from "../chat/source";
import { useI18n } from "../i18n";
import { colors, fonts, space, type as typeScale } from "../theme";

/** Aviso en contexto (specs/025): el chat es la única vía por la que el texto sale del teléfono. */
export const CHAT_PRIVACY_NOTICE =
  "Tus mensajes, tu idioma y qué temas elegiste viajan al servidor de Blu solo para responderte y no se guardan. Evita escribir datos personales.";

const GREETING =
  "Hola. Puedo acompañarte con ideas sencillas sobre tus temas. No soy un servicio médico.";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  source?: ReplySource;
}

export interface ChatScreenProps {
  state: BluState;
  naturalAvailable: boolean;
  onBack: () => void;
}

export function ChatScreen({ state, naturalAvailable, onBack }: ChatScreenProps) {
  const { locale, t } = useI18n();
  const companion = useMemo(
    () => readCompanion(state.selectedHabitIds.length ? state : createInitialState(), new Date()),
    [state],
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: t(GREETING),
    },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.text ?? "";
  // Blu acompaña al saludo; en cuanto hay conversación, el espacio es para los mensajes.
  // En teléfonos bajos, ni siquiera al saludo: los mensajes no cabrían.
  const { height } = useWindowDimensions();
  const showCompanion = height >= 720 && !messages.some((m) => m.role === "user");

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);
    setError("");
    try {
      const res = await httpJson<{ text?: string; meta?: unknown }>(`${BLU_API_BASE}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene: buildChatScene(state, locale, companion.mood, new Date()) ?? undefined,
          messages: nextMessages.slice(-8).map((m) => ({
            role: m.role,
            text: m.text.slice(0, 2000),
          })),
        }),
      });
      if (!res.ok) throw new Error(`assistant_${res.status}`);
      const data = await res.json();
      const reply =
        data.text?.trim() ||
        t("No pude responder ahora. Puedes intentarlo de nuevo.");
      const source = parseReplySource(data);
      setMessages((prev) => [...prev, { role: "assistant", text: reply, source }]);
    } catch {
      setError(t("No pude contactar a Blu ahora. Revisa la conexión e inténtalo otra vez."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <LinearGradient
      colors={[colors.bgTop, colors.bgMid, colors.bgBottom]}
      style={styles.root}
      testID="chat-screen"
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <View style={styles.header}>
        <BackButton label={t("Volver a Hoy")} onPress={onBack} testID="chat-back" />
        <Text style={styles.brand}>{t("Hablar con Blu")}</Text>
      </View>

      <View style={styles.presence}>
        {showCompanion ? <BluCompanion view={companion} size="sm" /> : null}
        {lastAssistant ? (
          <SpeakButton
            text={lastAssistant}
            label={t("Escuchar respuesta")}
            naturalAvailable={naturalAvailable}
            variant="outline"
            testID="speak-chat"
          />
        ) : null}
      </View>

      <FlatList
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
            ]}
          >
            <Text style={[styles.bubbleText, item.role === "user" && styles.bubbleTextUser]}>{item.text}</Text>
            {item.source && describeReplySource(item.source) ? (
              <Text style={styles.source} testID="chat-reply-source">
                {t(describeReplySource(item.source)!)}
              </Text>
            ) : null}
          </View>
        )}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.privacy} testID="chat-privacy-notice">
        {t(CHAT_PRIVACY_NOTICE)}
      </Text>

      <View style={styles.composer}>
        <TextInput
          accessibilityLabel={t("Mensaje para Blu")}
          placeholder={t("Escribe aquí…")}
          placeholderTextColor={colors.faint}
          value={draft}
          onChangeText={setDraft}
          style={styles.input}
          editable={!busy}
          testID="chat-input"
        />
        <ActionButton
          label={t("Enviar")}
          variant="primary"
          onPress={send}
          disabled={busy || !draft.trim()}
          busy={busy}
          testID="chat-send"
          style={styles.send}
        />
      </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: space.screen,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  brand: {
    fontSize: 28,
    fontFamily: fonts.displaySoft,
    color: colors.ink,
  },
  presence: {
    paddingHorizontal: space.screen,
    gap: 10,
  },
  list: {
    paddingHorizontal: space.screen,
    paddingVertical: 12,
    gap: 10,
  },
  bubble: {
    padding: 14,
    borderRadius: 16,
    maxWidth: "92%",
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: colors.ctaDeep,
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: colors.cardSolid,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bubbleText: {
    fontSize: typeScale.body,
    fontFamily: fonts.body,
    lineHeight: 26,
    color: colors.ink,
  },
  bubbleTextUser: {
    color: colors.ctaText,
  },
  source: {
    marginTop: 6,
    fontSize: typeScale.tiny,
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 18,
  },
  privacy: {
    marginHorizontal: space.screen,
    marginBottom: 6,
    fontSize: typeScale.tiny,
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 18,
  },
  error: {
    marginHorizontal: space.screen,
    color: colors.danger,
    fontFamily: fonts.body,
    marginBottom: 8,
  },
  composer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: space.screen,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: "center",
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: space.touch,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardSolid,
    paddingHorizontal: 14,
    fontSize: typeScale.body,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  send: {
    width: "auto",
    flexShrink: 0,
    minWidth: 104,
    paddingHorizontal: 16,
  },
});
