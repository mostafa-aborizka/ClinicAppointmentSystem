import express from "express";
import prisma from "./config/prisma.js";
import doctorsRoute from "./routes/doctors.js";
import schedulesRoute from "./routes/schedules.js";
import slotsRoute from "./routes/slots.js";
import authRoute from "./routes/auth.js";
import appointmentsRoute from "./routes/appointments.js";
import authMiddleware from "./middleware/authMiddleware.js";
import authorize from "./middleware/authorize.js";
import rescheduleRequestsRoute from "./routes/rescheduleRequests.js";
const app = express();

app.use(express.json());
app.use("/api/doctors", doctorsRoute, schedulesRoute, slotsRoute);
app.use("/api/auth", authRoute);
app.use(
  "/api/reschedule-requests",
  authMiddleware,
  authorize("DOCTOR", "RECEPTIONIST"),
  rescheduleRequestsRoute,
);
app.use(
  "/api/appointments",
  authMiddleware,
  authorize("PATIENT"),
  appointmentsRoute,
);

export default app;
