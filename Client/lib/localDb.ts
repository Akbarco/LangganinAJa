import * as Crypto from "expo-crypto";
import { File, Paths } from "expo-file-system";
import * as SQLite from "expo-sqlite";

import {
  BillingType,
  CategoryType,
  CreateSubscriptionPayload,
  LoginResponse,
  PaymentLog,
  Subscription,
  SubscriptionSummary,
  UpdateSubscriptionPayload,
  User,
} from "@/types";

type Database = Awaited<ReturnType<typeof SQLite.openDatabaseAsync>>;

type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  monthly_budget: number | null;
  created_at: string;
  updated_at: string;
};

type SubscriptionRow = {
  id: string;
  name: string;
  price: number;
  billing_cycle: BillingType;
  category: CategoryType;
  start_date: string;
  next_payment_date: string;
  is_active: number;
  currency: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  paid_at: string;
  note: string | null;
  subscription_id: string;
};

let dbPromise: Promise<Database> | null = null;
export const DATABASE_NAME = "langganinaja.db";

const nowIso = () => new Date().toISOString();

const makeId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const randomSalt = () =>
  Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0"),
  ).join("");

const hashPassword = async (password: string, salt: string) =>
  Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );

const toUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  monthlyBudget: row.monthly_budget,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toSubscription = (row: SubscriptionRow): Subscription => ({
  id: row.id,
  name: row.name,
  price: row.price,
  billingCycle: row.billing_cycle,
  category: row.category,
  startDate: row.start_date,
  nextPaymentDate: row.next_payment_date,
  isActive: row.is_active === 1,
  currency: row.currency,
  userId: row.user_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toPayment = (row: PaymentRow): PaymentLog => ({
  id: row.id,
  amount: row.amount,
  paidAt: row.paid_at,
  note: row.note,
  subscriptionId: row.subscription_id,
});

export const getDb = async () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  const db = await dbPromise;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      monthly_budget INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('MONTHLY', 'YEARLY')),
      category TEXT NOT NULL DEFAULT 'OTHER',
      start_date TEXT NOT NULL,
      next_payment_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      currency TEXT NOT NULL DEFAULT 'IDR',
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_logs (
      id TEXT PRIMARY KEY NOT NULL,
      amount INTEGER NOT NULL,
      paid_at TEXT NOT NULL,
      note TEXT,
      subscription_id TEXT NOT NULL,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_payment_logs_subscription_id ON payment_logs(subscription_id);
  `);

  return db;
};

export const registerLocalUser = async (
  name: string,
  email: string,
  password: string,
): Promise<User> => {
  const db = await getDb();
  const normalizedEmail = normalizeEmail(email);
  const existing = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE email = ?",
    normalizedEmail,
  );

  if (existing) {
    throw new Error("Email sudah terdaftar di perangkat ini");
  }

  const id = makeId("usr");
  const salt = randomSalt();
  const passwordHash = await hashPassword(password, salt);
  const timestamp = nowIso();

  await db.runAsync(
    `INSERT INTO users (
      id, name, email, password_hash, password_salt, monthly_budget, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name.trim(),
      normalizedEmail,
      passwordHash,
      salt,
      null,
      timestamp,
      timestamp,
    ],
  );

  return {
    id,
    name: name.trim(),
    email: normalizedEmail,
    monthlyBudget: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const loginLocalUser = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {
  const db = await getDb();
  const row = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE email = ?",
    normalizeEmail(email),
  );

  if (!row) {
    throw new Error("Akun belum ada di perangkat ini");
  }

  const incomingHash = await hashPassword(password, row.password_salt);
  if (incomingHash !== row.password_hash) {
    throw new Error("Password salah");
  }

  return {
    user: toUser(row),
    token: `local-session-${row.id}`,
  };
};

export const updateLocalProfile = async (
  userId: string,
  name?: string,
  email?: string,
) => {
  const db = await getDb();
  const normalizedName = name?.trim();
  const normalizedEmail = email ? normalizeEmail(email) : undefined;

  if (!normalizedName && !normalizedEmail) {
    throw new Error("Nama atau email wajib diisi");
  }

  if (normalizedEmail) {
    const duplicate = await db.getFirstAsync<UserRow>(
      "SELECT * FROM users WHERE email = ? AND id != ?",
      [normalizedEmail, userId],
    );

    if (duplicate) {
      throw new Error("Email sudah digunakan akun lain di perangkat ini");
    }
  }

  const timestamp = nowIso();
  await db.runAsync(
    `UPDATE users
     SET name = COALESCE(?, name),
         email = COALESCE(?, email),
         updated_at = ?
     WHERE id = ?`,
    [normalizedName || null, normalizedEmail || null, timestamp, userId],
  );

  const updated = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE id = ?",
    userId,
  );
  if (!updated) throw new Error("User tidak ditemukan");

  return toUser(updated);
};

