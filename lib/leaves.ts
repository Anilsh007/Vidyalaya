import { z } from "zod";

export const leaveRequestSchema = z
  .object({
    requesterType: z.enum(["STUDENT", "STAFF"]),
    studentId: z.string().optional(),
    staffId: z.string().optional(),
    leaveType: z.string().trim().min(2, "Leave type is required."),
    startDate: z.string().trim().min(1, "Start date is required."),
    endDate: z.string().trim().min(1, "End date is required."),
    reason: z.string().trim().min(5, "Reason is required.")
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be on or after start date.",
    path: ["endDate"]
  })
  .refine((data) => data.requesterType !== "STUDENT" || Boolean(data.studentId), {
    message: "Select a student.",
    path: ["studentId"]
  })
  .refine((data) => data.requesterType !== "STAFF" || Boolean(data.staffId), {
    message: "Select a staff member.",
    path: ["staffId"]
  });

export const leaveReviewSchema = z.object({
  leaveId: z.string().min(1, "Leave request is required."),
  status: z.enum(["APPROVED", "REJECTED", "CANCELLED"]),
  reviewRemarks: z.string().trim().optional()
});

export function calculateLeaveDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(days, 1);
}
