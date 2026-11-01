import express from "express";
import prisma from "../config/prisma.js";
import { isValidDate } from "../utils/validators.js";
import { validDays } from "../constants/days.js";
import { minutesToTime, timeToMinutes } from "../utils/time.js";

const router = express.Router();

router.get("/:id/slots", async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            status: "error",
            message: "Invalid doctor id"
        })
    }
    const { date } = req.query
    if (!isValidDate(date)) {
        return res.status(400).json({
            status: "error",
            message: "Invalid date"
        })
    }
    try{
        const slots = [];
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
        const startOfDay = new Date(`${date}T00:00:00.000Z`);
        const endOfDay = new Date(startOfDay);
        endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

        const exceptions = await prisma.scheduleException.findMany({
        where: {
            doctorId: id,
            date: {
                gte: startOfDay,
                lt: endOfDay
            }
        },
        select: {
            type: true,
            startTime: true,
            endTime: true
        }
        });
        const requestedDate = new Date(`${date}T00:00:00.000Z`);
        const dayOfWeek = validDays[requestedDate.getUTCDay()]
        const schedules = await prisma.doctorSchedule.findMany({
            where: {
                doctorId: id, 
                dayOfWeek
            }
        })

        const unavailable = exceptions.find(
            exception => 
                exception.type === "UNAVAILABLE" &&
                !exception.startTime &&
                !exception.endTime
        )
        const extraDay = exceptions.find(
            exception => 
                exception.type === "EXTRA_WORKING_DAY"
        )
        if (unavailable) {
            return res.status(200).json({ data: []})
        }
        const workingPeriods = extraDay
            ? [{
                startTime: extraDay.startTime,
                endTime: extraDay.endTime
            }]
            : schedules.map(schedule => ({
                startTime: schedule.startTime,
                endTime: schedule.endTime
            }))
        for (const period of workingPeriods) {
            const startTime = timeToMinutes(period.startTime)
            const endTime = timeToMinutes(period.endTime)
            let currentTime = startTime
            while(currentTime + 30 <= endTime) {
                const slot = {
                    startTime: minutesToTime(currentTime),
                    endTime: minutesToTime(currentTime + 30)
                }
                slots.push(slot)
                currentTime += 35
            }
        }
        return res.status(200).json({ data: slots });

    }
    catch(error) {
        console.error("Failed to find slots", error);
        res.status(500).json({
            status: "error",
            message: "Internal server error"
        })
    }
})


export default router 