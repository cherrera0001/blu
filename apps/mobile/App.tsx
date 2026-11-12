import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
// El SafeAreaView de react-native no hace nada en Android, y Expo 54 dibuja de
// borde a borde: sin esto, lo de arriba (p. ej. «Volver») queda bajo la barra
// de estado y el campo del chat bajo la barra de navegación.
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
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
import { disableReminder, enableReminder } from "blu-core/reminder";
import { cancelReminders, requestReminderPermission, syncReminder } from "./src/reminder/notify";
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

function localeT(state: BluState) {
  return makeT(state.locale ?? pickLocale(deviceLocaleTag()));
}

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
      // Reprograma el único recordatorio local (ADR-0010) al abrir la app.
      if (snapshot.state.reminder?.enabled) {
        const synced = await syncReminder(snapshot.state, localeT(snapshot.state));
        if (synced !== snapshot.state) await saveBluState(synced);
        snapshot.state = synced;
      }
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

  // Botón «atrás» del teléfono: vuelve a Hoy desde el chat o desde «Cambiar
  // temas», en vez de cerrar la app sin aviso.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screen === "chat") {
        setScreen("today");
        return true;
      }
      if (editing) {
        setEditing(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen, editing]);

  const persist = useCallback(async (next: BluState) => {
    // Cualquier cambio (marcas, hora, apagado) reprograma o cancela el recordatorio.
    const withReminder = next.reminder ? await syncReminder(next, localeT(next)) : next;
    const snapshot = await saveBluState(withReminder);
    setState(snapshot.state);
    setError(snapshot.error);
    return snapshot;
  }, []);

  if (!fontsLoaded || screen === "loading") {
    return (
      <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.cta} size="large" />
          <Text style={styles.loadingText}>{t("Cargando Blu…")}</Text>
        </View>
      </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const showOnboarding =
    screen === "onboarding" ||
    editing ||
    !state.consentAcceptedAt ||
    state.selectedHabitIds.length === 0;

  return (
    <SafeAreaProvider>
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
            onCancel={editing ? () => setEditing(false) : undefined}
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
              await cancelReminders();
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
            onReminderChange={async (enabled, hour) => {
              if (!enabled) {
                await persist(disableReminder(state));
                return true;
              }
              // El permiso del sistema se pide solo aquí, al activar (ADR-0010 regla 1).
              if (!(await requestReminderPermission())) return false;
              await persist(enableReminder(state, hour ?? state.reminder?.hour));
              return true;
            }}
          />
        )}
      </SafeAreaView>
    </ErrorBoundary>
    </I18nProvider>
    </SafeAreaProvider>
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
