import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { formatCurrency } from "./utils";

const REMINDER_CHANNEL_ID = "langganinaja-reminders";
const REMINDER_DAYS = [7, 3, 1, 0] as const;
const REMINDER_TIMES = [
  { hour: 9, minute: 0 },
  { hour: 19, minute: 0 },
] as const;

// Handler global: Izinkan notikasi tetap muncul meski aplikasi sedang terbuka (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureReminderChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: "Pengingat Langganan",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#2563EB",
    sound: "default",
  });
}

/**
 * Meminta izin dari perangkat untuk menampilkan notifikasi layar.
 */
export async function requestNotificationPermissions() {
  if (Platform.OS === "web") return false;

  await ensureReminderChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

function getReminderCopy(subscription: {
  name: string;
  price: number;
  currency: string;
}, daysBefore: (typeof REMINDER_DAYS)[number]) {
  const priceText = formatCurrency(subscription.price, subscription.currency);

  if (daysBefore === 0) {
    return {
      title: `Tagihan ${subscription.name} jatuh tempo hari ini`,
      body: `Tagihan ${subscription.name} sebesar ${priceText} jatuh tempo hari ini. Jangan lupa dicek ya.`,
    };
  }

  if (daysBefore === 1) {
    return {
      title: `Tagihan ${subscription.name} besok`,
      body: `Tagihan ${subscription.name} sebesar ${priceText} akan jatuh tempo besok.`,
    };
  }

  return {
    title: `Tagihan ${subscription.name} H-${daysBefore}`,
    body: `${subscription.name} sebesar ${priceText} akan jatuh tempo ${daysBefore} hari lagi.`,
  };
}

/**
 * Menjadwalkan alarm notifikasi H-7, H-3, H-1, dan hari H.
 * Setiap hari pengingat muncul dua kali: pagi dan malam.
 */
export async function scheduleSubscriptionReminders(subscription: {
  id: string;
  name: string;
  price: number;
  currency: string;
  nextPaymentDate: string;
}) {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  const nextDate = new Date(subscription.nextPaymentDate);
  const now = new Date();

  // 1. Sapu dan batalkan notifikasi lama milik subscription ini (jika ada)
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.subId === subscription.id) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  // 2. Buat jadwal baru untuk H-7, H-3, H-1, dan hari H. Masing-masing 2x.
  for (const daysBefore of REMINDER_DAYS) {
    for (const time of REMINDER_TIMES) {
      const triggerDate = new Date(nextDate);
      triggerDate.setDate(triggerDate.getDate() - daysBefore);
      triggerDate.setHours(time.hour, time.minute, 0, 0);

      if (triggerDate <= now) continue;

      const { title, body } = getReminderCopy(subscription, daysBefore);

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            subId: subscription.id,
            daysBefore,
            reminderTime: `${time.hour}:${time.minute.toString().padStart(2, "0")}`,
          },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: REMINDER_CHANNEL_ID,
        },
      });
    }
  }
}

/**
 * Membatalkan notifikasi spesifik saat langganan dihapus
 */
export async function cancelSubscriptionReminders(subId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.subId === subId) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}
