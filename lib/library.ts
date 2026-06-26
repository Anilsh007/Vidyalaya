import { z } from "zod";

export const libraryBookSchema = z.object({
  id: z.string().optional(),
  accessionNumber: z.string().trim().min(2, "Accession number is required."),
  title: z.string().trim().min(2, "Book title is required."),
  author: z.string().trim().optional(),
  category: z.string().trim().optional(),
  publisher: z.string().trim().optional(),
  isbn: z.string().trim().optional(),
  shelfLocation: z.string().trim().optional(),
  totalCopies: z.coerce.number().int().min(1, "Total copies must be at least 1."),
  availableCopies: z.coerce.number().int().min(0, "Available copies cannot be negative.")
});

export const libraryIssueSchema = z
  .object({
    bookId: z.string().min(1, "Select a book."),
    borrowerType: z.enum(["STUDENT", "STAFF", "OTHER"]),
    studentId: z.string().optional(),
    staffId: z.string().optional(),
    borrowerName: z.string().trim().optional(),
    issueDate: z.string().trim().min(1, "Issue date is required."),
    dueDate: z.string().trim().min(1, "Due date is required."),
    remarks: z.string().trim().optional()
  })
  .refine((data) => new Date(data.dueDate) >= new Date(data.issueDate), {
    message: "Due date must be on or after issue date.",
    path: ["dueDate"]
  })
  .refine((data) => data.borrowerType !== "STUDENT" || Boolean(data.studentId), {
    message: "Select a student borrower.",
    path: ["studentId"]
  })
  .refine((data) => data.borrowerType !== "STAFF" || Boolean(data.staffId), {
    message: "Select a staff borrower.",
    path: ["staffId"]
  })
  .refine((data) => data.borrowerType !== "OTHER" || Boolean(data.borrowerName?.trim()), {
    message: "Enter borrower name.",
    path: ["borrowerName"]
  });

export const libraryReturnSchema = z.object({
  issueId: z.string().min(1, "Issue record is required."),
  fineAmount: z
    .union([z.literal(""), z.coerce.number().min(0, "Fine cannot be negative.")])
    .optional(),
  remarks: z.string().trim().optional()
});
