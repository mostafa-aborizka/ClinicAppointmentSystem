import express from "express";
import prisma from "./config/prisma.js";
import doctorsRoute from "./routes/doctors.js";
import schedulesRoute from "./routes/schedules.js";
import slotsRoute from "./routes/slots.js";
import authRoute from "./routes/auth.js";
import appointmentsRoute from "./routes/appointments.js";
import authMiddleware from "./middleware/authMiddleware.js";
import authorize from "./middleware/authorize.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error);
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});
app.use("/api/doctors", doctorsRoute, schedulesRoute, slotsRoute);
app.use("/api/auth", authRoute);
app.use(
  "/api/appointments",
  authMiddleware,
  authorize("PATIENT"),
  appointmentsRoute,
);
// app.get("/test-auth", authMiddleware, (req, res) => {
//   res.json({
//     message: "Authenticated successfully",
//     user: req.user,
//   });
// });

export default app;
