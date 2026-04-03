import { Router } from "express";
import authMiddleware from "../middlewares/verifyToken.js";
import {
  createSubscription,
  getSubscriptions,
  updateSubscription,
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
subscriptionRoutes.put("/:id", updateSubscription);
subscriptionRoutes.delete("/:id", deleteSubscription);

export default subscriptionRoutes;
