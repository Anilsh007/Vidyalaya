import { AttendanceStatus } from "@prisma/client";
import { z } from "zod";

export const attendanceStatusOptions = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT,
  AttendanceStatus.LATE,
  AttendanceStatus.LEAVE
] as const;

export type AttendanceSheetStatus = (typeof attendanceStatusOptions)[number];

export function isAttendanceSheetStatus(value: string): value is AttendanceSheetStatus {
  return attendanceStatusOptions.some((status) => status === value);
}

export const attendanceSheetSchema = z.object({
  classId: z.string().trim().min(1, "Select a class."),
  sectionId: z.string().trim().min(1, "Select a section."),
  date: z.string().trim().min(1, "Select a date.")
});

export const attendanceFiltersSchema = z.object({
  date: z.string().trim().optional(),
  month: z.string().trim().optional(),
  year: z.string().trim().optional()
});

export function isValidDate(value: Date) {
  return !Number.isNaN(value.getTime());
}

export function toDayBounds(dateInput: string) {
  return {
    start: new Date(`${dateInput}T00:00:00.000Z`),
    end: new Date(`${dateInput}T23:59:59.999Z`)
  };
}

export function getMonthBounds(monthInput: string) {
  const [year, month] = monthInput.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

export function toMonthInput(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function toDateInput(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getSafeDateInput(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return toDateInput();
  }

  const bounds = toDayBounds(trimmed);
  return isValidDate(bounds.start) && isValidDate(bounds.end) && toDateInput(bounds.start) === trimmed
    ? trimmed
    : toDateInput();
}

export function getSafeMonthInput(value?: string | null, year?: string | null) {
  const trimmed = value?.trim();
  const trimmedYear = year?.trim();

  if (!trimmed) {
    return toMonthInput();
  }

  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const bounds = getMonthBounds(trimmed);
    return isValidDate(bounds.start) && isValidDate(bounds.end) && toMonthInput(bounds.start) === trimmed
      ? trimmed
      : toMonthInput();
  }

  if (/^\d{1,2}$/.test(trimmed) && /^\d{4}$/.test(trimmedYear ?? "")) {
    const normalized = `${trimmedYear}-${trimmed.padStart(2, "0")}`;
    const bounds = getMonthBounds(normalized);
    return isValidDate(bounds.start) && isValidDate(bounds.end) && toMonthInput(bounds.start) === normalized
      ? normalized
      : toMonthInput();
  }

  const bounds = getMonthBounds(trimmed);
  return isValidDate(bounds.start) && isValidDate(bounds.end) && toMonthInput(bounds.start) === trimmed
    ? trimmed
    : toMonthInput();
}

export function getSafeDayBounds(value?: string | null) {
  return toDayBounds(getSafeDateInput(value));
}

export function getSafeMonthBounds(value?: string | null, year?: string | null) {
  return getMonthBounds(getSafeMonthInput(value, year));
}

export function attendanceLabel(status: AttendanceStatus) {
  switch (status) {
    case AttendanceStatus.PRESENT:
      return "Present";
    case AttendanceStatus.ABSENT:
      return "Absent";
    case AttendanceStatus.LATE:
      return "Late";
    case AttendanceStatus.LEAVE:
      return "Leave";
    case AttendanceStatus.HALF_DAY:
      return "Half day";
    default:
      return status;
  }
}
