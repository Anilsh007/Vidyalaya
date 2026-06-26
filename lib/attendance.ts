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
