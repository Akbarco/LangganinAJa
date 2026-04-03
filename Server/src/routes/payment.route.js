import { Router } from "express";
import authMiddleware from "../middlewares/verifyToken.js";
import { markAsPaid, getPaymentHistory } from "../controllers/payment.controller.js";

const paymentRoutes = Router();

paymentRoutes.use(authMiddleware);

paymentRoutes.post("/:id/pay", markAsPaid);
paymentRoutes.get("/:id/payments", getPaymentHistory);

export default paymentRoutes;
