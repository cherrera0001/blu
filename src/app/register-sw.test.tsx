import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterSW } from "@/app/register-sw";

describe("registro del service worker (BLU-1503)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
  });

  it("no renderiza nada (comportamiento invisible)", () => {
    const register = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    const { container } = render(<RegisterSW />);
    expect(container.firstChild).toBeNull();
  });

  it("registra /sw.js solo en producción con soporte del navegador", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    render(<RegisterSW />);
    await vi.waitFor(() => expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" }));
  });

  it("NO registra en desarrollo (next dev no se atora con caché)", () => {
    vi.stubEnv("NODE_ENV", "development");
    const register = vi.fn();
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    render(<RegisterSW />);
    expect(register).not.toHaveBeenCalled();
  });

  it("NO registra si el navegador no soporta serviceWorker", () => {
    vi.stubGlobal("navigator", {});
    const { container } = render(<RegisterSW />);
    expect(container.firstChild).toBeNull();
  });

  it("un fallo de registro no rompe la app (consola silenciosa)", async () => {
    const register = vi.fn().mockRejectedValue(new Error("sin soporte"));
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    render(<RegisterSW />);
    await vi.waitFor(() => expect(register).toHaveBeenCalled());
  });
});
