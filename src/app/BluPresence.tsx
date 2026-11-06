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
}: {
  state?: BluPresenceState;
  size?: "sm" | "md" | "lg";
}) {
  const reduced = useSyncExternalStore(
    subscribeToMotionPreference,
    prefersReducedMotion,
    noReducedOnServer,
  );
  const safe = (BLU_PRESENCE_STATES as readonly string[]).includes(state) ? state : "idle";
  const classes = ["blu-presence", `blu-presence--${size}`, `blu-state--${safe}`];
  if (reduced) classes.push("blu-reduced");

  return (
    <span
      aria-hidden="true"
      className={classes.join(" ")}
      data-blu-state={safe}
      data-testid="blu-presence"
    >
      <svg
        className="blu-face-svg"
        data-testid="blu-illustration"
        focusable="false"
        height="100%"
        viewBox="0 0 120 120"
        width="100%"
      >
        <circle className="blu-backdrop" cx="60" cy="60" r="57" />
        <path
          className="blu-body"
          d="M60 14C50 26 33 45 29 61c-5 20 8 39 31 39s36-19 31-39c-4-16-21-35-31-47Z"
        />
        <path className="blu-highlight" d="M47 36c-7 9-12 18-14 27" />
        <g className="blu-brows">
          <path d="M42 48q6-4 12-1" />
          <path d="M66 47q6-3 12 1" />
        </g>
        <ellipse className="blu-eye" cx="48" cy="59" rx="6" ry="7" />
        <ellipse className="blu-eye" cx="72" cy="59" rx="6" ry="7" />
        <circle className="blu-pupil" cx="49" cy="60" r="2.3" />
        <circle className="blu-pupil" cx="73" cy="60" r="2.3" />
        <circle className="blu-eye-glint" cx="50" cy="57" r="1.1" />
        <circle className="blu-eye-glint" cx="74" cy="57" r="1.1" />
        <path className="blu-mouth" d="M51 76q9 9 18 0" />
        <g className="blu-dots">
          <circle cx="48" cy="77" r="2.5" />
          <circle cx="60" cy="77" r="2.5" />
          <circle cx="72" cy="77" r="2.5" />
        </g>
      </svg>
    </span>
  );
}
