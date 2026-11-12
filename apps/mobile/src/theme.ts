/** Paleta holablu oficial (design/BLU_CHARACTER_SYSTEM.md) + UI senior. */
export const colors = {
  bgTop: "#7EC8F8",
  bgMid: "#D4ECFC",
  bgBottom: "#F3F9FD",
  ink: "#0A2F54",
  inkSoft: "#164A73",
  muted: "#3A6788",
  faint: "#6E96B4",
  card: "#FFFFFF",
  /** Alias estable para fondos de interacción. */
  cardSolid: "#FFFFFF",
  cardBorder: "#B7DCF5",
  tint: "#CCE8FB",
  success: "#1F7A4D",
  successBg: "#E7F7EE",
  warn: "#8A4B12",
  danger: "#A33B3B",
  dangerBg: "#FBECEC",
  cta: "#1878F8",
  ctaDeep: "#0E5AD0",
  ctaText: "#FFFFFF",
  soft: "#E8F4FF",
  softBorder: "#8EC4F0",
  bluDrop: "#60B8F8",
  sheen: "#A8D8F8",
} as const;

export const space = {
  screen: 20,
  gap: 14,
  touch: 56,
} as const;

export const type = {
  brand: 44,
  title: 28,
  lead: 20,
  body: 18,
  meta: 16,
  tiny: 14,
} as const;

export const fonts = {
  display: "Fraunces_700Bold",
  displaySoft: "Fraunces_600SemiBold",
  body: "Nunito_500Medium",
  bodyBold: "Nunito_700Bold",
  bodySemi: "Nunito_600SemiBold",
} as const;
