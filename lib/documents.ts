import type { Document, DocumentOwnerType, Staff, Student, User } from "@prisma/client";
import { z } from "zod";

export const DOCUMENT_OWNER_OPTIONS = [
  { value: "SCHOOL", label: "School" },
  { value: "STUDENT", label: "Student" },
  { value: "STAFF", label: "Staff" },
  { value: "USER", label: "User account" }
] as const;

export const documentSchema = z
  .object({
    id: z.string().optional(),
    ownerType: z.enum(["SCHOOL", "STUDENT", "STAFF", "USER"]),
    studentId: z.string().optional(),
    staffId: z.string().optional(),
    userId: z.string().optional(),
    title: z.string().trim().min(2, "Document title is required."),
    fileName: z.string().trim().min(2, "File name is required."),
    filePath: z.string().trim().min(2, "File reference or path is required."),
    mimeType: z.string().trim().optional(),
    fileSizeBytes: z
      .union([z.literal(""), z.coerce.number().int().min(1, "File size must be at least 1 byte.")])
      .optional()
  })
  .superRefine((value, ctx) => {
    if (value.ownerType === "STUDENT" && !value.studentId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["studentId"], message: "Select a student." });
    }

    if (value.ownerType === "STAFF" && !value.staffId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["staffId"], message: "Select a staff member." });
    }

    if (value.ownerType === "USER" && !value.userId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["userId"], message: "Select a user account." });
    }
  });

type DocumentWithOwner = Document & {
  student?: Pick<Student, "fullName" | "admissionNumber"> | null;
  staff?: Pick<Staff, "fullName" | "employeeCode"> | null;
  user?: Pick<User, "fullName" | "email"> | null;
};

export function documentOwnerTypeLabel(ownerType: DocumentOwnerType | string) {
  return DOCUMENT_OWNER_OPTIONS.find((item) => item.value === ownerType)?.label ?? "Unknown";
}

export function documentOwnerLabel(document: DocumentWithOwner) {
  if (document.ownerType === "STUDENT") {
    return document.student
      ? `${document.student.fullName} (${document.student.admissionNumber})`
      : "Student not linked";
  }

  if (document.ownerType === "STAFF") {
    return document.staff
      ? `${document.staff.fullName} (${document.staff.employeeCode})`
      : "Staff not linked";
  }

  if (document.ownerType === "USER") {
    return document.user ? `${document.user.fullName} (${document.user.email})` : "User not linked";
  }

  return "School record";
}

export function formatFileSize(bytes?: number | null) {
  if (!bytes) {
    return "Not set";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}
