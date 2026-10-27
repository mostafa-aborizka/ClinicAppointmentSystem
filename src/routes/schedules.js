import express from "express";
import prisma from "../config/prisma.js";

const router = express.Router();
const validDays = [
    "SATURDAY",
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    ];
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

router.post("/:id/schedules", async (req, res) => {
    const id = Number(req.params.id)
    const {dayOfWeek, startTime, endTime} = req.body
    if (!Number.isInteger(id) || id <= 0){
        return res.status(400).json({
            status: "error",
            message: "Invalid doctor id"
        })
    }
    if (
        !validDays.includes(dayOfWeek) ||
        typeof startTime !== "string" ||
        typeof endTime !== "string" ||
        !timePattern.test(startTime) ||
        !timePattern.test(endTime)
    ) {
        return res.status(400).json({
            status: "error",
            message: "invalid schedule values"
        })
      }
    if (startTime >= endTime){
        return res.status(400).json({
            status: "error",
            message: "End time must be later than start time"
        })
    }
    try {
        const doctor = await prisma.user.findFirst({
            where: {
                id: id,
                role: "DOCTOR"
            }
        })
        if (!doctor) {
            return res.status(404).json({
                status: "error",
                message: "Doctor was not found"
            })
        }
        const schedule = await prisma.doctorSchedule.create({
                data: {
                    doctorId: id,
                    dayOfWeek,
                    startTime,
                    endTime
                }
        })
        res.status(201).json({data: schedule});
    }
    catch(error) {
        console.error("Failed to create schedule", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error"
        })
    }
})

router.get("/:id/schedules", async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0){
        return res.status(400).json({
            status: "error",
            message: "Invalid doctor id"
        })
    }
    try {
        const doctor = await prisma.user.findFirst({
            where: {
                id: id,
                role: "DOCTOR"
            }
        })
        if (!doctor) {
            return res.status(404).json({
                status: "error",
                message: "Doctor was not found"
            })
        }
        const schedules = await prisma.doctorSchedule.findMany({
            where: {
                doctorId: id
            },
            select: {
                dayOfWeek: true,
                startTime: true,
                endTime: true
            }
        })
        res.status(200).json({data: schedules})
    }
    catch(error) {
        console.error("Failed to find schedules", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error"
        })
    }
    
})

export default router