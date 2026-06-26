import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";

export const schoolSettingsSchema = z.object({
  schoolName: z.string().trim().min(2, "School name is required."),
  logoUrl: z
    .string()
    .trim()
    .max(500, "Logo reference is too long.")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().min(8, "Address is required."),
  phone: z.string().trim().min(7, "Phone number is required."),
  email: z.string().trim().email("Enter a valid email address."),
  academicYearName: z.string().trim().min(4, "Academic year is required."),
  academicYearStartDate: z.string().trim().min(1, "Start date is required."),
  academicYearEndDate: z.string().trim().min(1, "End date is required."),
  receiptPrefix: z.string().trim().min(2, "Receipt prefix is required."),
  reportCardTitle: z.string().trim().min(2, "Report card title is required."),
  gradingScale: z.string().trim().min(2, "Grading scale is required."),
  showAttendanceOnReportCard: z.enum(["yes", "no"]),
  principalSignatureLabel: z.string().trim().min(2, "Signature label is required.")
});

export const classSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Class name is required."),
  displayOrder: z.coerce.number().int().min(0, "Display order cannot be negative.")
});

export const sectionSchema = z.object({
  id: z.string().optional(),
  classId: z.string().min(1, "Select a class."),
  name: z.string().trim().min(1, "Section name is required."),
  capacity: z
    .union([z.literal(""), z.coerce.number().int().min(1, "Capacity must be at least 1.")])
    .optional(),
  classTeacherId: z.string().optional()
});

export const subjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Subject name is required."),
  code: z.string().trim().min(2, "Subject code is required."),
  classId: z.string().optional()
});

export const studentSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", ""]).optional(),
  dateOfBirth: z.string().trim().optional(),
  admissionDate: z.string().trim().min(1, "Admission date is required."),
  admissionNumber: z.string().trim().min(2, "Admission number is required."),
  rollNumber: z.string().trim().optional(),
  status: z.string().trim().default("ACTIVE"),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  address: z.string().trim().optional(),
  guardianName: z.string().trim().min(2, "Guardian name is required."),
  relation: z.string().trim().min(2, "Relation is required."),
  fatherName: z.string().trim().optional(),
  motherName: z.string().trim().optional(),
  guardianPhonePrimary: z.string().trim().min(7, "Guardian phone is required."),
  guardianPhoneSecondary: z.string().trim().optional(),
  guardianEmail: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Enter a valid guardian email address."
    }),
  occupation: z.string().trim().optional()
});

export const staffSchema = z.object({
  id: z.string().optional(),
  employeeCode: z.string().trim().min(2, "Employee code is required."),
  fullName: z.string().trim().min(2, "Staff name is required."),
  designation: z.string().trim().min(2, "Designation is required."),
  department: z.string().trim().optional(),
  qualification: z.string().trim().optional(),
  joiningDate: z.string().trim().min(1, "Joining date is required."),
  phone: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Enter a valid email address."
    }),
  gender: z.enum(["MALE", "FEMALE", "OTHER", ""]).optional(),
  salaryAmount: z
    .union([z.literal(""), z.coerce.number().min(0, "Salary cannot be negative.")])
    .optional(),
  isTeachingStaff: z.enum(["yes", "no"])
});

export async function getCurrentAcademicYear(schoolId: string) {
  return db.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
    orderBy: { startDate: "desc" }
  });
}

export async function getSchoolSettingsBundle(schoolId: string) {
  const [school, currentAcademicYear, settings] = await Promise.all([
    db.school.findUniqueOrThrow({
      where: { id: schoolId }
    }),
    getCurrentAcademicYear(schoolId),
    db.setting.findMany({
      where: {
        schoolId,
        category: {
          in: ["branding", "finance", "report_card"]
        }
      }
    })
  ]);

  const settingMap = new Map(settings.map((item) => [`${item.category}:${item.key}`, item.value]));
  const address = [
    school.addressLine1,
    school.addressLine2,
    school.city,
    school.state,
    school.postalCode,
    school.country
  ]
    .filter(Boolean)
    .join(", ");

  return {
    school,
    currentAcademicYear,
    values: {
      schoolName: school.name,
      logoUrl: asString(settingMap.get("branding:logoUrl")),
      address,
      phone: school.phone ?? "",
      email: school.email ?? "",
      academicYearName: currentAcademicYear?.name ?? "",
      academicYearStartDate: toDateInput(currentAcademicYear?.startDate),
      academicYearEndDate: toDateInput(currentAcademicYear?.endDate),
      receiptPrefix: asString(settingMap.get("finance:receiptPrefix")) || "RCPT",
      reportCardTitle: asString(settingMap.get("report_card:title")) || "Progress Report",
      gradingScale: asString(settingMap.get("report_card:gradingScale")) || "Marks and grades",
      showAttendanceOnReportCard:
        asBoolean(settingMap.get("report_card:showAttendanceOnReportCard")) ? "yes" : "no",
      principalSignatureLabel:
        asString(settingMap.get("report_card:principalSignatureLabel")) || "Principal"
    }
  };
}

export async function upsertSetting(
  tx: Prisma.TransactionClient,
  schoolId: string,
  category: string,
  key: string,
  value: Prisma.InputJsonValue
) {
  await tx.setting.upsert({
    where: {
      schoolId_category_key: {
        schoolId,
        category,
        key
      }
    },
    update: { value },
    create: {
      schoolId,
      category,
      key,
      value
    }
  });
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

export function toDateInput(value?: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}
