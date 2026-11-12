import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { createInitialState, type BluState } from "blu-core/blu";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { TodayScreen } from "./src/screens/TodayScreen";
import {
  clearBluState,
  loadBluSnapshot,
  saveBluState,
} from "./src/storage";

type Screen = "loading" | "onboarding" | "today";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [state, setState] = useState<BluState>(createInitialState());
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

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

  if (screen === "loading") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color="#1B3A4B" size="large" />
          <Text style={styles.loadingText}>Cargando Blu…</Text>
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
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {error ? (
        <Text style={styles.error} testID="storage-error">
          {error}
        </Text>
      ) : null}
      {showOnboarding ? (
        <OnboardingScreen
          state={state}
          onComplete={async (next) => {
            await persist(next);
            setEditing(false);
            setScreen("today");
          }}
        />
      ) : (
        <TodayScreen
          state={state}
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
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 18,
    color: "#334E5C",
  },
  error: {
    marginHorizontal: 24,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F8E8E8",
    color: "#8B2E2E",
    fontSize: 15,
  },
});
