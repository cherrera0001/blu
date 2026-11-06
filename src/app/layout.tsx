import type { Metadata } from "next";
import { RegisterSW } from "@/app/register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blu — tu bienestar, un día a la vez",
  description:
    "Un prototipo para explorar hábitos de bienestar. No ofrece consejo médico ni sustituye atención profesional.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
