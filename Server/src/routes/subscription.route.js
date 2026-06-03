import { Router } from "express";
import authMiddleware from "../middlewares/verifyToken.js";
import {
  createSubscription,
  createSubscriptionAccount,
  deleteSubscriptionAccount,
  getSubscriptions,
  getSubscriptionAccounts,
  updateSubscription,
  updateSubscriptionAccount,
  deleteSubscription,
  getSummary,
  getAnalytics,
} from "../controllers/subscription.controller.js";

const subscriptionRoutes = Router();

subscriptionRoutes.use(authMiddleware);

subscriptionRoutes.get("/summary", getSummary);
subscriptionRoutes.get("/analytics", getAnalytics);
subscriptionRoutes.get("/", getSubscriptions);
subscriptionRoutes.post("/", createSubscription);
subscriptionRoutes.get("/:id/accounts", getSubscriptionAccounts);
subscriptionRoutes.post("/:id/accounts", createSubscriptionAccount);
subscriptionRoutes.put("/:id/accounts/:accountId", updateSubscriptionAccount);
subscriptionRoutes.delete("/:id/accounts/:accountId", deleteSubscriptionAccount);
subscriptionRoutes.put("/:id", updateSubscription);
subscriptionRoutes.delete("/:id", deleteSubscription);

export default subscriptionRoutes;
