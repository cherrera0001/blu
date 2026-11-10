import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CuentaApp } from "@/app/cuenta/cuenta-app";

const CONFIG = { url: "https://proyecto.supabase.co", anonKey: "anon" };

function mockStore(overrides: Record<string, unknown> = {}) {
  return {
    signIn: vi.fn().mockResolvedValue({ ok: true, user: { email: "ana@blu.cl" } }),
    signUp: vi.fn().mockResolvedValue({ ok: true, user: { email: "ana@blu.cl" } }),
    signOut: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue({ ok: false }),
    ...overrides,
  };
}

describe("pantalla /cuenta (specs/012)", () => {
  afterEach(cleanup);

  it("V1 sin configurar: aviso honesto, sin formulario roto", () => {
    render(<CuentaApp config={null} />);
    expect(screen.getByText(/no están activadas/i)).toBeTruthy();
    expect(screen.queryByLabelText(/correo/i)).toBeNull();
  });

  it("formulario con etiquetas accesibles para correo y contraseña", () => {
    render(<CuentaApp config={CONFIG} store={mockStore() as never} />);
    expect(screen.getByLabelText(/correo electrónico/i)).toBeTruthy();
    expect(screen.getByLabelText(/contraseña/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /entrar con correo/i })).toBeTruthy();
  });

  it("validación: email mal formado y contraseña corta se anuncian en aria-live", async () => {
    const store = mockStore();
    render(<CuentaApp config={CONFIG} store={store as never} />);
    const live = screen.getByRole("status");
    await userEvent.type(screen.getByLabelText(/correo electrónico/i), "no-es-correo");
    await userEvent.type(screen.getByLabelText(/contraseña/i), "corta");
    await userEvent.click(screen.getByRole("button", { name: /entrar con correo/i }));
    expect(live.textContent).toMatch(/correo válido/i);
    expect(store.signIn).not.toHaveBeenCalled();
  });

  it("error del store visible en aria-live (no queda oculto)", async () => {
    const store = mockStore({ signIn: vi.fn().mockResolvedValue({ ok: false, error: "credenciales_invalidas" }) });
    render(<CuentaApp config={CONFIG} store={store as never} />);
    await userEvent.type(screen.getByLabelText(/correo electrónico/i), "ana@blu.cl");
    await userEvent.type(screen.getByLabelText(/contraseña/i), "clave-larga-1");
    await userEvent.click(screen.getByRole("button", { name: /entrar con correo/i }));
    expect(screen.getByRole("status").textContent).toMatch(/revisa tu correo o tu contraseña/i);
  });

  it("crear cuenta exige consentimiento del propósito sincronización (casilla separada)", async () => {
    const store = mockStore();
    render(<CuentaApp config={CONFIG} store={store as never} />);
    await userEvent.click(screen.getByRole("button", { name: /^crear cuenta$/i }));
    await userEvent.type(screen.getByLabelText(/correo electrónico/i), "ana@blu.cl");
    await userEvent.type(screen.getByLabelText(/contraseña/i), "clave-larga-1");
    await userEvent.click(screen.getByRole("button", { name: /crear mi cuenta/i }));
    expect(store.signUp).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /crear mi cuenta/i }));
    expect(store.signUp).toHaveBeenCalledWith("ana@blu.cl", "clave-larga-1", { syncConsent: true });
  });
});
