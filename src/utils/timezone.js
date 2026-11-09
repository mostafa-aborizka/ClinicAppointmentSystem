import { fromZonedTime, format } from "date-fns-tz";
import { CLINIC_TIMEZONE } from "../constants/timezone.js";

export function localDateTimeToUtc(date, time) {
  return fromZonedTime(`${date}T${time}`, CLINIC_TIMEZONE);
}

export function utcToLocalDateTime(date) {
  return {
    date: format(date, "yyyy-MM-dd", {
      timeZone: CLINIC_TIMEZONE,
    }),
    time: format(date, "HH:mm:ss", {
      timeZone: CLINIC_TIMEZONE,
    }),
  };
}
