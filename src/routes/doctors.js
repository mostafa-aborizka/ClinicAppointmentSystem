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

export default router