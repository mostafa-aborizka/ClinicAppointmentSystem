import express from "express";
import prisma from "../config/prisma.js";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const doctors = await prisma.user.findMany({
        where: {
            role: "DOCTOR"
        },
        select: {
            id: true,
            name: true,
            email: true
        }
    })
    res.json({ data: doctors });        
    } catch (error) {
        console.error("doctors data fetch failed", error)
        res.status(500).json({ status: "error", database: "unavailable" });
        
    }
})

router.get("/:id", async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            status: "error",
            message: "Invalid doctor id"
        })
    }
    try {
        const doctor = await prisma.user.findFirst({
            where: {
                id : id,
                role: "DOCTOR",
            },
            select: {
            id: true,
            name: true,
            email: true
            } 
        })
        if (!doctor) {
            return res.status(404).json({
                status : "error",
                message: "Doctor was not found"
            })
        }
        res.status(200).json({data: doctor});
    }
    catch (error) {
        console.error("Couldn't find doctor", error)
        res.status(500).json({ 
            status: "error", 
            message: "Internal server error" })
    }
})

export default router