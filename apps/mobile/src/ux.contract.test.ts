import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contrato de UX: regresiones visuales que ya pasaron en dispositivo y que un
 * test de lógica no ve. Cada regla dice por qué existe.
 */
const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("UX — se ve y se puede volver", () => {
  it("SafeAreaView viene de safe-area-context (el de react-native no protege nada en Android de borde a borde)", () => {
    const app = read("App.tsx");
    expect(app).toMatch(/from "react-native-safe-area-context"/);
    expect(app).toMatch(/<SafeAreaProvider>/);
    const rnImport = app.match(/import\s*\{([^}]*)\}\s*from\s*"react-native";/)?.[1] ?? "";
    expect(rnImport).not.toMatch(/\bSafeAreaView\b/);
  });

  it("el botón atrás del teléfono vuelve a Hoy en vez de cerrar la app", () => {
    expect(read("App.tsx")).toMatch(/BackHandler\.addEventListener\("hardwareBackPress"/);
  });

  it("volver es un botón visible, no un texto suelto", () => {
    const chat = read("src/screens/ChatScreen.tsx");
    expect(chat).toMatch(/<BackButton[^>]*testID="chat-back"/);
    expect(read("src/screens/OnboardingScreen.tsx")).toMatch(/<BackButton[^>]*testID="onboarding-back"/);
    const back = read("src/components/BackButton.tsx");
    expect(back).toMatch(/minHeight: 5[2-9]|minHeight: [6-9]\d/);
    expect(back).toMatch(/borderWidth: 2/);
  });

  it("el chat no queda tapado por el teclado y Enviar no se sale de la pantalla", () => {
    const chat = read("src/screens/ChatScreen.tsx");
    expect(chat).toMatch(/<KeyboardAvoidingView/);
    expect(chat).toMatch(/input: \{[^}]*minWidth: 0/);
    expect(chat).toMatch(/send: \{[^}]*flexShrink: 0/);
  });

  it("un botón deshabilitado sigue legible (sin opacidad) y Continuar nunca se apaga sin explicar", () => {
    expect(read("src/components/ActionButton.tsx")).not.toMatch(/opacity: 0\.[0-5]/);
    const onb = read("src/screens/OnboardingScreen.tsx");
    expect(onb).not.toMatch(/disabled=\{!canContinue\}/);
    expect(onb).toMatch(/testID="continue-pending"/);
  });

  it("los interruptores muestran su estado en palabras, no solo por color", () => {
    const panel = read("src/components/OptionsPanel.tsx");
    expect(panel.match(/t\("Encendido"\) : t\("Apagado"\)/g)?.length).toBe(2);
  });
});
