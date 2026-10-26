import express from "express"
import prisma from "./config/prisma.js"
import doctorsRoute from "./routes/doctors.js"

const app = express()
 
app.use(express.json())

app.get("/health", (req, res) => {
    res.json({status: "ok"})
})

app.get("/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error);
    res.status(503).json({ status: "error", database: "unavailable" });
  }
})
app.use("/api/doctors", doctorsRoute);

export default app 