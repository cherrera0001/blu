/**
 * Base del BFF web (voz natural + asistente). Solo URL pública, sin secretos.
 * Sobrescribible con EXPO_PUBLIC_BLU_API_BASE.
 */
export const BLU_API_BASE =
  (typeof process !== "undefined" &&
    process.env?.EXPO_PUBLIC_BLU_API_BASE?.replace(/\/$/, "")) ||
  "https://blu-bay-kappa.vercel.app";
