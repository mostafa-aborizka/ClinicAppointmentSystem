CREATE UNIQUE INDEX "Appointment_active_doctor_start_unique"
ON "Appointment" ("doctorId", "startTime")
WHERE "status" IN ('REQUESTED', 'CONFIRMED', 'CHECKED_IN');