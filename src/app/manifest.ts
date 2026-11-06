import type { MetadataRoute } from "next";

/**
 * Manifest instalable (convención Metadata Route de Next 16, guía PWA instalada).
 * Iconos: ilustración vectorial propia (public/blu-newspaper.png), sin assets de terceros.
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
    background_color: "#faf6ef",
    theme_color: "#2f8fbf",
    icons: [
      { src: "/blu-newspaper.png", sizes: "192x192", type: "image/svg+xml" },
      { src: "/blu-newspaper.png", sizes: "512x512", type: "image/svg+xml" },
    ],
  };
}
