-- CreateEnum
CREATE TYPE "Category" AS ENUM ('ENTERTAINMENT', 'UTILITY', 'FINANCE', 'EDUCATION', 'GAMING', 'OTHER');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "category" "Category" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "monthlyBudget" INTEGER;

-- CreateTable
CREATE TABLE "PaymentLog" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "subscriptionId" TEXT NOT NULL,

    CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentLog_subscriptionId_idx" ON "PaymentLog"("subscriptionId");

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
