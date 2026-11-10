import type { Metadata } from "next";
import { RegisterSW } from "@/app/register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "blu",
  description:
    "Un prototipo para explorar hábitos de bienestar. No ofrece consejo médico ni sustituye atención profesional.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/blu-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/blu-180.png", sizes: "180x180", type: "image/png" }],
  },
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
