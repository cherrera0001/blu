"use client";

import { useSyncExternalStore } from "react";

export const BLU_PRESENCE_STATES = [
  "idle",
  "welcome",
  "responding",
  "acknowledge",
  "pause",
  "unavailable",
] as const;

export type BluPresenceState = (typeof BLU_PRESENCE_STATES)[number];

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onStoreChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia(REDUCED_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_QUERY).matches
  );
}

const noReducedOnServer = (): boolean => false;

/**
 * Presencia expresiva decorativa de Blu (specs/017, issue UX-07).
 * Solo refleja eventos reales de la interfaz; nunca infiere emociones ni escucha.
 * Decorativa: aria-hidden; el equivalente textual vive siempre en la interfaz.
 * Con prefers-reduced-motion no se ejecuta animación (pose estática equivalente).
 */
export default function BluPresence({
  state = "idle",
  size = "md",
  pose = "newspaper",
  mood,
}: {
  state?: BluPresenceState;
  size?: "sm" | "md" | "lg";
  pose?: "newspaper" | "builder";
  mood?: "waiting" | "encouraging" | "celebrate" | "thriving" | "resting";
}) {
  const reduced = useSyncExternalStore(
    subscribeToMotionPreference,
    prefersReducedMotion,
    noReducedOnServer,
  );
  const safe = (BLU_PRESENCE_STATES as readonly string[]).includes(state) ? state : "idle";
  const classes = ["blu-presence", `blu-presence--${size}`, `blu-state--${safe}`];
  if (mood) classes.push(`blu-mood--${mood}`);
  if (reduced) classes.push("blu-reduced");
  const src = pose === "builder" ? "/blu-builder.png" : "/blu-newspaper.png";

  return (
    <span
      aria-hidden="true"
      className={classes.join(" ")}
      data-blu-state={safe}
      data-companion-mood={mood}
      data-testid="blu-presence"
    >
      <img
        alt=""
        className="blu-face-img"
        data-testid="blu-illustration"
        draggable={false}
        src={src}
        style={{ display: "block", height: "100%", objectFit: "contain", width: "100%" }}
      />
    </span>
  );
}
