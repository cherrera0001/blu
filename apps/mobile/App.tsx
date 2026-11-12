import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
// Imports por peso: el índice del paquete arrastra todas las variantes (~40 TTF).
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";
import { Fraunces_700Bold } from "@expo-google-fonts/fraunces/700Bold";
import { Nunito_500Medium } from "@expo-google-fonts/nunito/500Medium";
import { Nunito_600SemiBold } from "@expo-google-fonts/nunito/600SemiBold";
import { Nunito_700Bold } from "@expo-google-fonts/nunito/700Bold";
import { createInitialState, type BluState } from "blu-core/blu";
import { ErrorBoundary } from "./src/ErrorBoundary";
import { BLU_HERMES_HARDENED } from "./src/polyfill";
import { pickLocale } from "blu-core/i18n";
import { deviceLocaleTag, makeT } from "./src/i18n-core";
import { I18nProvider } from "./src/i18n";
import { ChatScreen } from "./src/screens/ChatScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { TodayScreen } from "./src/screens/TodayScreen";
import {
  clearBluState,
  loadBluSnapshot,
  saveBluState,
} from "./src/storage";
import { colors } from "./src/theme";

// Ancla el polyfill Hermes en el grafo de módulos de la UI.
void BLU_HERMES_HARDENED;

type Screen = "loading" | "onboarding" | "today" | "chat";

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const [screen, setScreen] = useState<Screen>("loading");
  const [state, setState] = useState<BluState>(createInitialState());
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  // ElevenLabs vía BFF de producción salvo que la persona elija solo voz del teléfono.
  // No sondear en el arranque (evita crash Hermes/fetch).
  const naturalAvailable = state.voicePreference !== "device";
  // Idioma: el elegido en Opciones; si no, el del teléfono (o castellano).
  const locale = state.locale ?? pickLocale(deviceLocaleTag());
  const t = makeT(locale);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snapshot = await loadBluSnapshot();
      if (cancelled) return;
      setState(snapshot.state);
      setError(snapshot.error);
      const ready =
        Boolean(snapshot.state.consentAcceptedAt) &&
        snapshot.state.selectedHabitIds.length > 0;
      setScreen(ready ? "today" : "onboarding");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: BluState) => {
    const snapshot = await saveBluState(next);
    setState(snapshot.state);
    setError(snapshot.error);
    return snapshot;
  }, []);

  if (!fontsLoaded || screen === "loading") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.cta} size="large" />
          <Text style={styles.loadingText}>{t("Cargando Blu…")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showOnboarding =
    screen === "onboarding" ||
    editing ||
    !state.consentAcceptedAt ||
    state.selectedHabitIds.length === 0;

  return (
    <I18nProvider locale={locale}>
    <ErrorBoundary>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        {error ? (
          <Text style={styles.error} testID="storage-error">
            {t(error)}
          </Text>
        ) : null}
        {screen === "chat" && !showOnboarding ? (
          <ChatScreen
            state={state}
            naturalAvailable={naturalAvailable}
            onBack={() => setScreen("today")}
          />
        ) : showOnboarding ? (
          <OnboardingScreen
            state={state}
            naturalAvailable={naturalAvailable}
            onComplete={async (next) => {
              await persist(next);
              setEditing(false);
              setScreen("today");
            }}
          />
        ) : (
          <TodayScreen
            state={state}
            naturalAvailable={naturalAvailable}
            onChange={async (next) => {
              await persist(next);
            }}
            onClear={async () => {
              const snapshot = await clearBluState();
              setState(snapshot.state);
              setError(snapshot.error);
              setEditing(false);
              setScreen("onboarding");
            }}
            onEditSelection={() => setEditing(true)}
            onOpenChat={() => setScreen("chat")}
            onChangeLocale={async (next) => {
              await persist({ ...state, locale: next });
            }}
          />
        )}
      </SafeAreaView>
    </ErrorBoundary>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgMid,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 18,
    color: colors.inkSoft,
  },
  error: {
    marginHorizontal: 24,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F8E8E8",
    color: colors.danger,
    fontSize: 15,
  },
});
