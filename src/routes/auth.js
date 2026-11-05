import express from "express";
import prisma from "../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      status: "error",
      message: "Invalid registration data",
    });
  }
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedName || !normalizedEmail || !password) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required",
    });
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalizedEmail)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid email address",
    });
  }
  if (password.length < 8) {
    return res.status(400).json({
      status: "error",
      message: "Password must be at least 8 characters",
    });
  }
  try {
    const emailExists = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });
    if (emailExists) {
      return res.status(409).json({
        status: "error",
        message: "An account with this email address already exists.",
      });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role: "PATIENT",
      },
    });
    return res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        status: "error",
        message: "An account with this email address already exists.",
      });
    }
    console.error("Failed to register user", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({
      status: "error",
      message: "Invalid login data",
    });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required",
    });
  }
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        passwordHash: true,
        role: true,
      },
    });
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Wrong email or password",
      });
    }
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Wrong email or password",
      });
    }
    const token = jwt.sign(
      {
        sub: String(user.id),
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    return res.status(200).json({
      status: "success",
      data: { token },
    });
  } catch (error) {
    console.error("Failed to log in user", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
