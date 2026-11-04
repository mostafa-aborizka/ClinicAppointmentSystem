export const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
export const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export function isValidDate(date) {
  if (typeof date !== "string" || !datePattern.test(date)) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}
