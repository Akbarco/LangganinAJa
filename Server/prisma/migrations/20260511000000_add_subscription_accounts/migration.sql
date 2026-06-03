-- CreateEnum
CREATE TYPE "SubscriptionAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "accountLimit" INTEGER;

-- CreateTable
CREATE TABLE "SubscriptionAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "holderName" TEXT,
    "status" "SubscriptionAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "subscriptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionAccount_subscriptionId_idx" ON "SubscriptionAccount"("subscriptionId");

-- AddForeignKey
ALTER TABLE "SubscriptionAccount" ADD CONSTRAINT "SubscriptionAccount_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
