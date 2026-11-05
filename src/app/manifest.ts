import type { MetadataRoute } from "next";

/**
 * Manifest instalable (convención Metadata Route de Next 16, guía PWA instalada).
 * Iconos: avatar propio 560×560 (public/blu-avatar.jpg), sin assets de terceros.
 * Colores: tokens de diseño (--teal / --pale de globals.css).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Blu — guía de bienestar personal",
    short_name: "Blu",
    description:
      "Blu te acompaña a elegir y sostener pequeños hábitos de bienestar. No es una aplicación clínica ni reemplaza consejo profesional.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f8f3",
    theme_color: "#167c74",
    icons: [
      { src: "/blu-avatar.jpg", sizes: "192x192", type: "image/jpeg" },
      { src: "/blu-avatar.jpg", sizes: "512x512", type: "image/jpeg" },
      { src: "/blu-avatar.jpg", sizes: "560x560", type: "image/jpeg", purpose: "any" },
    ],
  };
}
