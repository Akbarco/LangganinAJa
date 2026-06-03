import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  email: z
    .string()
    .email("Email tidak valid")
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Email tidak valid")
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(1, "Password wajib diisi"),
});

export const subscriptionSchema = z.object({
  name: z.string().min(1, "Nama langganan wajib diisi"),
  price: z
    .number({ error: "Harga harus berupa angka" })
    .min(1, "Harga minimal 1"),
  billingCycle: z.enum(["MONTHLY", "YEARLY"] as const, {
    error: "Pilih siklus tagihan",
  }),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  nextPaymentDate: z.string().min(1, "Tanggal pembayaran berikutnya wajib diisi"),
  currency: z.string().default("IDR"),
  accountLimit: z
    .number({ error: "Jumlah akun harus berupa angka" })
    .int("Jumlah akun harus bilangan bulat")
    .min(1, "Jumlah akun minimal 1")
    .nullable()
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
