import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({adapter})

async function main() {
    const passwordHash = await bcrypt.hash("Doctor123!", 10);
    const doctor = await prisma.user.upsert({
        where: {email: "doctor@example.com"},
        update: {
            name: "DR. John Watson",
            passwordHash,
            role: "DOCTOR"
        },
        create: {
            email: "doctor@example.com",
            name: "DR. John Watson",
            passwordHash,
            role: "DOCTOR"
        },
    })
    console.log("Seeded doctor: ", doctor.email)
}
main()
    .catch((error) => {
        console.error("Seeding failed", error)
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect()
    })