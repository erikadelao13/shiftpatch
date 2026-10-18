-- CreateEnum
CREATE TYPE "ShiftRole" AS ENUM ('RN', 'LPN');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('open', 'filled');

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "role" "ShiftRole" NOT NULL,
    "date" DATE NOT NULL,
    "startTime" CHAR(5) NOT NULL,
    "endTime" CHAR(5) NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'open',
    "claimedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shift_agencyId_date_startTime_idx" ON "Shift"("agencyId", "date", "startTime");

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- An open shift has no nurse; a filled shift has exactly one.
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_status_claimedById_check"
    CHECK (("status" = 'open') = ("claimedById" IS NULL));

ALTER TABLE "Shift" ADD CONSTRAINT "Shift_times_check"
    CHECK (
        "startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        AND "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        AND "startTime" <> "endTime"
    );
