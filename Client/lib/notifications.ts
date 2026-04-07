import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { formatCurrency } from "./utils";

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

/**
 * Meminta izin dari perangkat untuk menampilkan notifikasi layar.
 */
export async function requestNotificationPermissions() {
  if (Platform.OS === "web") return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // Khusus Android, butuh membuat konfigurasi "Channel"
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("langgananinaja-reminders", {
      name: "Pengingat Langganan",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6C5CE7",
    });
  }

  return finalStatus === "granted";
}

/**
 * Menjadwalkan alarm notifikasi H-7 dan H-1.
 */
export async function scheduleSubscriptionReminders(subscription: {
  id: string;
  name: string;
  price: number;
  currency: string;
  nextPaymentDate: string;
}) {
  const nextDate = new Date(subscription.nextPaymentDate);
  const now = new Date();

  // 1. Sapu dan batalkan notifikasi lama milik subscription ini (jika ada)
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.subId === subscription.id) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  // 2. Buat jadwal baru untuk H-7 dan H-1
  const daysToNotif = [7, 1];

  for (const daysBefore of daysToNotif) {
    const triggerDate = new Date(nextDate);
    triggerDate.setDate(triggerDate.getDate() - daysBefore);

    // Cek apakah hari peringatan jatuh pada hari ini
    const isToday =
      triggerDate.getDate() === now.getDate() &&
      triggerDate.getMonth() === now.getMonth() &&
      triggerDate.getFullYear() === now.getFullYear();

    if (isToday) {
      // Jika jadwal notifikasi seharusnya berbunyi hari ini,
      // jadwalkan untuk 10 detik dari sekarang agar bisa langsung dites/dilihat.
      triggerDate.setTime(now.getTime() + 10 * 1000);
    } else {
      // Untuk hari-hari lainnya di masa depan, atur alarm bunyi jam 09:00 Pagi
      triggerDate.setHours(9, 0, 0, 0);
    }

    // Kalau waktu trigger-nya masih di masa depan, mari setel notifikasinya!
    if (triggerDate > now) {
      let title = "";
      let body = "";

      if (daysBefore === 7) {
        title = `Tagihan ${subscription.name} Segera Tiba`;
        body = `Hai! Sekadar mengingatkan, tagihan ${subscription.name} sebesar ${formatCurrency(
          subscription.price,
          subscription.currency
        )} akan jatuh tempo 7 hari lagi. Pastikan saldo Anda mencukupi ya.`;
      }

      if (daysBefore === 1) {
        title = `Peringatan: Tagihan ${subscription.name} Besok`;
        body = `Tagihan langganan ${subscription.name} Anda senilai ${formatCurrency(
          subscription.price,
          subscription.currency
        )} akan jatuh tempo esok hari. Mohon siapkan dana untuk menghindari kelambatan.`;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { subId: subscription.id },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
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
