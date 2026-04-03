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
    });

    const activeSubscriptions = allSubscriptions.filter(s => s.isActive);
    const inactiveSubscriptions = allSubscriptions.filter(s => !s.isActive);

    const monthlyTotal = activeSubscriptions.reduce((acc, sub) => {
      if (sub.billingCycle === "MONTHLY") return acc + sub.price;
      if (sub.billingCycle === "YEARLY") return acc + Math.round(sub.price / 12);
      return acc;
    }, 0);

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
      // Normalize to monthly cost
      if (sub.billingCycle === "MONTHLY") {
        categoriesMap[cat].totalAmount += sub.price;
      } else if (sub.billingCycle === "YEARLY") {
        categoriesMap[cat].totalAmount += Math.round(sub.price / 12);
      }
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
