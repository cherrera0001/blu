import { Component, type ContextType, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { I18nContext } from "./i18n";
import { APP_VERSION } from "./version";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Contención de fallos de UI: mensaje llano, sin stack al usuario. */
export class ErrorBoundary extends Component<Props, State> {
  static contextType = I18nContext;
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Blu ErrorBoundary", error.message, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { t } = this.context as ContextType<typeof I18nContext>;
    return (
      <View style={styles.box} testID="error-boundary">
        <Text style={styles.title}>{t("Algo no salió bien")}</Text>
        <Text style={styles.body}>
          {t("Blu se detuvo por un error interno. Tus datos siguen en este dispositivo. Prueba reiniciar la pantalla.")}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => this.setState({ error: null })}
          style={styles.btn}
          testID="error-boundary-retry"
        >
          <Text style={styles.btnText}>{t("Reintentar")}</Text>
        </Pressable>
        <Text style={styles.meta}>Blu {APP_VERSION}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#F4F7FB",
    gap: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1B3A4B",
  },
  body: {
    fontSize: 18,
    lineHeight: 28,
    color: "#334E5C",
  },
  btn: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#1B3A4B",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  meta: {
    marginTop: 12,
    fontSize: 14,
    color: "#7A90A0",
  },
});
