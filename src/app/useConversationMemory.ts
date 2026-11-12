"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ConsentState } from "@/lib/consent";
import { canRemember, type MemoryConfig, type MemoryMessage } from "@/lib/memory/policy";
import { createMemoryStore, type ForgetResult } from "@/lib/memory/store";
import { currentAccessToken } from "@/lib/v1/account-store";

export interface ConversationMemory {
  /** La instalación la ofrece y hay sesión: se puede mostrar el interruptor. */
  available: boolean;
  /** Además hay consentimiento: se lee y escribe. */
  active: boolean;
  /** Conversación recuperada al abrir (null mientras carga o si no aplica). */
  restored: MemoryMessage[] | null;
  append(messages: MemoryMessage[]): void;
  forget(): Promise<ForgetResult>;
}

/**
 * Memoria conversacional opt-in (#43). Sin config, sin sesión o sin
 * consentimiento, no toca la red y la conversación vive solo en la pestaña.
 */
const noSubscribe = () => () => {};

export function useConversationMemory(config: MemoryConfig | null, consent: ConsentState): ConversationMemory {
  // El token solo existe en el navegador; en el servidor es null (sin desajuste SSR).
  const token = useSyncExternalStore(
    noSubscribe,
    () => (config ? currentAccessToken() : null),
    () => null,
  );

  const active = canRemember(config, token, consent);
  const store = useMemo(
    () => (active && config && token ? createMemoryStore(config, token) : null),
    [active, config, token],
  );
  const [restored, setRestored] = useState<MemoryMessage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!store) return;
    void store.load().then((messages) => {
      if (!cancelled) setRestored(messages);
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  return {
    available: Boolean(config && token),
    active,
    restored: store ? restored : null,
    append(messages) {
      if (store) void store.append(messages);
    },
    async forget() {
      if (!config || !token) return { verified: true, marked: 0 };
      // Olvidar no depende del consentimiento vigente: también sirve al retirarlo.
      return createMemoryStore(config, token).forget();
    },
  };
}