export const changeLocalPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  const db = await getDb();
  const user = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE id = ?",
    userId,
  );
  if (!user) throw new Error("User tidak ditemukan");

  const currentHash = await hashPassword(currentPassword, user.password_salt);
  if (currentHash !== user.password_hash) {
    throw new Error("Password lama salah");
  }

  const newSalt = randomSalt();
  const newHash = await hashPassword(newPassword, newSalt);
  await db.runAsync(
    "UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?",
    [newHash, newSalt, nowIso(), userId],
  );
};

export const setLocalBudget = async (userId: string, amount: number | null) => {
  const db = await getDb();
  await db.runAsync(
    "UPDATE users SET monthly_budget = ?, updated_at = ? WHERE id = ?",
    [amount, nowIso(), userId],
  );

  const updated = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE id = ?",
    userId,
  );
  if (!updated) throw new Error("User tidak ditemukan");

  return toUser(updated);
};

export const getLocalSubscriptions = async (userId: string) => {
  const db = await getDb();
  const rows = await db.getAllAsync<SubscriptionRow>(
    "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC",
    userId,
  );
  return rows.map(toSubscription);
};

export const getLocalSummary = async (
  userId: string,
): Promise<SubscriptionSummary> => {
  const db = await getDb();
  const rows = await db.getAllAsync<SubscriptionRow>(
    "SELECT * FROM subscriptions WHERE user_id = ?",
    userId,
  );
  const user = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE id = ?",
    userId,
  );

  const subscriptions = rows.map(toSubscription);
  const active = subscriptions.filter((item) => item.isActive);
  const monthlyTotal = active.reduce((total, item) => {
    return total + (item.billingCycle === "MONTHLY" ? item.price : Math.round(item.price / 12));
  }, 0);

  return {
    totalSubscriptions: subscriptions.length,
    activeCount: active.length,
    inactiveCount: subscriptions.length - active.length,
    monthlyTotal,
    yearlyTotal: monthlyTotal * 12,
    currency: "IDR",
    monthlyBudget: user?.monthly_budget ?? null,
  };
};

