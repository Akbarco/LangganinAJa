import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { successResponse } from "../utils/response.js";

const BILLING_CYCLES = new Set(["MONTHLY", "YEARLY"]);
const CATEGORIES = new Set([
  "ENTERTAINMENT",
  "UTILITY",
  "FINANCE",
  "EDUCATION",
  "GAMING",
  "OTHER",
]);

const parseDateField = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${fieldName} is invalid`, 400);
  }

  return date;
};

const parseSubscriptionPayload = (payload, { partial = false } = {}) => {
  const data = {};

  if (!partial || payload.name !== undefined) {
    const name = payload.name?.trim();

    if (!name) {
      throw new AppError("Name is required", 400);
    }

    data.name = name;
  }

  if (!partial || payload.price !== undefined) {
    const price = Number(payload.price);

    if (!Number.isFinite(price) || price <= 0) {
      throw new AppError("Price must be a positive number", 400);
    }

    data.price = Math.round(price);
  }

  if (!partial || payload.billingCycle !== undefined) {
    if (!BILLING_CYCLES.has(payload.billingCycle)) {
      throw new AppError("Billing cycle is invalid", 400);
    }

    data.billingCycle = payload.billingCycle;
  }

  const startDate = parseDateField(payload.startDate, "Start date");
  if (startDate) {
    data.startDate = startDate;
  } else if (!partial) {
    throw new AppError("Start date is required", 400);
  }

  const nextPaymentDate = parseDateField(
    payload.nextPaymentDate,
    "Next payment date"
  );
  if (nextPaymentDate) {
    data.nextPaymentDate = nextPaymentDate;
  } else if (!partial) {
    throw new AppError("Next payment date is required", 400);
  }

  if (!partial || payload.currency !== undefined) {
    const currency = payload.currency?.trim().toUpperCase();
    data.currency = currency || "IDR";
  }

  if (!partial || payload.category !== undefined) {
    const category = payload.category || "OTHER";

    if (!CATEGORIES.has(category)) {
      throw new AppError("Category is invalid", 400);
    }

    data.category = category;
  }

  if (payload.isActive !== undefined) {
    data.isActive = Boolean(payload.isActive);
  }

  if (payload.accountLimit !== undefined) {
    if (payload.accountLimit === null || payload.accountLimit === "") {
      data.accountLimit = null;
    } else {
      const accountLimit = Number(payload.accountLimit);
      if (!Number.isInteger(accountLimit) || accountLimit <= 0) {
        throw new AppError("Account limit must be a positive integer", 400);
      }
      data.accountLimit = accountLimit;
    }
  }

  return data;
};

const ensureSubscriptionOwner = async (subscriptionId, userId) => {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) throw new AppError("Subscription not found", 404);
  if (subscription.userId !== userId) throw new AppError("Unauthorized", 403);

  return subscription;
};

const getAccountMultiplier = (subscription) => {
  const activeAccountCount =
    subscription.accounts?.filter((account) => account.status === "ACTIVE")
      .length ?? 0;
  return activeAccountCount > 0 ? activeAccountCount : 1;
};

const getMonthlySubscriptionCost = (subscription) => {
  const baseMonthly =
    subscription.billingCycle === "MONTHLY"
      ? subscription.price
      : Math.round(subscription.price / 12);
  return baseMonthly * getAccountMultiplier(subscription);
};

const normalizeGmail = (value) => {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!email) throw new AppError("Account Gmail email is required", 400);
  if (!/^[^\s@]+@gmail\.com$/.test(email)) {
    throw new AppError("Account email must use @gmail.com", 400);
  }
  return email;
};

const parseAccountPayload = (payload, { partial = false } = {}) => {
  const data = {};

  if (!partial || payload.name !== undefined) {
    const name = payload.name?.trim();
    if (!name) throw new AppError("Account name is required", 400);
    data.name = name;
  }

  if (!partial || payload.email !== undefined) {
    data.email = normalizeGmail(payload.email);
  }

  if (payload.holderName !== undefined) {
    data.holderName = payload.holderName?.trim() || null;
  }

  if (payload.notes !== undefined) {
    data.notes = payload.notes?.trim() || null;
  }

  if (payload.status !== undefined) {
    if (!["ACTIVE", "INACTIVE"].includes(payload.status)) {
      throw new AppError("Account status is invalid", 400);
    }
    data.status = payload.status;
  }

  return data;
};

// POST /api/subscriptions
export const createSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const subscriptionData = parseSubscriptionPayload(req.body);

    const subscription = await prisma.subscription.create({
      data: {
        ...subscriptionData,
        userId,
      },
    });

    return successResponse(res, "Subscription created", subscription, 201);
  } catch (error) {
    next(error);
  }
};

// GET /api/subscriptions
export const getSubscriptions = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(res, "Subscriptions fetched", subscriptions);
  } catch (error) {
    next(error);
  }
};

// GET /api/subscriptions/:id/accounts
export const getSubscriptionAccounts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await ensureSubscriptionOwner(id, userId);

    const accounts = await prisma.subscriptionAccount.findMany({
      where: { subscriptionId: id },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    });

    return successResponse(res, "Subscription accounts fetched", accounts);
  } catch (error) {
    next(error);
  }
};

// POST /api/subscriptions/:id/accounts
export const createSubscriptionAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const subscription = await ensureSubscriptionOwner(id, userId);
    if (subscription.accountLimit) {
      const accountCount = await prisma.subscriptionAccount.count({
        where: { subscriptionId: id },
      });
      if (accountCount >= subscription.accountLimit) {
        throw new AppError(
          `Account slot is full (${subscription.accountLimit}/${subscription.accountLimit})`,
          400
        );
      }
    }
    const accountData = parseAccountPayload(req.body);

    const account = await prisma.subscriptionAccount.create({
      data: {
        ...accountData,
        subscriptionId: id,
      },
    });

    return successResponse(res, "Subscription account created", account, 201);
  } catch (error) {
    next(error);
  }
};

// PUT /api/subscriptions/:id/accounts/:accountId
export const updateSubscriptionAccount = async (req, res, next) => {
  try {
    const { id, accountId } = req.params;
    const userId = req.user.id;

    await ensureSubscriptionOwner(id, userId);
    const accountData = parseAccountPayload(req.body, { partial: true });
    if (Object.keys(accountData).length === 0) {
      throw new AppError("No valid fields to update", 400);
    }

    const existing = await prisma.subscriptionAccount.findUnique({
      where: { id: accountId },
    });

    if (!existing || existing.subscriptionId !== id) {
      throw new AppError("Subscription account not found", 404);
    }

    const account = await prisma.subscriptionAccount.update({
      where: { id: accountId },
      data: accountData,
    });

    return successResponse(res, "Subscription account updated", account);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/subscriptions/:id/accounts/:accountId
export const deleteSubscriptionAccount = async (req, res, next) => {
  try {
    const { id, accountId } = req.params;
    const userId = req.user.id;

    await ensureSubscriptionOwner(id, userId);

    const existing = await prisma.subscriptionAccount.findUnique({
      where: { id: accountId },
    });

    if (!existing || existing.subscriptionId !== id) {
      throw new AppError("Subscription account not found", 404);
    }

    await prisma.subscriptionAccount.delete({ where: { id: accountId } });

    return successResponse(res, "Subscription account deleted", null);
  } catch (error) {
    next(error);
  }
};

// PUT /api/subscriptions/:id
export const updateSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const subscriptionData = parseSubscriptionPayload(req.body, {
      partial: true,
    });

    const existing = await prisma.subscription.findUnique({ where: { id } });

    if (!existing) throw new AppError("Subscription not found", 404);
    if (existing.userId !== userId) throw new AppError("Unauthorized", 403);
    if (Object.keys(subscriptionData).length === 0) {
      throw new AppError("No valid fields to update", 400);
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: subscriptionData,
    });

    return successResponse(res, "Subscription updated", updated);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/subscriptions/:id
export const deleteSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.subscription.findUnique({ where: { id } });

    if (!existing) throw new AppError("Subscription not found", 404);
    if (existing.userId !== userId) throw new AppError("Unauthorized", 403);

    await prisma.subscription.delete({ where: { id } });

    return successResponse(res, "Subscription deleted", null);
  } catch (error) {
    next(error);
  }
};


export const getSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const allSubscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: { accounts: true },
    });

    const activeSubscriptions = allSubscriptions.filter(s => s.isActive);
    const inactiveSubscriptions = allSubscriptions.filter(s => !s.isActive);

    const monthlyTotal = activeSubscriptions.reduce(
      (acc, sub) => acc + getMonthlySubscriptionCost(sub),
      0,
    );

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { monthlyBudget: true },
    });

    return successResponse(res, "Summary fetched", {
      totalSubscriptions: allSubscriptions.length,
      activeCount: activeSubscriptions.length,
      inactiveCount: inactiveSubscriptions.length,
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
      currency: "IDR",
      monthlyBudget: user?.monthlyBudget || null,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/subscriptions/analytics
export const getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const subscriptions = await prisma.subscription.findMany({
      where: { userId, isActive: true },
      include: { accounts: true },
    });

    const categoriesMap = {};

    subscriptions.forEach((sub) => {
      const cat = sub.category || "OTHER";
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = {
          count: 0,
          totalAmount: 0,
        };
      }
      categoriesMap[cat].count += 1;
      categoriesMap[cat].totalAmount += getMonthlySubscriptionCost(sub);
    });

    const breakdown = Object.entries(categoriesMap).map(([category, data]) => ({
      category,
      count: data.count,
      totalAmount: data.totalAmount,
    }));

    return successResponse(res, "Analytics fetched", breakdown);
  } catch (error) {
    next(error);
  }
};
