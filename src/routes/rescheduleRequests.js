import express from "express";
import prisma from "../config/prisma.js";

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

export default router;
