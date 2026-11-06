import { CuentaApp } from "@/app/cuenta/cuenta-app";
import { getV1Config } from "@/lib/v1/config";

export const metadata = {
  title: "Tu cuenta — Blu",
  description: "Cuenta y sincronización opcional de Blu (V1, activación por configuración).",
};

export default function CuentaPage() {
  const config = getV1Config();
  return <CuentaApp config={config} />;
}
