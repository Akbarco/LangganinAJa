import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import { successResponse } from "../utils/response.js";

// POST /api/subscriptions/:id/pay — Tandai sudah bayar
export const markAsPaid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { note } = req.body;

    const subscription = await prisma.subscription.findUnique({ where: { id } });

    if (!subscription) throw new AppError("Subscription not found", 404);
    if (subscription.userId !== userId) throw new AppError("Unauthorized", 403);

    // 1. Catat pembayaran
    const payment = await prisma.paymentLog.create({
      data: {
        amount: subscription.price,
        note: note || null,
        subscriptionId: id,
      },
    });

    // 2. Geser nextPaymentDate ke periode berikutnya
    const nextDate = new Date(subscription.nextPaymentDate);
    if (subscription.billingCycle === "MONTHLY") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }

    await prisma.subscription.update({
      where: { id },
      data: { nextPaymentDate: nextDate },
    });

    return successResponse(res, "Payment recorded", payment, 201);
  } catch (error) {
    next(error);
  }
};

// GET /api/subscriptions/:id/payments — Ambil riwayat pembayaran
export const getPaymentHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const subscription = await prisma.subscription.findUnique({ where: { id } });

    if (!subscription) throw new AppError("Subscription not found", 404);
    if (subscription.userId !== userId) throw new AppError("Unauthorized", 403);

    const payments = await prisma.paymentLog.findMany({
      where: { subscriptionId: id },
      orderBy: { paidAt: "desc" },
    });

    return successResponse(res, "Payment history fetched", payments);
  } catch (error) {
    next(error);
  }
};
