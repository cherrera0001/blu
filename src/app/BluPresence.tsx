"use client";

import { useId, useSyncExternalStore } from "react";

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
  const gradientId = useId();
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
        focusable="false"
        height="100%"
        viewBox="0 0 64 64"
        width="100%"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#6ea8ff" />
            <stop offset="100%" stopColor="#3b6fd4" />
          </linearGradient>
        </defs>
        <path
          className="blu-body"
          d="M32 4C18.7 4 8 15.8 8 30c0 15.5 10.7 30 24 30s24-14.5 24-30C56 15.8 45.3 4 32 4Z"
          fill={`url(#${gradientId})`}
        />
        <g className="blu-brows">
          <path d="M17.5 21.5q5.5-4 11-1" />
          <path d="M35.5 20.5q5.5-3 11 1" />
        </g>
        <ellipse className="blu-eye" cx="23" cy="30" rx="4.4" ry="5.4" />
        <ellipse className="blu-eye" cx="41" cy="30" rx="4.4" ry="5.4" />
        <path className="blu-mouth" d="M24 42q8 6.5 16 0" />
        <g className="blu-dots">
          <circle cx="23" cy="43" r="2.6" />
          <circle cx="32" cy="43" r="2.6" />
          <circle cx="41" cy="43" r="2.6" />
        </g>
      </svg>
    </span>
  );
}
