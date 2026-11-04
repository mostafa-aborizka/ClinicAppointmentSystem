import express from "express";
import { isValidDate } from "../utils/validators.js";
import { getAvailableSlots } from "../services/availability.js";

const router = express.Router();

router.get("/:id/slots", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid doctor id",
    });
  }
  const { date } = req.query;
  if (!isValidDate(date)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid date",
    });
  }
  try {
    const availableSlots = await getAvailableSlots(id, date);
    return res.status(200).json({ data: availableSlots });
  } catch (error) {
    console.error("Failed to find slots", error);

    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.statusCode ? error.message : "Internal server error",
    });
  }
});

export default router;
