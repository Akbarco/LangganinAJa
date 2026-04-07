import { create } from "zustand";
import { storage } from "@/lib/storage";
import { User, ApiResponse, LoginResponse } from "@/types";
import { API_URL } from "@/constants";

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
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ email, password }),
      });

      const data: ApiResponse<LoginResponse> = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Login gagal");
      }

      const { user, token } = data.data;

      await storage.setItem("token", token);
      await storage.setItem("user", JSON.stringify(user));

      set({ user, token, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ name, email, password }),
      });

      const data: ApiResponse<User> = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Registrasi gagal");
      }

      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      const token = get().token;
      // Call server logout
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {
      // Ignore errors — still clear local state
    }

    await storage.deleteItem("token");
    await storage.deleteItem("user");
    await storage.deleteItem("appPin");
    await storage.deleteItem("isAppLockEnabled");
    set({ user: null, token: null, appPin: null, isAppLockEnabled: false });
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
    const token = get().token;
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, email }),
    });
    const data: ApiResponse<User> = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Gagal update profil");
    }
    await storage.setItem("user", JSON.stringify(data.data));
    set({ user: data.data });
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const token = get().token;
    const res = await fetch(`${API_URL}/auth/change-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data: ApiResponse = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Gagal ganti password");
    }
  },

  setBudget: async (amount: number | null) => {
    const token = get().token;
    const res = await fetch(`${API_URL}/auth/budget`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ monthlyBudget: amount }),
    });
    const data: ApiResponse<User> = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Gagal set budget");
    }
    await storage.setItem("user", JSON.stringify(data.data));
    set({ user: data.data });
  },
}));
