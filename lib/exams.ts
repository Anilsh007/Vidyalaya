import { Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";

export type GradeBand = {
  min: number;
  label: string;
  resultStatus?: "PASS" | "FAIL";
};

export const defaultGradeBands: GradeBand[] = [
  { min: 90, label: "A+", resultStatus: "PASS" },
  { min: 80, label: "A", resultStatus: "PASS" },
  { min: 70, label: "B+", resultStatus: "PASS" },
  { min: 60, label: "B", resultStatus: "PASS" },
  { min: 50, label: "C", resultStatus: "PASS" },
  { min: 40, label: "D", resultStatus: "PASS" },
  { min: 0, label: "F", resultStatus: "FAIL" }
];

export const examSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Exam name is required."),
  classId: z.string().trim().optional(),
  examTerm: z.string().trim().min(2, "Exam term is required."),
  examType: z.string().trim().min(2, "Exam type is required."),
  startDate: z.string().trim().min(1, "Start date is required."),
  endDate: z.string().trim().min(1, "End date is required.")
});

export const gradeConfigSchema = z.object({
  gradeConfig: z.string().trim().min(5, "Add at least one grading rule.")
});

export const marksSheetSchema = z.object({
  examId: z.string().trim().min(1, "Select an exam."),
  sectionId: z.string().trim().min(1, "Select a section."),
  examSubjectId: z.string().trim().min(1, "Select an exam subject.")
});

export async function getGradeBands(schoolId: string) {
  const setting = await db.setting.findUnique({
    where: {
      schoolId_category_key: {
        schoolId,
        category: "grading",
        key: "bands"
      }
    }
  });

  if (!Array.isArray(setting?.value)) {
    return defaultGradeBands;
  }

  const parsed = z
    .array(
      z.object({
        min: z.number(),
        label: z.string(),
        resultStatus: z.enum(["PASS", "FAIL"]).optional()
      })
    )
    .safeParse(setting.value);

  return parsed.success ? parsed.data.sort((a, b) => b.min - a.min) : defaultGradeBands;
}

export function gradeBandsToText(bands: GradeBand[]) {
  return bands.map((band) => `${band.min}:${band.label}:${band.resultStatus ?? "PASS"}`).join("\n");
}

export function parseGradeBandsText(input: string) {
  const bands = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [min, label, resultStatus] = line.split(":").map((part) => part.trim());
      return {
        min: Number(min),
        label,
        resultStatus: (resultStatus?.toUpperCase() as "PASS" | "FAIL" | undefined) ?? "PASS"
      };
    })
    .filter((item) => !Number.isNaN(item.min) && item.label);

  return bands.sort((a, b) => b.min - a.min);
}

export function calculateGrade(percentage: number, bands: GradeBand[]) {
  return bands.find((band) => percentage >= band.min) ?? bands[bands.length - 1];
}

export function computeResultSummary({
  obtainedMarks,
  totalMarks,
  hasSubjectFailure,
  bands
}: {
  obtainedMarks: number;
  totalMarks: number;
  hasSubjectFailure: boolean;
  bands: GradeBand[];
}) {
  const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0;
  const gradeBand = calculateGrade(percentage, bands);
  const resultStatus =
    hasSubjectFailure || gradeBand.resultStatus === "FAIL" ? "FAIL" : "PASS";

  return {
    percentage,
    grade: gradeBand.label,
    resultStatus
  };
}

export function toMoney(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}
