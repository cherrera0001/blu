import type { MetadataRoute } from "next";

/**
 * Manifest instalable (convención Metadata Route de Next 16, guía PWA instalada).
 * Iconos: personaje oficial (public/blu-newspaper.png), paleta azul/celeste de Blu.
 * Colores: tokens de diseño (--teal / --pale de globals.css).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Blu — guía de bienestar personal",
    short_name: "blu",
    description:
      "Blu te acompaña a elegir y sostener pequeños hábitos de bienestar. No es una aplicación clínica ni reemplaza consejo profesional.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#e8f7ff",
    theme_color: "#2f8fbf",
    icons: [
      { src: "/blu-newspaper.png", sizes: "192x192", type: "image/png" },
      { src: "/blu-newspaper.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
