/**
 * widgetData.ts
 *
 * Data layer khusus untuk Android Home Screen Widget.
 * Widget task handler berjalan sebagai headless task, TIDAK bisa pakai
 * Zustand store atau React hooks. Semua data harus dibaca langsung dari
 * SQLite (expo-sqlite) dan SecureStore (expo-secure-store).
 */

import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { Appearance } from "react-native";

import { DATABASE_NAME } from "./localDb";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WidgetSummary {
  monthlyTotal: number;
  yearlyTotal: number;
  activeCount: number;
  inactiveCount: number;
  monthlyBudget: number | null;
  currency: string;
}

export interface UpcomingPayment {
  id: string;
  name: string;
  price: number;
  currency: string;
  nextPaymentDate: string;
  daysUntil: number;
}

export interface WidgetData {
  isLoggedIn: boolean;
  summary: WidgetSummary | null;
  upcoming: UpcomingPayment[];
  isDark: boolean;
}

// ─── Theme detection ──────────────────────────────────────────────────────────

/**
 * Detect whether the device is currently using dark mode.
 * Returns true if dark, false if light.
 */
export function getSystemIsDark(): boolean {
  return Appearance.getColorScheme() === "dark";
}

// ─── Theme color tokens for widget ────────────────────────────────────────────

export const WIDGET_COLORS = {
  light: {
    background: "#FFFFFF",
    surface: "#F5F6F8",
    primary: "#2563EB",
    primaryLight: "#DBEAFE",
    text: "#111827",
    textSecondary: "#4B5563",
    textMuted: "#9CA3AF",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
    border: "#E5E7EB",
    separator: "#D1D5DB",
  },
  dark: {
    background: "#1A1A2E",
    surface: "#252542",
    primary: "#6C5CE7",
    primaryLight: "#2D2D4A",
    text: "#FFFFFF",
    textSecondary: "#A0A0C0",
    textMuted: "#6B6B8D",
    success: "#00B894",
    warning: "#FDCB6E",
    danger: "#FF6B6B",
    border: "#2A2A45",
    separator: "#3A3A5C",
  },
} as const;

export type WidgetThemeColors = (typeof WIDGET_COLORS)["light"] | (typeof WIDGET_COLORS)["dark"];

export function getWidgetColors(isDark: boolean): WidgetThemeColors {
  return isDark ? WIDGET_COLORS.dark : WIDGET_COLORS.light;
}

// ─── Currency formatter (no Intl dep) ────────────────────────────────────────

export function formatWidgetCurrency(amount: number, currency: string = "IDR"): string {
  const safe = Math.round(amount ?? 0);
  if (currency === "IDR") {
    return `Rp ${safe.toLocaleString("id-ID")}`;
  }
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(safe);
  } catch {
    return `${currency} ${safe}`;
  }
}

// ─── Days-until helper ────────────────────────────────────────────────────────

export function calcDaysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysLabel(days: number): string {
  if (days < 0) return `Telat ${Math.abs(days)}h`;
  if (days === 0) return "Hari ini!";
  if (days === 1) return "Besok";
  return `${days} hari`;
}

export function urgencyColor(days: number, isDark: boolean): string {
  const c = getWidgetColors(isDark);
  if (days <= 1) return c.danger;
  if (days <= 7) return c.warning;
  return c.success;
}

// ─── Session: get logged-in userId ───────────────────────────────────────────

/**
 * Read the stored user JSON from SecureStore and extract the userId.
 * Returns null if the user is not logged in.
 */
export async function getWidgetUserId(): Promise<string | null> {
  try {
    const userStr = await SecureStore.getItemAsync("user");
    if (!userStr) return null;
    const user = JSON.parse(userStr) as { id: string };
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Data: summary ────────────────────────────────────────────────────────────

type UserRow = {
  monthly_budget: number | null;
};

type SubRow = {
  price: number;
  billing_cycle: "MONTHLY" | "YEARLY";
  is_active: number;
  currency: string;
};

/**
 * Query summary data for the widget directly from SQLite.
 */
export async function getWidgetSummary(userId: string): Promise<WidgetSummary> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  const userRow = await db.getFirstAsync<UserRow>(
    "SELECT monthly_budget FROM users WHERE id = ?",
    userId,
  );

  const subs = await db.getAllAsync<SubRow>(
    "SELECT price, billing_cycle, is_active, currency FROM subscriptions WHERE user_id = ?",
    userId,
  );

  const active = subs.filter((s) => s.is_active === 1);
  const monthlyTotal = active.reduce((sum, s) => {
    return sum + (s.billing_cycle === "MONTHLY" ? s.price : Math.round(s.price / 12));
  }, 0);

  return {
    monthlyTotal,
    yearlyTotal: monthlyTotal * 12,
    activeCount: active.length,
    inactiveCount: subs.length - active.length,
    monthlyBudget: userRow?.monthly_budget ?? null,
    currency: "IDR",
  };
}

// ─── Data: upcoming payments ─────────────────────────────────────────────────

type UpcomingRow = {
  id: string;
  name: string;
  price: number;
  currency: string;
  next_payment_date: string;
};

/**
 * Get the N upcoming active subscriptions sorted by next payment date.
 */
export async function getUpcomingPayments(
  userId: string,
  limit: number = 3,
): Promise<UpcomingPayment[]> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  const rows = await db.getAllAsync<UpcomingRow>(
    `SELECT id, name, price, currency, next_payment_date
     FROM subscriptions
     WHERE user_id = ? AND is_active = 1
     ORDER BY next_payment_date ASC
     LIMIT ?`,
    [userId, limit],
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    price: r.price,
    currency: r.currency,
    nextPaymentDate: r.next_payment_date,
    daysUntil: calcDaysUntil(r.next_payment_date),
  }));
}

// ─── Composite: load all widget data ─────────────────────────────────────────

/**
 * Load all data needed to render any widget variant.
 * This is the single entry point called by the task handler.
 */
export async function loadWidgetData(upcomingLimit: number = 3): Promise<WidgetData> {
  const isDark = getSystemIsDark();
  const userId = await getWidgetUserId();

  if (!userId) {
    return { isLoggedIn: false, summary: null, upcoming: [], isDark };
  }

  try {
    const [summary, upcoming] = await Promise.all([
      getWidgetSummary(userId),
      getUpcomingPayments(userId, upcomingLimit),
    ]);
    return { isLoggedIn: true, summary, upcoming, isDark };
  } catch {
    return { isLoggedIn: false, summary: null, upcoming: [], isDark };
  }
}
