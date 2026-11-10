import express from "express";
import { isValidDate, timePattern } from "../utils/validators.js";
import { getAvailableSlots } from "../services/availability.js";
import { localDateTimeToUtc } from "../utils/timezone.js";
import prisma from "../config/prisma.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { doctorId, date, startTime } = req.body;
  const patientId = req.user.id;
  if (!Number.isInteger(doctorId) || doctorId <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid doctor id",
    });
  }
  if (!isValidDate(date)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid date",
    });
  }
  if (typeof startTime !== "string" || !timePattern.test(startTime)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid start time",
    });
  }
  try {
    const slots = await getAvailableSlots(doctorId, date);
    const openSlot = slots.find(slot => slot.startTime === startTime);
    if (!openSlot) {
      return res.status(409).json({
        status: "error",
        message: "appointment time is not available",
      });
    }
    const appointmentStartTime = localDateTimeToUtc(date, openSlot.startTime);
    const appointmentEndTime = localDateTimeToUtc(date, openSlot.endTime);

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        startTime: appointmentStartTime,
        endTime: appointmentEndTime,
        status: "REQUESTED",
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
    return res.status(201).json({
      status: "success",
      data: appointment,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        status: "error",
        message: "This appointment slot has already been booked",
      });
    }
    console.error("Failed to create appointment", error);

    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.statusCode ? error.message : "Internal server error",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: req.user.id,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startTime: "desc",
      },
    });
    return res.status(200).json({
      status: "success",
      data: appointments,
    });
  } catch (error) {
    console.error("Failed to find appointments", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid appointment id",
    });
  }
  try {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        patientId: req.user.id,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    if (!appointment) {
      return res.status(404).json({
        status: "error",
        message: "Appointment not found",
      });
    }
    return res.status(200).json({
      status: "success",
      data: appointment,
    });
  } catch (error) {
    console.error("Failed to find appointment", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.patch("/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  const patientId = req.user.id;
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid appointment id",
    });
  }
  try {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        patientId,
      },
      select: {
        id: true,
        status: true,
      },
    });
    if (!appointment) {
      return res.status(404).json({
        status: "error",
        message: "Appointment not found",
      });
    }
    const validStatuses = ["REQUESTED", "CONFIRMED"];
    if (!validStatuses.includes(appointment.status)) {
      return res.status(409).json({
        status: "error",
        message: "Cancellation not allowed",
      });
    }
    const updatedAppointment = await prisma.appointment.updateMany({
      where: {
        id,
        patientId,
        status: { in: ["REQUESTED", "CONFIRMED"] },
      },
      data: {
        status: "CANCELLED",
      },
    });
    if (updatedAppointment.count === 0) {
      return res.status(409).json({
        status: "error",
        message: "Appointment can no longer be cancelled",
      });
    }
    const cancelledAppointment = await prisma.appointment.findUnique({
      where: {
        id,
        patientId,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return res.status(200).json({
      status: "success",
      data: cancelledAppointment,
    });
  } catch (error) {
    console.error("Failed to cancel appointment", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
