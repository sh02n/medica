/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `AdjustmentRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Batch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Medication` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StockMovement` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CSA', 'CSM');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('ACTIVITY', 'POSITIVE', 'TICKET_OPENED', 'TICKET_RESOLVED', 'COMPLAINT', 'OUTREACH_EMAIL', 'OUTREACH_CALL', 'UNSUBSCRIBE');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('CALL', 'EMAIL', 'OFFER_DISCOUNT', 'RESOLVE_TICKET', 'ESCALATE');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "ActionOutcome" AS ENUM ('IMPROVED', 'NO_RESPONSE', 'ISSUE_RESOLVED', 'NOT_IMPROVED');

-- DropForeignKey
ALTER TABLE "AdjustmentRequest" DROP CONSTRAINT "AdjustmentRequest_batchId_fkey";

-- DropForeignKey
ALTER TABLE "AdjustmentRequest" DROP CONSTRAINT "AdjustmentRequest_createdById_fkey";

-- DropForeignKey
ALTER TABLE "AdjustmentRequest" DROP CONSTRAINT "AdjustmentRequest_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- DropForeignKey
ALTER TABLE "Batch" DROP CONSTRAINT "Batch_medicationId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_batchId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_createdById_fkey";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'CSA',
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "AdjustmentRequest";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "Batch";

-- DropTable
DROP TABLE "Medication";

-- DropTable
DROP TABLE "StockMovement";

-- DropEnum
DROP TYPE "AdjustmentStatus";

-- DropEnum
DROP TYPE "MovementType";

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "segment" TEXT NOT NULL DEFAULT 'SMB',
    "tier" TEXT NOT NULL DEFAULT 'Standard',
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementEvent" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "type" "EventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "type" "ActionType" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "status" "ActionStatus" NOT NULL DEFAULT 'TODO',
    "notes" TEXT,
    "outcome" "ActionOutcome",
    "nextStep" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_ownerId_idx" ON "Customer"("ownerId");

-- CreateIndex
CREATE INDEX "Customer_segment_idx" ON "Customer"("segment");

-- CreateIndex
CREATE INDEX "EngagementEvent_customerId_occurredAt_idx" ON "EngagementEvent"("customerId", "occurredAt");

-- CreateIndex
CREATE INDEX "EngagementEvent_type_idx" ON "EngagementEvent"("type");

-- CreateIndex
CREATE INDEX "ActionItem_customerId_idx" ON "ActionItem"("customerId");

-- CreateIndex
CREATE INDEX "ActionItem_ownerId_idx" ON "ActionItem"("ownerId");

-- CreateIndex
CREATE INDEX "ActionItem_status_dueDate_idx" ON "ActionItem"("status", "dueDate");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementEvent" ADD CONSTRAINT "EngagementEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
