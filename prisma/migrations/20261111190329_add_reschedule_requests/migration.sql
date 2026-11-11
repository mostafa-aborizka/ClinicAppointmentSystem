-- CreateEnum
CREATE TYPE "RescheduleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "RescheduleRequest" (
    "id" SERIAL NOT NULL,
    "appointmentId" INTEGER NOT NULL,
    "requestedStartTime" TIMESTAMP(3) NOT NULL,
    "requestedEndTime" TIMESTAMP(3) NOT NULL,
    "status" "RescheduleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" INTEGER,

    CONSTRAINT "RescheduleRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RescheduleRequest_one_pending_per_appointment"
ON "RescheduleRequest" ("appointmentId")
WHERE "status" = 'PENDING';
-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
