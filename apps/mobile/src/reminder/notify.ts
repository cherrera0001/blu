import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { BluState } from "blu-core/blu";
import {
  nextReminderAt,
  recordScheduled,
  REMINDER_BODY,
  REMINDER_TITLE,
} from "blu-core/reminder";
import type { Translate } from "../i18n-core";

/**
 * Adaptador de notificaciones LOCALES (ADR-0010). Sin push remoto, sin token
 * de dispositivo, sin analítica de apertura: nada sale del teléfono.
 */
const CHANNEL_ID = "blu-recordatorio";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** El permiso del sistema se pide solo cuando la persona activa el interruptor. */
export async function requestReminderPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

export async function cancelReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    /* sin recordatorios programados que cancelar */
  }
}

/**
 * Reprograma el único recordatorio: cancela lo pendiente y agenda el próximo
 * (máximo uno al día). Devuelve el estado con el día registrado, o el mismo
 * estado si no hay nada que programar.
 */
export async function syncReminder(state: BluState, t: Translate, now = new Date()): Promise<BluState> {
  await cancelReminders();
  const fireAt = nextReminderAt(state, now);
  if (!fireAt || !state.reminder) return state;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: t("Recordatorio amable"),
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: { title: REMINDER_TITLE, body: t(REMINDER_BODY) },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        channelId: CHANNEL_ID,
      },
    });
    return { ...state, reminder: recordScheduled(state.reminder, fireAt) };
  } catch {
    return state;
  }
}
