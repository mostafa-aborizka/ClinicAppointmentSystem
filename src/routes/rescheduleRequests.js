import express from "express";
import prisma from "../config/prisma.js";
import { utcToLocalDateTime } from "../utils/timezone.js";
import { getAvailableSlots } from "../services/availability.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const id = req.user.id;
  const role = req.user.role;
  try {
    const where = {
      status: "PENDING",
      ...(role === "DOCTOR" ? { appointment: { doctorId: id } } : {}),
    };
    const requests = await prisma.rescheduleRequest.findMany({
      where,
      select: {
        id: true,
        requestedStartTime: true,
        requestedEndTime: true,
        requestedAt: true,
        appointment: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            doctor: {
              select: {
                id: true,
                name: true,
              },
            },
            patient: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        requestedAt: "asc",
      },
    });
    res.status(200).json({
      status: "success",
      data: requests,
    });
  } catch (error) {
    console.error("Failed to find reschedule requests", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.patch("/:id/approve", async (req, res) => {
  const id = Number(req.params.id);
  const reviewerId = req.user.id;
  const reviewerRole = req.user.role;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid reschedule request id",
    });
  }

  try {
    const request = await prisma.rescheduleRequest.findFirst({
      where: {
        id,
        status: "PENDING",
        ...(reviewerRole === "DOCTOR"
          ? { appointment: { doctorId: reviewerId } }
          : {}),
      },
      select: {
        id: true,
        status: true,
        requestedStartTime: true,
        requestedEndTime: true,
        appointmentId: true,
        appointment: {
          select: {
            doctorId: true,
            patientId: true,
            status: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });
    if (!request) {
      return res.status(404).json({
        status: "error",
        message: "No request was found",
      });
    }
    const approvableAppointmentStatuses = ["REQUESTED", "CONFIRMED"];
    if (!approvableAppointmentStatuses.includes(request.appointment.status)) {
      return res.status(409).json({
        status: "error",
        message: "approval not allowed",
      });
    }
    const requestedStartTime = utcToLocalDateTime(request.requestedStartTime);
    const requestedEndTime = utcToLocalDateTime(request.requestedEndTime);
    const slots = await getAvailableSlots(
      request.appointment.doctorId,
      requestedStartTime.date,
    );
    const requestedSlot = slots.find(
      slot =>
        slot.startTime === requestedStartTime.time.slice(0, 5) &&
        slot.endTime === requestedEndTime.time.slice(0, 5),
    );
    if (!requestedSlot) {
      return res.status(409).json({
        status: "error",
        message: "requested reschedule time is no longer available",
      });
    }
    const result = await prisma.$transaction(async tx => {
      const updatedAppointment = await tx.appointment.updateMany({
        where: {
          id: request.appointmentId,
          status: {
            in: approvableAppointmentStatuses,
          },
        },
        data: {
          startTime: request.requestedStartTime,
          endTime: request.requestedEndTime,
        },
      });
      if (updatedAppointment.count === 0) {
        throw new Error("APPOINTMENT_NOT_UPDATABLE");
      }
      const updatedRescheduleRequest = await tx.rescheduleRequest.updateMany({
        where: {
          id: request.id,
          status: "PENDING",
        },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedById: reviewerId,
        },
      });
      if (updatedRescheduleRequest.count === 0) {
        throw new Error("RESCHEDULE_REQUEST_NOT_UPDATABLE");
      }
      return tx.rescheduleRequest.findUnique({
        where: { id: request.id },
        select: {
          id: true,
          status: true,
          reviewedAt: true,
          reviewedById: true,
          appointment: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      });
    });
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Failed to approve reschedule request", error);
    if (error.code === "P2002") {
      return res.status(409).json({
        status: "error",
        message: "The requested appointment slot is no longer available",
      });
    }
    if (error.message === "APPOINTMENT_NOT_UPDATABLE") {
      return res.status(409).json({
        status: "error",
        message: "Appointment can no longer be changed",
      });
    }
    if (error.message === "RESCHEDULE_REQUEST_NOT_UPDATABLE") {
      return res.status(409).json({
        status: "error",
        message: "Reschedule request has already been reviewed",
      });
    }
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.patch("/:id/decline", async (req, res) => {
  const id = Number(req.params.id);
  const { declineReason } = req.body;
  const reviewerId = req.user.id;
  const reviewerRole = req.user.role;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid reschedule request id",
    });
  }
  if (
    declineReason !== undefined &&
    (typeof declineReason !== "string" || declineReason.length > 500)
  ) {
    return res.status(400).json({
      status: "error",
      message: "Invalid decline reason",
    });
  }
  try {
    const request = await prisma.rescheduleRequest.findFirst({
      where: {
        id,
        status: "PENDING",
        ...(reviewerRole === "DOCTOR"
          ? { appointment: { doctorId: reviewerId } }
          : {}),
      },
      select: {
        id: true,
      },
    });
    if (!request) {
      return res.status(404).json({
        status: "error",
        message: "No request was found",
      });
    }
    const updatedRescheduleRequest = await prisma.rescheduleRequest.updateMany({
      where: {
        id: request.id,
        status: "PENDING",
        ...(reviewerRole === "DOCTOR"
          ? { appointment: { doctorId: reviewerId } }
          : {}),
      },
      data: {
        status: "DECLINED",
        declineReason,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
      },
    });
    if (updatedRescheduleRequest.count === 0) {
      throw new Error("RESCHEDULE_REQUEST_NOT_UPDATABLE");
    }
    const result = await prisma.rescheduleRequest.findUnique({
      where: { id: request.id },
      select: {
        id: true,
        status: true,
        reviewedAt: true,
        reviewedById: true,
        appointment: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Failed to decline reschedule request", error);
    if (error.message === "RESCHEDULE_REQUEST_NOT_UPDATABLE") {
      return res.status(409).json({
        status: "error",
        message: "Reschedule request has already been reviewed",
      });
    }
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
