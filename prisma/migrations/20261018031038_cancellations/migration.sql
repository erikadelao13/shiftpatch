-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('advance', 'no_show');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'shift_cancelled';

-- CreateTable
CREATE TABLE "Cancellation" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "reason" "CancellationReason" NOT NULL,
    "previousNurseId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cancellation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cancellation_shiftId_createdAt_idx" ON "Cancellation"("shiftId", "createdAt");

-- AddForeignKey
ALTER TABLE "Cancellation" ADD CONSTRAINT "Cancellation_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cancellation" ADD CONSTRAINT "Cancellation_previousNurseId_fkey" FOREIGN KEY ("previousNurseId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cancellation" ADD CONSTRAINT "Cancellation_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
