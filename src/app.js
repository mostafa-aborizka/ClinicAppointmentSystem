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
import doctorAppointmentsRoute from "./routes/doctorAppointments.js";
import receptionistAppointmentsRoute from "./routes/receptionistAppointments.js";
import checkInRoute from "./routes/checkIn.js";
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
const appointmentApi = express.Router();
appointmentApi.use(authMiddleware);
appointmentApi.use(appointmentsRoute);
appointmentApi.use(checkInRoute);
app.use("/api/appointments", appointmentApi);

app.use(
  "/api/doctors",
  authMiddleware,
  authorize("DOCTOR"),
  doctorAppointmentsRoute,
);
app.use(
  "/api/receptionist",
  authMiddleware,
  authorize("RECEPTIONIST"),
  receptionistAppointmentsRoute,
);

export default app;