export const createLocalSubscription = async (
  userId: string,
  payload: CreateSubscriptionPayload,
) => {
  const db = await getDb();
  const id = makeId("sub");
  const timestamp = nowIso();
  const subscription: Subscription = {
    id,
    name: payload.name.trim(),
    price: Math.round(Number(payload.price)),
    billingCycle: payload.billingCycle,
    category: payload.category || "OTHER",
    startDate: payload.startDate,
    nextPaymentDate: payload.nextPaymentDate,
    isActive: true,
    currency: payload.currency?.trim().toUpperCase() || "IDR",
    userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.runAsync(
    `INSERT INTO subscriptions (
      id, name, price, billing_cycle, category, start_date, next_payment_date,
      is_active, currency, user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      subscription.id,
      subscription.name,
      subscription.price,
      subscription.billingCycle,
      subscription.category,
      subscription.startDate,
      subscription.nextPaymentDate,
      subscription.isActive ? 1 : 0,
      subscription.currency,
      subscription.userId,
      subscription.createdAt,
      subscription.updatedAt,
    ],
  );

  return subscription;
};

export const updateLocalSubscription = async (
  userId: string,
  id: string,
  payload: UpdateSubscriptionPayload,
) => {
  const db = await getDb();
  const existing = await db.getFirstAsync<SubscriptionRow>(
    "SELECT * FROM subscriptions WHERE id = ? AND user_id = ?",
    [id, userId],
  );

  if (!existing) throw new Error("Langganan tidak ditemukan");

  const current = toSubscription(existing);
  const updated: Subscription = {
    ...current,
    ...payload,
    name: payload.name !== undefined ? payload.name.trim() : current.name,
    price: payload.price !== undefined ? Math.round(Number(payload.price)) : current.price,
    currency:
      payload.currency !== undefined
        ? payload.currency.trim().toUpperCase() || "IDR"
        : current.currency,
    updatedAt: nowIso(),
  };

  await db.runAsync(
    `UPDATE subscriptions
     SET name = ?, price = ?, billing_cycle = ?, category = ?, start_date = ?,
         next_payment_date = ?, is_active = ?, currency = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [
      updated.name,
      updated.price,
      updated.billingCycle,
      updated.category,
      updated.startDate,
      updated.nextPaymentDate,
      updated.isActive ? 1 : 0,
      updated.currency,
      updated.updatedAt,
      id,
      userId,
    ],
  );

  return updated;
};

export const deleteLocalSubscription = async (userId: string, id: string) => {
  const db = await getDb();
  await db.runAsync(
    "DELETE FROM subscriptions WHERE id = ? AND user_id = ?",
    [id, userId],
  );
};

export const markLocalSubscriptionAsPaid = async (
  userId: string,
  id: string,
  note?: string,
) => {
  const db = await getDb();
  const row = await db.getFirstAsync<SubscriptionRow>(
    "SELECT * FROM subscriptions WHERE id = ? AND user_id = ?",
    [id, userId],
  );
  if (!row) throw new Error("Langganan tidak ditemukan");

  const subscription = toSubscription(row);
  const payment: PaymentLog = {
    id: makeId("pay"),
    amount: subscription.price,
    paidAt: nowIso(),
    note: note || null,
    subscriptionId: subscription.id,
  };
  const nextDate = new Date(subscription.nextPaymentDate);

  if (subscription.billingCycle === "MONTHLY") {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }

  const updatedAt = nowIso();
  await db.runAsync(
    "INSERT INTO payment_logs (id, amount, paid_at, note, subscription_id) VALUES (?, ?, ?, ?, ?)",
    [payment.id, payment.amount, payment.paidAt, payment.note, payment.subscriptionId],
  );
  await db.runAsync(
    "UPDATE subscriptions SET next_payment_date = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    [nextDate.toISOString(), updatedAt, id, userId],
  );

  return payment;
};

export const getLocalPaymentHistory = async (
  userId: string,
  subscriptionId: string,
) => {
  const db = await getDb();
  const subscription = await db.getFirstAsync<SubscriptionRow>(
    "SELECT * FROM subscriptions WHERE id = ? AND user_id = ?",
    [subscriptionId, userId],
  );
  if (!subscription) return [];

  const rows = await db.getAllAsync<PaymentRow>(
    "SELECT * FROM payment_logs WHERE subscription_id = ? ORDER BY paid_at DESC",
    subscriptionId,
  );

  return rows.map(toPayment);
};

export const exportLocalDatabase = async () => {
  const db = await getDb();
  await db.execAsync("PRAGMA wal_checkpoint(TRUNCATE);");

  const bytes = await db.serializeAsync();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = new File(Paths.cache, `Langganinaja-${timestamp}.db`);
  file.create({ overwrite: true, intermediates: true });
  file.write(bytes);

  return file.uri;
};
