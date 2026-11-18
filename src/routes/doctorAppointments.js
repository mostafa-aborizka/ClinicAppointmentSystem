import express from "express";
import { isValidDate } from "../utils/validators.js";
import { addDays, format, parseISO } from "date-fns";
import { localDateTimeToUtc } from "../utils/timezone.js";
import prisma from "../config/prisma.js";

const router = express.Router();

router.get("/me/appointments", async (req, res) => {
  const { date } = req.query;
  const id = req.user.id;

  if (!isValidDate(date)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid date",
    });
  }
  const startOfDay = localDateTimeToUtc(date, "00:00");
  const nextDate = addDays(parseISO(date), 1);
  const endOfDay = localDateTimeToUtc(format(nextDate, "yyyy-MM-dd"), "00:00");

  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: id,
        startTime: {
          lt: endOfDay,
        },
        endTime: {
          gt: startOfDay,
        },
        status: {
          in: ["REQUESTED", "CONFIRMED", "CHECKED_IN", "COMPLETED", "NO_SHOW"],
        },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        patient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });
    return res.status(200).json({
      status: "success",
      data: appointments,
    });
  } catch (error) {
    console.error("Failed to find appointments", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
