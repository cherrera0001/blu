"use client";

import { useEffect } from "react";

/**
 * Registro del service worker de app shell (specs/018, BLU-1503).
 * Solo en producción y con soporte del navegador; en next dev queda desactivado
 * para no servir cachés viejas durante el desarrollo. El fallo de registro nunca
 * rompe la app (la experiencia online es idéntica sin SW).
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
