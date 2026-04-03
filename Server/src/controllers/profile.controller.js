import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { AppError } from "../utils/AppError.js";
import { successResponse } from "../utils/response.js";

// PUT /api/auth/profile — Update nama & email
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const normalizedName =
      typeof req.body.name === "string" ? req.body.name.trim() : undefined;
    const normalizedEmail =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : undefined;

    if (!normalizedName && !normalizedEmail) {
      throw new AppError("Minimal satu field harus diisi", 400);
    }

    // Cek duplikasi email
    if (normalizedEmail) {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing && existing.id !== userId) {
        throw new AppError("Email sudah digunakan user lain", 409);
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(normalizedName && { name: normalizedName }),
        ...(normalizedEmail && { email: normalizedEmail }),
      },
    });

    const { password: _, ...safeUser } = updated;
    return successResponse(res, "Profile updated", safeUser);
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/change-password — Ganti password
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError("Password lama dan baru wajib diisi", 400);
    }

    if (newPassword.length < 6) {
      throw new AppError("Password baru minimal 6 karakter", 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw new AppError("Password lama salah", 401);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return successResponse(res, "Password berhasil diubah");
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/budget — Set budget bulanan
export const setBudget = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { monthlyBudget } = req.body;
    const normalizedBudget =
      monthlyBudget === undefined || monthlyBudget === null || monthlyBudget === ""
        ? null
        : Number(monthlyBudget);

    if (normalizedBudget !== null && (!Number.isFinite(normalizedBudget) || normalizedBudget < 0)) {
      throw new AppError("Budget harus berupa angka 0 atau lebih", 400);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { monthlyBudget: normalizedBudget },
    });

    const { password: _, ...safeUser } = updated;
    return successResponse(res, "Budget updated", safeUser);
  } catch (error) {
    next(error);
  }
};
