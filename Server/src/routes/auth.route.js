import express from "express";
import { register, login, logout } from "../controllers/auth.controller.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";
import { validate } from "../middlewares/validate.middleware.js";

import authMiddleware from "../middlewares/verifyToken.js";
import { updateProfile, changePassword, setBudget } from "../controllers/profile.controller.js";

const authRoutes = express.Router();

authRoutes.post("/register", validate(registerSchema), register);
authRoutes.post("/login", validate(loginSchema), login);
authRoutes.post("/logout", logout);

// Protected routes
authRoutes.use(authMiddleware);
authRoutes.put("/profile", updateProfile);
authRoutes.put("/change-password", changePassword);
authRoutes.put("/budget", setBudget);

export default authRoutes;
