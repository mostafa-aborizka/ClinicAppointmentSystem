import express from "express";
import { isValidDate, timePattern } from "../utils/validators.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { doctorId, date, startTime } = req.body;
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
});

export default router;
