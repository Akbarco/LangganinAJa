import { create } from "zustand";
import { storage } from "@/lib/storage";
import { User } from "@/types";
import {
  changeLocalPassword,
  getDb,
  loginLocalUser,
  registerLocalUser,
  setLocalBudget,
  updateLocalProfile,
} from "@/lib/localDb";
import { scheduleWidgetSync } from "@/lib/widgetSync";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isReady: boolean;
  appPin: string | null;
  isAppLockEnabled: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAppPin: (pin: string | null) => Promise<void>;
  toggleAppLock: (enabled: boolean) => Promise<void>;
  updateProfile: (name?: string, email?: string) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  setBudget: (amount: number | null) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isReady: false,
  appPin: null,
  isAppLockEnabled: false,

  initialize: async () => {
    try {
      await getDb();
      const token = await storage.getItem("token");
      const userStr = await storage.getItem("user");
      const pin = await storage.getItem("appPin");
      const isLockEnabled = await storage.getItem("isAppLockEnabled");

      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        set({
          token,
          user,
          appPin: pin || null,
          isAppLockEnabled: isLockEnabled === "true",
          isReady: true,
        });
      } else {
        set({ isReady: true });
      }
    } catch {
      set({ isReady: true });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { user, token } = await loginLocalUser(email, password);

      await storage.setItem("token", token);
      await storage.setItem("user", JSON.stringify(user));

      set({ user, token, isLoading: false });
      scheduleWidgetSync(); // Widget update: "Login dulu" → data real
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true });
    try {
      await registerLocalUser(name, email, password);
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await storage.deleteItem("token");
    await storage.deleteItem("user");
    await storage.deleteItem("appPin");
    await storage.deleteItem("isAppLockEnabled");
    set({ user: null, token: null, appPin: null, isAppLockEnabled: false });
    scheduleWidgetSync(); // Widget update: data → "Login dulu"
  },

  setAppPin: async (pin: string | null) => {
    if (pin) {
      await storage.setItem("appPin", pin);
    } else {
      await storage.deleteItem("appPin");
    }
    set({ appPin: pin });
  },

  toggleAppLock: async (enabled: boolean) => {
    await storage.setItem("isAppLockEnabled", enabled ? "true" : "false");
    set({ isAppLockEnabled: enabled });
  },

  updateProfile: async (name?: string, email?: string) => {
    const user = get().user;
    if (!user) throw new Error("User belum login");
    const updated = await updateLocalProfile(user.id, name, email);
    await storage.setItem("user", JSON.stringify(updated));
    set({ user: updated });
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const user = get().user;
    if (!user) throw new Error("User belum login");
    await changeLocalPassword(user.id, currentPassword, newPassword);
  },

  setBudget: async (amount: number | null) => {
    const user = get().user;
    if (!user) throw new Error("User belum login");
    const updated = await setLocalBudget(user.id, amount);
    await storage.setItem("user", JSON.stringify(updated));
    set({ user: updated });
    scheduleWidgetSync(); // Widget update: budget progress bar
  },
}));
