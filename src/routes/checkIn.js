import express from "express";
import prisma from "../config/prisma.js";
import authorize from "../middleware/authorize.js";
import { utcToLocalDateTime } from "../utils/timezone.js";

const router = express.Router();
router.use(authorize("DOCTOR", "RECEPTIONIST"));

router.patch("/:id/check-in", async (req, res) => {
  const id = Number(req.params.id);
  const role = req.user.role;
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid appointment id",
    });
  }
  try {
    const where = {
      id,
      ...(role === "DOCTOR" ? { doctorId: req.user.id } : {}),
    };
    const appointment = await prisma.appointment.findFirst({
      where,
      select: {
        id: true,
        status: true,
        startTime: true,
      },
    });
    if (!appointment) {
      return res.status(404).json({
        status: "error",
        message: "Failed to find appointment",
      });
    }
    if (appointment.status !== "CONFIRMED") {
      return res.status(409).json({
        status: "error",
        message: "This appointment isn't updatable",
      });
    }
    const appointmentDate = utcToLocalDateTime(appointment.startTime).date;
    const today = utcToLocalDateTime(new Date()).date;
    if (appointmentDate !== today) {
      return res.status(409).json({
        status: "error",
        message: "Appointment can only be checked in on its scheduled date",
      });
    }
    const updatedAppointment = await prisma.appointment.updateMany({
      where: {
        ...where,
        status: "CONFIRMED",
      },
      data: {
        status: "CHECKED_IN",
      },
    });
    if (updatedAppointment.count === 0) {
      return res.status(409).json({
        status: "error",
        message:
          "Appointment could not be checked in. Its status may have changed.",
      });
    }
    const result = await prisma.appointment.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });
    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Failed to find appointment", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});
