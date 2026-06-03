import { create } from "zustand";
import {
  Subscription,
  SubscriptionAccount,
  SubscriptionSummary,
  CreateSubscriptionAccountPayload,
  CreateSubscriptionPayload,
  UpdateSubscriptionAccountPayload,
  UpdateSubscriptionPayload,
  PaymentLog,
} from "@/types";
import {
  createLocalSubscriptionAccount,
  createLocalSubscription,
  deleteLocalSubscriptionAccount,
  deleteLocalSubscription,
  getLocalPaymentHistory,
  getLocalSubscriptionAccounts,
  getLocalSubscriptions,
  getLocalSummary,
  markLocalSubscriptionAsPaid,
  updateLocalSubscriptionAccount,
  updateLocalSubscription,
} from "@/lib/localDb";
import {
  scheduleSubscriptionReminders,
  cancelSubscriptionReminders,
} from "@/lib/notifications";
import { scheduleWidgetSync } from "@/lib/widgetSync";
import { useAuthStore } from "@/store/authStore";

async function syncReminderForSubscription(subscription: Subscription) {
  try {
    if (!subscription.isActive) {
      await cancelSubscriptionReminders(subscription.id);
      return;
    }

    await scheduleSubscriptionReminders({
      id: subscription.id,
      name: subscription.name,
      price: subscription.price,
      currency: subscription.currency || "IDR",
      nextPaymentDate: subscription.nextPaymentDate,
    });
  } catch (error) {
    console.log("Gagal sinkron notifikasi", error);
  }
}

async function syncRemindersForSubscriptions(subscriptions: Subscription[]) {
  for (const subscription of subscriptions) {
    await syncReminderForSubscription(subscription);
  }
}

interface SubscriptionState {
  subscriptions: Subscription[];
  accountsBySubscriptionId: Record<string, SubscriptionAccount[]>;
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
  fetchSubscriptionAccounts: (subscriptionId: string) => Promise<void>;
  createSubscriptionAccount: (
    subscriptionId: string,
    payload: CreateSubscriptionAccountPayload,
  ) => Promise<SubscriptionAccount>;
  updateSubscriptionAccount: (
    subscriptionId: string,
    accountId: string,
    payload: UpdateSubscriptionAccountPayload,
  ) => Promise<void>;
  deleteSubscriptionAccount: (subscriptionId: string, accountId: string) => Promise<void>;
  toggleSubscriptionAccount: (
    subscriptionId: string,
    accountId: string,
    status: SubscriptionAccount["status"],
  ) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  accountsBySubscriptionId: {},
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
      void syncRemindersForSubscriptions(subscriptions);
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

    await syncReminderForSubscription(subscription);

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

    await syncReminderForSubscription(subscription);

    await get().fetchSummary();
    scheduleWidgetSync(); // Real-time widget update
  },

  deleteSubscription: async (id: string) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error("User belum login");

    await deleteLocalSubscription(userId, id);
    set((state) => ({
      subscriptions: state.subscriptions.filter((s) => s.id !== id),
      accountsBySubscriptionId: Object.fromEntries(
        Object.entries(state.accountsBySubscriptionId).filter(([key]) => key !== id),
      ),
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

  fetchSubscriptionAccounts: async (subscriptionId: string) => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        set((state) => ({
          accountsBySubscriptionId: {
            ...state.accountsBySubscriptionId,
            [subscriptionId]: [],
          },
        }));
        return;
      }

      const accounts = await getLocalSubscriptionAccounts(userId, subscriptionId);
      set((state) => ({
        accountsBySubscriptionId: {
          ...state.accountsBySubscriptionId,
          [subscriptionId]: accounts,
        },
      }));
    } catch {
      set((state) => ({
        accountsBySubscriptionId: {
          ...state.accountsBySubscriptionId,
          [subscriptionId]: [],
        },
      }));
    }
  },

  createSubscriptionAccount: async (
    subscriptionId: string,
    payload: CreateSubscriptionAccountPayload,
  ) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error("User belum login");

    const account = await createLocalSubscriptionAccount(userId, subscriptionId, payload);
    set((state) => ({
      accountsBySubscriptionId: {
        ...state.accountsBySubscriptionId,
        [subscriptionId]: [
          ...(state.accountsBySubscriptionId[subscriptionId] || []),
          account,
        ],
      },
    }));
    await get().fetchSummary();
    scheduleWidgetSync();
    return account;
  },

  updateSubscriptionAccount: async (
    subscriptionId: string,
    accountId: string,
    payload: UpdateSubscriptionAccountPayload,
  ) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error("User belum login");

    const account = await updateLocalSubscriptionAccount(
      userId,
      subscriptionId,
      accountId,
      payload,
    );
    set((state) => ({
      accountsBySubscriptionId: {
        ...state.accountsBySubscriptionId,
        [subscriptionId]: (state.accountsBySubscriptionId[subscriptionId] || []).map((item) =>
          item.id === accountId ? account : item,
        ),
      },
    }));
    await get().fetchSummary();
    scheduleWidgetSync();
  },

  deleteSubscriptionAccount: async (subscriptionId: string, accountId: string) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error("User belum login");

    await deleteLocalSubscriptionAccount(userId, subscriptionId, accountId);
    set((state) => ({
      accountsBySubscriptionId: {
        ...state.accountsBySubscriptionId,
        [subscriptionId]: (state.accountsBySubscriptionId[subscriptionId] || []).filter(
          (item) => item.id !== accountId,
        ),
      },
    }));
    await get().fetchSummary();
    scheduleWidgetSync();
  },

  toggleSubscriptionAccount: async (
    subscriptionId: string,
    accountId: string,
    status: SubscriptionAccount["status"],
  ) => {
    await get().updateSubscriptionAccount(subscriptionId, accountId, { status });
  },

  refresh: async () => {
    set({ isRefreshing: true });
    try {
      await get().fetchSubscriptions();
      await get().fetchSummary();
      await Promise.all(
        get().subscriptions.map((subscription) =>
          get().fetchSubscriptionAccounts(subscription.id),
        ),
      );
    } finally {
      set({ isRefreshing: false });
    }
  },
}));
