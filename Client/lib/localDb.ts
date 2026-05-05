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

type Database = ReturnType<typeof SQLite.openDatabaseSync>;

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
let dbQueue: Promise<void> = Promise.resolve();
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

const isNativeDbError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /NativeDatabase|NativeStatement|execAsync|finalizeAsync|SQLITE_BUSY|database is locked|database is busy/i.test(message);
};

const toLocalDbError = (error: unknown) => {
  if (isNativeDbError(error)) {
    return new Error("Database lokal lagi sibuk. Coba simpan ulang beberapa detik lagi.");
  }

  return error instanceof Error ? error : new Error("Terjadi kesalahan database lokal");
};

const sqlValue = (value: string | number | null) => {
  if (value === null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${value.replace(/'/g, "''")}'`;
};

const execSql = async (db: Database, sql: string) => {
  db.execSync(sql);
};

const initDatabase = async () => {
  const db = SQLite.openDatabaseSync(DATABASE_NAME);

  db.execSync("PRAGMA journal_mode = WAL;");
  db.execSync("PRAGMA foreign_keys = ON;");
  db.execSync(`
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
  `);
  db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_payment_logs_subscription_id ON payment_logs(subscription_id);
  `);

  return db;
};

export const getDb = async () => {
  if (!dbPromise) {
    dbPromise = initDatabase().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
};

export const withLocalDb = async <T>(
  operation: (db: Database) => T | Promise<T>,
): Promise<T> => {
  const run = async () => operation(await getDb());
  const queued = dbQueue.then(run, run);

  dbQueue = queued.then(
    () => undefined,
    () => undefined,
  );

  try {
    return await queued;
  } catch (error) {
    throw toLocalDbError(error);
  }
};

export const registerLocalUser = async (
  name: string,
  email: string,
  password: string,
): Promise<User> => {
  const normalizedEmail = normalizeEmail(email);
  const id = makeId("usr");
  const salt = randomSalt();
  const passwordHash = await hashPassword(password, salt);
  const timestamp = nowIso();

  return withLocalDb(async (db) => {
    const existing = await db.getFirstSync<UserRow>(
      "SELECT * FROM users WHERE email = ?",
      normalizedEmail,
    );

    if (existing) {
      throw new Error("Email sudah terdaftar di perangkat ini");
    }

    await execSql(
      db,
      `INSERT INTO users (
        id, name, email, password_hash, password_salt, monthly_budget, created_at, updated_at
      ) VALUES (
        ${sqlValue(id)},
        ${sqlValue(name.trim())},
        ${sqlValue(normalizedEmail)},
        ${sqlValue(passwordHash)},
        ${sqlValue(salt)},
        NULL,
        ${sqlValue(timestamp)},
        ${sqlValue(timestamp)}
      );`,
    );

    return {
      id,
      name: name.trim(),
      email: normalizedEmail,
      monthlyBudget: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
};

export const loginLocalUser = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {
  const row = await withLocalDb((db) =>
    db.getFirstSync<UserRow>(
      "SELECT * FROM users WHERE email = ?",
      normalizeEmail(email),
    ),
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
  const normalizedName = name?.trim();
  const normalizedEmail = email ? normalizeEmail(email) : undefined;

  if (!normalizedName && !normalizedEmail) {
    throw new Error("Nama atau email wajib diisi");
  }

  return withLocalDb(async (db) => {
    if (normalizedEmail) {
      const duplicate = await db.getFirstSync<UserRow>(
        "SELECT * FROM users WHERE email = ? AND id != ?",
        [normalizedEmail, userId],
      );

      if (duplicate) {
        throw new Error("Email sudah digunakan akun lain di perangkat ini");
      }
    }

    const timestamp = nowIso();
    await execSql(
      db,
      `UPDATE users
       SET name = COALESCE(${sqlValue(normalizedName || null)}, name),
           email = COALESCE(${sqlValue(normalizedEmail || null)}, email),
           updated_at = ${sqlValue(timestamp)}
       WHERE id = ${sqlValue(userId)};`,
    );

    const updated = await db.getFirstSync<UserRow>(
      "SELECT * FROM users WHERE id = ?",
      userId,
    );
    if (!updated) throw new Error("User tidak ditemukan");

    return toUser(updated);
  });
};

export const changeLocalPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await withLocalDb((db) =>
    db.getFirstSync<UserRow>(
      "SELECT * FROM users WHERE id = ?",
      userId,
    ),
  );
  if (!user) throw new Error("User tidak ditemukan");

  const currentHash = await hashPassword(currentPassword, user.password_salt);
  if (currentHash !== user.password_hash) {
    throw new Error("Password lama salah");
  }

  const newSalt = randomSalt();
  const newHash = await hashPassword(newPassword, newSalt);
  await withLocalDb((db) =>
    execSql(
      db,
      `UPDATE users
       SET password_hash = ${sqlValue(newHash)},
           password_salt = ${sqlValue(newSalt)},
           updated_at = ${sqlValue(nowIso())}
       WHERE id = ${sqlValue(userId)};`,
    ),
  );
};

export const setLocalBudget = async (userId: string, amount: number | null) =>
  withLocalDb(async (db) => {
    await execSql(
      db,
      `UPDATE users
       SET monthly_budget = ${sqlValue(amount)},
           updated_at = ${sqlValue(nowIso())}
       WHERE id = ${sqlValue(userId)};`,
    );

    const updated = await db.getFirstSync<UserRow>(
      "SELECT * FROM users WHERE id = ?",
      userId,
    );
    if (!updated) throw new Error("User tidak ditemukan");

    return toUser(updated);
  });

export const getLocalSubscriptions = async (userId: string) =>
  withLocalDb(async (db) => {
    const rows = await db.getAllSync<SubscriptionRow>(
      "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC",
      userId,
    );
    return rows.map(toSubscription);
  });

export const getLocalSummary = async (
  userId: string,
): Promise<SubscriptionSummary> =>
  withLocalDb(async (db) => {
    const rows = await db.getAllSync<SubscriptionRow>(
      "SELECT * FROM subscriptions WHERE user_id = ?",
      userId,
    );
    const user = await db.getFirstSync<UserRow>(
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
  });

export const createLocalSubscription = async (
  userId: string,
  payload: CreateSubscriptionPayload,
) => {
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

  await withLocalDb((db) =>
    execSql(
      db,
      `INSERT INTO subscriptions (
        id, name, price, billing_cycle, category, start_date, next_payment_date,
        is_active, currency, user_id, created_at, updated_at
      ) VALUES (
        ${sqlValue(subscription.id)},
        ${sqlValue(subscription.name)},
        ${sqlValue(subscription.price)},
        ${sqlValue(subscription.billingCycle)},
        ${sqlValue(subscription.category)},
        ${sqlValue(subscription.startDate)},
        ${sqlValue(subscription.nextPaymentDate)},
        ${sqlValue(subscription.isActive ? 1 : 0)},
        ${sqlValue(subscription.currency)},
        ${sqlValue(subscription.userId)},
        ${sqlValue(subscription.createdAt)},
        ${sqlValue(subscription.updatedAt)}
      );`,
    ),
  );

  return subscription;
};

export const updateLocalSubscription = async (
  userId: string,
  id: string,
  payload: UpdateSubscriptionPayload,
) =>
  withLocalDb(async (db) => {
    const existing = await db.getFirstSync<SubscriptionRow>(
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

    await execSql(
      db,
      `UPDATE subscriptions
       SET name = ${sqlValue(updated.name)},
           price = ${sqlValue(updated.price)},
           billing_cycle = ${sqlValue(updated.billingCycle)},
           category = ${sqlValue(updated.category)},
           start_date = ${sqlValue(updated.startDate)},
           next_payment_date = ${sqlValue(updated.nextPaymentDate)},
           is_active = ${sqlValue(updated.isActive ? 1 : 0)},
           currency = ${sqlValue(updated.currency)},
           updated_at = ${sqlValue(updated.updatedAt)}
       WHERE id = ${sqlValue(id)} AND user_id = ${sqlValue(userId)};`,
    );

    return updated;
  });

export const deleteLocalSubscription = async (userId: string, id: string) =>
  withLocalDb((db) =>
    execSql(
      db,
      `DELETE FROM subscriptions
       WHERE id = ${sqlValue(id)} AND user_id = ${sqlValue(userId)};`,
    ),
  );

export const markLocalSubscriptionAsPaid = async (
  userId: string,
  id: string,
  note?: string,
) =>
  withLocalDb(async (db) => {
    const row = await db.getFirstSync<SubscriptionRow>(
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
    await execSql(
      db,
      `INSERT INTO payment_logs (id, amount, paid_at, note, subscription_id)
       VALUES (
         ${sqlValue(payment.id)},
         ${sqlValue(payment.amount)},
         ${sqlValue(payment.paidAt)},
         ${sqlValue(payment.note)},
         ${sqlValue(payment.subscriptionId)}
       );`,
    );
    await execSql(
      db,
      `UPDATE subscriptions
       SET next_payment_date = ${sqlValue(nextDate.toISOString())},
           updated_at = ${sqlValue(updatedAt)}
       WHERE id = ${sqlValue(id)} AND user_id = ${sqlValue(userId)};`,
    );

    return payment;
  });

export const getLocalPaymentHistory = async (
  userId: string,
  subscriptionId: string,
) =>
  withLocalDb(async (db) => {
    const subscription = await db.getFirstSync<SubscriptionRow>(
      "SELECT * FROM subscriptions WHERE id = ? AND user_id = ?",
      [subscriptionId, userId],
    );
    if (!subscription) return [];

    const rows = await db.getAllSync<PaymentRow>(
      "SELECT * FROM payment_logs WHERE subscription_id = ? ORDER BY paid_at DESC",
      subscriptionId,
    );

    return rows.map(toPayment);
  });

export const exportLocalDatabase = async () =>
  withLocalDb(async (db) => {
    db.execSync("PRAGMA wal_checkpoint(TRUNCATE);");

    const bytes = db.serializeSync();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = new File(Paths.cache, `Langganinaja-${timestamp}.db`);
    file.create({ overwrite: true, intermediates: true });
    file.write(bytes);

    return file.uri;
  });
