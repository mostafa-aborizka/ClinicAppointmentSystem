import prisma from "../config/prisma.js";
import { validDays } from "../constants/days.js";
import { AppError } from "../utils/AppError.js";
import { minutesToTime, timeToMinutes } from "../utils/time.js";

export async function getAvailableSlots(id, date) {
  const slots = [];
  const doctor = await prisma.user.findFirst({
    where: {
      id: id,
      role: "DOCTOR",
    },
    select: {
      id: true,
    },
  });
  if (!doctor) {
    throw new AppError("Doctor was not found", 404);
  }
  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  const exceptions = await prisma.scheduleException.findMany({
    where: {
      doctorId: id,
      date: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
    select: {
      type: true,
      startTime: true,
      endTime: true,
    },
  });
  const requestedDate = new Date(`${date}T00:00:00.000Z`);
  const dayOfWeek = validDays[requestedDate.getUTCDay()];
  const schedules = await prisma.doctorSchedule.findMany({
    where: {
      doctorId: id,
      dayOfWeek,
    },
  });

  const unavailable = exceptions.find(
    exception =>
      exception.type === "UNAVAILABLE" &&
      !exception.startTime &&
      !exception.endTime,
  );
  const extraDay = exceptions.find(
    exception => exception.type === "EXTRA_WORKING_DAY",
  );
  if (unavailable) {
    return [];
  }
  const workingPeriods = extraDay
    ? [
        {
          startTime: extraDay.startTime,
          endTime: extraDay.endTime,
        },
      ]
    : schedules.map(schedule => ({
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      }));
  for (const period of workingPeriods) {
    const startTime = timeToMinutes(period.startTime);
    const endTime = timeToMinutes(period.endTime);
    let currentTime = startTime;
    while (currentTime + 30 <= endTime) {
      const slot = {
        startTime: minutesToTime(currentTime),
        endTime: minutesToTime(currentTime + 30),
      };
      slots.push(slot);
      currentTime += 35;
    }
  }
  const unavailablePeriod = exceptions.filter(
    exception =>
      exception.type === "UNAVAILABLE" &&
      exception.startTime &&
      exception.endTime,
  );

  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId: id,
      startTime: {
        lt: endOfDay,
      },
      endTime: {
        gt: startOfDay,
      },
      status: {
        in: ["REQUESTED", "CONFIRMED", "CHECKED_IN"],
      },
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });
  const availableSlots = slots.filter(slot => {
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = timeToMinutes(slot.endTime);

    const hasUnavailableConflict = unavailablePeriod.some(period => {
      const unavailableStart = timeToMinutes(period.startTime);
      const unavailableEnd = timeToMinutes(period.endTime);
      return slotStart < unavailableEnd && slotEnd > unavailableStart;
    });
    const hasAppointmentConflict = appointments.some(appointment => {
      const appointmentStart =
        appointment.startTime.getUTCHours() * 60 +
        appointment.startTime.getUTCMinutes();
      const appointmentEnd =
        appointment.endTime.getUTCHours() * 60 +
        appointment.endTime.getUTCMinutes();
      return slotStart < appointmentEnd && slotEnd > appointmentStart;
    });
    return !hasUnavailableConflict && !hasAppointmentConflict;
  });
  return availableSlots;
}
