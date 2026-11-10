export const CONSENT_VERSION = "2.0.0";

export type PurposeId = "operativo" | "mejora" | "investigacion";

export interface PurposeAcceptance {
  acceptedAt: string;
}

export interface ConsentState {
  version: string;
  purposes: Partial<Record<PurposeId, PurposeAcceptance>>;
  updatedAt: string;
}

export function emptyConsent(): ConsentState {
  return { version: CONSENT_VERSION, purposes: {}, updatedAt: "" };
}

/** Migración del checkbox único del prototipo: operativo en versión 1.0.0. */
export function migrateLegacy(consentAcceptedAt: string | null): ConsentState {
  if (consentAcceptedAt === null) {
    return { version: "1.0.0", purposes: {}, updatedAt: "" };
  }
  return {
    version: "1.0.0",
    purposes: { operativo: { acceptedAt: consentAcceptedAt } },
    updatedAt: consentAcceptedAt,
  };
}

export function hasPurpose(consent: ConsentState, purpose: PurposeId): boolean {
  return consent.purposes[purpose] !== undefined;
}

export function acceptPurpose(consent: ConsentState, purpose: PurposeId, now: string): ConsentState {
  return {
    version: CONSENT_VERSION,
    purposes: { ...consent.purposes, [purpose]: { acceptedAt: now } },
    updatedAt: now,
  };
}

export function withdrawPurpose(consent: ConsentState, purpose: PurposeId, now: string): ConsentState {
  const purposes = { ...consent.purposes };
  delete purposes[purpose];
  return { ...consent, purposes, updatedAt: now };
}

export function needsReconsent(consent: ConsentState): boolean {
  return consent.version !== CONSENT_VERSION;
}

export function isConsentState(value: unknown): value is ConsentState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.version !== "string" || typeof v.updatedAt !== "string") return false;
  if (typeof v.purposes !== "object" || v.purposes === null || Array.isArray(v.purposes)) return false;
  const purposes = v.purposes as Record<string, unknown>;
  for (const [key, acceptance] of Object.entries(purposes)) {
    if (key !== "operativo" && key !== "mejora" && key !== "investigacion") return false;
    if (typeof acceptance !== "object" || acceptance === null) return false;
    if (typeof (acceptance as Record<string, unknown>).acceptedAt !== "string") return false;
  }
  return true;
}
