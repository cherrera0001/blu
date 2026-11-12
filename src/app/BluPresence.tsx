"use client";

import { useSyncExternalStore } from "react";
import type { CompanionMood, CompanionPose } from "@/lib/companion";
import BluLiveSvg, { type BluExpression } from "./BluLiveSvg";

export type { BluExpression };

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

/** Expresión facial del sistema vectorial según el estado de presencia. */
export function expressionFromPresence(state: BluPresenceState): BluExpression {
  switch (state) {
    case "welcome":
    case "acknowledge":
      return "happy";
    case "responding":
      return "surprised";
    case "pause":
    case "unavailable":
      return "resting";
    default:
      return "neutral";
  }
}

/** Resuelve el asset: raster holablu o avatar vivo (SVG inline) por expresión. */
export function resolveBluAsset(
  pose: CompanionPose,
  state: BluPresenceState,
): { src: string | null; expression: BluExpression | null; live: boolean } {
  if (pose === "builder") return { src: "/blu-builder.png", expression: null, live: false };
  if (pose === "newspaper") return { src: "/blu-newspaper.png", expression: null, live: false };
  const expression = expressionFromPresence(state);
  return { src: null, expression, live: true };
}

/**
 * Presencia expresiva decorativa de Blu (specs/017, issue UX-07).
 * Solo refleja eventos reales de la interfaz; nunca infiere emociones ni escucha.
 * Decorativa: aria-hidden; el equivalente textual vive siempre en la interfaz.
 * Con prefers-reduced-motion no se ejecuta animación (pose estática equivalente).
 *
 * Poses: newspaper/builder (raster oficial) y companion (SVG vivo + estados).
 */
export default function BluPresence({
  state = "idle",
  size = "md",
  pose = "newspaper",
  mood,
}: {
  state?: BluPresenceState;
  size?: "sm" | "md" | "lg";
  pose?: CompanionPose;
  mood?: CompanionMood;
}) {
  const reduced = useSyncExternalStore(
    subscribeToMotionPreference,
    prefersReducedMotion,
    noReducedOnServer,
  );
  const safe = (BLU_PRESENCE_STATES as readonly string[]).includes(state) ? state : "idle";
  const { src, expression, live } = resolveBluAsset(pose, safe);
  const classes = ["blu-presence", `blu-presence--${size}`, `blu-state--${safe}`];
  if (mood) classes.push(`blu-mood--${mood}`);
  if (pose === "companion" || live) classes.push("blu-pose--companion");
  if (reduced) classes.push("blu-reduced");

  return (
    <span
      aria-hidden="true"
      className={classes.join(" ")}
      data-blu-expression={expression ?? undefined}
      data-blu-live={live ? "true" : undefined}
      data-blu-pose={pose}
      data-blu-state={safe}
      data-companion-mood={mood}
      data-testid="blu-presence"
    >
      {live && expression ? (
        <BluLiveSvg expression={expression} />
      ) : (
        // Ilustración estática local del avatar; next/image no aporta aquí (asset fijo, fill CSS).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="blu-face-img"
          data-testid="blu-illustration"
          draggable={false}
          src={src ?? "/blu-newspaper.png"}
          style={{ display: "block", height: "100%", objectFit: "contain", width: "100%" }}
        />
      )}
    </span>
  );
}
