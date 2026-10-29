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
const exceptionType = ["UNAVAILABLE", "EXTRA_WORKING_DAY"];
const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

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
        const hasConflict = schedules.some(
            (schedule)=> 
            schedule.dayOfWeek === dayOfWeek &&
            startTime < schedule.endTime &&
            endTime > schedule.startTime
        )
        if (hasConflict){
            return res.status(409).json({
                status: "error",
                message: "Conflicting schedule"
            })
        }
        const newSchedule = await prisma.doctorSchedule.create({
                data: {
                    doctorId: id,
                    dayOfWeek,
                    startTime,
                    endTime
                }
        })
        res.status(201).json({data: newSchedule});
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
                id: true,
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
router.post("/:id/exceptions", async (req, res) => {
    const id = Number(req.params.id);
    const {date, startTime, endTime, type} = req.body;
    if (!Number.isInteger(id) || id <= 0){
        return res.status(400).json({
            status: "error",
            message: "Invalid doctor id"
        })
    }
    function isValidDate(date) {
        if (typeof date !== "string" || !datePattern.test(date)) {
          return false;
        }
    
        const [year, month, day] = date.split("-").map(Number);

        const parsedDate = new Date(Date.UTC(year, month - 1, day));
    
        return (
          parsedDate.getUTCFullYear() === year &&
          parsedDate.getUTCMonth() === month - 1 &&
          parsedDate.getUTCDate() === day
        );
    }
    const hasStartTime = startTime !== undefined && startTime !== null && startTime !== "";
    const hasEndTime = endTime !== undefined && endTime !== null && endTime !== "";

    if (
        !exceptionType.includes(type) ||
        !isValidDate(date) ||
        (type === "UNAVAILABLE" && hasStartTime !== hasEndTime) ||
        (type === "EXTRA_WORKING_DAY" && (!hasStartTime || !hasEndTime)) ||
        (hasStartTime && (
            typeof startTime !== "string" ||
            !timePattern.test(startTime)
        )) ||

        (hasEndTime && (
            typeof endTime !== "string" ||
            !timePattern.test(endTime)
        )) ||

        (hasStartTime && hasEndTime && startTime >= endTime)
    ) {
        return res.status(400).json({
            status: "error",
            message: "Invalid exception values"
        });
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
        const exceptionDate = new Date(`${date}T00:00:00.000Z`);
        const exception = await prisma.scheduleException.create({
            data: {
                doctorId: id,
                type,
                date: exceptionDate,
                startTime,
                endTime
            }
        })
        res.status(201).json({data: exception})
        
    }
    catch(error) {
        console.error("Failed to create exception", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error"
        })
    }



})

router.get("/:id/exceptions", async (req, res) => {
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
            },
            select: {
                id: true
            }
        })
        if (!doctor) {
            return res.status(404).json({
                status: "error",
                message: "Doctor was not found"
            })
        }
        const exceptions = await prisma.scheduleException.findMany({
            where: {
                doctorId: id
            },
            select: {
                id: true,
                type: true,
                date: true,
                startTime: true,
                endTime: true
            },
            orderBy: {
                date: "asc"
            }
        })
        res.status(200).json({data: exceptions})
    }
    catch(error) {
        console.error("Failed to find exceptions", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error"
        })
    }    
})

export default router