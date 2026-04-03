import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { successResponse } from "../utils/response.js";
import { AppError } from "../utils/AppError.js";
import cookieOptions from "../utils/cookieOption.js";

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError("Name, email, and password are required", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new AppError("User already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    const { password: _, ...safeUser } = user;

    return successResponse(res, "User registered successfully", safeUser, 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      throw new AppError("User not found", 404);
    }
    const match = await bcrypt.compare(password, existingUser.password);
    
    
    if (!match) {
      throw new AppError("Invalid password", 401);
    }

  

    const token = jwt.sign({ id: existingUser.id }, process.env.JWT_SECRET, {
      expiresIn: "2d",
    });
    res.cookie("jwt", token, cookieOptions(req));

    const { password: _, ...safeUser } = existingUser;

    return successResponse(res, "Login successful", { user: safeUser, token }, 200);
  } catch (error) {
    next(error);
  }
};



export const logout = async (req, res) => {
  res.clearCookie("jwt", {
    ...cookieOptions(req),
    maxAge: undefined,
  });
  return successResponse(res, "Logout successful");
};
