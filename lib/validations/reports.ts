import { z } from "zod";

export const reportsFilterSchema = z.object({
  classId: z.string().trim().optional(),
  sectionId: z.string().trim().optional(),
  examId: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional()
});

export const reportTypeSchema = z.enum([
  "student",
  "attendance",
  "fees",
  "dues",
  "results"
]);
