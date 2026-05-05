import { create } from "zustand";
import {
  Subscription,
  SubscriptionSummary,
  CreateSubscriptionPayload,
  UpdateSubscriptionPayload,
  PaymentLog,
} from "@/types";
import {
  createLocalSubscription,
  deleteLocalSubscription,
  getLocalPaymentHistory,
  getLocalSubscriptions,
  getLocalSummary,
  markLocalSubscriptionAsPaid,
  updateLocalSubscription,
} from "@/lib/localDb";
import { scheduleSubscriptionReminders, cancelSubscriptionReminders } from "@/lib/notifications";
import { scheduleWidgetSync } from "@/lib/widgetSync";
import { useAuthStore } from "@/store/authStore";

interface SubscriptionState {
  subscriptions: Subscription[];
  summary: SubscriptionSummary | null;
  paymentHistory: PaymentLog[];
  isLoading: boolean;
  isRefreshing: boolean;

  // Actions
  fetchSubscriptions: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  createSubscription: (payload: CreateSubscriptionPayload) => Promise<Subscription>;
  updateSubscription: (id: string, payload: UpdateSubscriptionPayload) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
  markAsPaid: (id: string, note?: string) => Promise<void>;
  fetchPaymentHistory: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  summary: null,
  paymentHistory: [],
  isLoading: false,
  isRefreshing: false,

  fetchSubscriptions: async () => {
    set({ isLoading: true });
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        set({ subscriptions: [], isLoading: false });
        return;
      }

      const subscriptions = await getLocalSubscriptions(userId);
      set({ subscriptions, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchSummary: async () => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        set({ summary: null });
        return;
      }

      const summary = await getLocalSummary(userId);
      set({ summary });
    } catch {
      // Silently fail for summary
    }
  },

  createSubscription: async (payload: CreateSubscriptionPayload) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error("User belum login");

    const subscription = await createLocalSubscription(userId, payload);
    set((state) => ({
      subscriptions: [subscription, ...state.subscriptions],
    }));

    // [FITUR BARU] Jadwalkan notifikasi H-7 dan H-1
    try {
      await scheduleSubscriptionReminders({
        id: subscription.id,
        name: subscription.name,
        price: subscription.price,
        currency: subscription.currency as any || "IDR",
        nextPaymentDate: subscription.nextPaymentDate,
      });
    } catch (e) {
      console.log("Gagal buat notifikasi", e);
    }

    await get().fetchSummary();
    scheduleWidgetSync(); // Real-time widget update
    return subscription;
  },

  updateSubscription: async (id: string, payload: UpdateSubscriptionPayload) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error("User belum login");

    const subscription = await updateLocalSubscription(userId, id, payload);
    set((state) => ({
      subscriptions: state.subscriptions.map((s) =>
        s.id === id ? subscription : s
      ),
    }));

    // Update notifikasi jika datanya berubah
    try {
      await scheduleSubscriptionReminders({
        id: subscription.id,
        name: subscription.name,
        price: subscription.price,
        currency: subscription.currency as any || "IDR",
        nextPaymentDate: subscription.nextPaymentDate,
      });
    } catch (e) {
      console.log("Gagal buat notifikasi", e);
    }

    await get().fetchSummary();
    scheduleWidgetSync(); // Real-time widget update
  },

  deleteSubscription: async (id: string) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error("User belum login");

    await deleteLocalSubscription(userId, id);
    set((state) => ({
      subscriptions: state.subscriptions.filter((s) => s.id !== id),
    }));

    // Batalin semua alarm sisa kalau langganan dihapus (Arsip)
    try {
      await cancelSubscriptionReminders(id);
    } catch (e) {
      console.log("Gagal membatalkan notifikasi", e);
    }
    await get().fetchSummary();
    scheduleWidgetSync(); // Real-time widget update
  },

  toggleActive: async (id: string, isActive: boolean) => {
    await get().updateSubscription(id, { isActive });
  },

  markAsPaid: async (id: string, note?: string) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error("User belum login");

    await markLocalSubscriptionAsPaid(userId, id, note);
    // Refresh subscription list to get updated nextPaymentDate
    await get().fetchSubscriptions();
    await get().fetchSummary();
    scheduleWidgetSync(); // Real-time widget update
  },

  fetchPaymentHistory: async (id: string) => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        set({ paymentHistory: [] });
        return;
      }

      const paymentHistory = await getLocalPaymentHistory(userId, id);
      set({ paymentHistory });
    } catch {
      set({ paymentHistory: [] });
    }
  },

  refresh: async () => {
    set({ isRefreshing: true });
    try {
      await get().fetchSubscriptions();
      await get().fetchSummary();
    } finally {
      set({ isRefreshing: false });
    }
  },
}));
