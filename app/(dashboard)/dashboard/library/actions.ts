"use server";

import { revalidatePath } from "next/cache";
import { LibraryIssueStatus, Prisma } from "@prisma/client";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { libraryBookSchema, libraryIssueSchema, libraryReturnSchema } from "@/lib/library";
import { PERMISSIONS } from "@/lib/permissions";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || undefined;
}

export async function saveLibraryBookAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageLibrary);
  const parsed = libraryBookSchema.safeParse({
    id: getOptionalString(formData, "id"),
    accessionNumber: getString(formData, "accessionNumber"),
    title: getString(formData, "title"),
    author: getString(formData, "author"),
    category: getString(formData, "category"),
    publisher: getString(formData, "publisher"),
    isbn: getString(formData, "isbn"),
    shelfLocation: getString(formData, "shelfLocation"),
    totalCopies: getString(formData, "totalCopies") || "1",
    availableCopies: getString(formData, "availableCopies") || "0"
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the book details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;
  if (data.availableCopies > data.totalCopies) {
    return {
      status: "error",
      message: "Available copies cannot be greater than total copies.",
      fieldErrors: { availableCopies: ["Available copies cannot be greater than total copies."] }
    };
  }

  try {
    const book = data.id
      ? await (async () => {
          const existing = await db.libraryBook.findFirst({
            where: { id: data.id, schoolId: session.schoolId },
            select: { id: true }
          });

          if (!existing) {
            throw new Error("Book not found.");
          }

          return db.libraryBook.update({
            where: { id: existing.id },
            data: {
              accessionNumber: data.accessionNumber,
              title: data.title,
              author: data.author || null,
              category: data.category || null,
              publisher: data.publisher || null,
              isbn: data.isbn || null,
              shelfLocation: data.shelfLocation || null,
              totalCopies: data.totalCopies,
              availableCopies: data.availableCopies,
              isArchived: false,
              archivedAt: null
            }
          });
        })()
      : await db.libraryBook.create({
          data: {
            schoolId: session.schoolId,
            accessionNumber: data.accessionNumber,
            title: data.title,
            author: data.author || null,
            category: data.category || null,
            publisher: data.publisher || null,
            isbn: data.isbn || null,
            shelfLocation: data.shelfLocation || null,
            totalCopies: data.totalCopies,
            availableCopies: data.availableCopies
          }
        });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: data.id ? "library.book.updated" : "library.book.created",
      entityType: "LibraryBook",
      entityId: book.id,
      metadata: { accessionNumber: book.accessionNumber, title: book.title }
    });

    revalidatePath("/dashboard/library");
    return { status: "success", message: data.id ? "Book updated." : "Book added." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to save book."
    };
  }
}

export async function archiveLibraryBookAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.manageLibrary);
  const bookId = getString(formData, "bookId");
  if (!bookId) return;

  const activeIssues = await db.libraryIssue.count({
    where: { schoolId: session.schoolId, bookId, status: LibraryIssueStatus.ISSUED }
  });

  if (activeIssues > 0) {
    return;
  }

  const book = await db.libraryBook.findFirst({
    where: { id: bookId, schoolId: session.schoolId },
    select: { id: true }
  });

  if (!book) return;

  await db.libraryBook.update({
    where: { id: book.id },
    data: { isArchived: true, archivedAt: new Date() }
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "library.book.archived",
    entityType: "LibraryBook",
    entityId: book.id
  });

  revalidatePath("/dashboard/library");
}

export async function issueLibraryBookAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageLibrary);
  const parsed = libraryIssueSchema.safeParse({
    bookId: getString(formData, "bookId"),
    borrowerType: getString(formData, "borrowerType") || "STUDENT",
    studentId: getOptionalString(formData, "studentId"),
    staffId: getOptionalString(formData, "staffId"),
    borrowerName: getString(formData, "borrowerName"),
    issueDate: getString(formData, "issueDate"),
    dueDate: getString(formData, "dueDate"),
    remarks: getString(formData, "remarks")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the issue details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;

  try {
    const issue = await db.$transaction(async (tx) => {
      const book = await tx.libraryBook.findFirst({
        where: { id: data.bookId, schoolId: session.schoolId, isArchived: false }
      });

      if (!book) {
        throw new Error("Book not found.");
      }

      if (book.availableCopies < 1) {
        throw new Error("No available copy is left for this book.");
      }

      let borrowerName = data.borrowerName?.trim() ?? "";
      if (data.borrowerType === "STUDENT") {
        const student = await tx.student.findFirst({
          where: { id: data.studentId, schoolId: session.schoolId },
          select: { fullName: true }
        });
        if (!student) throw new Error("Student borrower not found.");
        borrowerName = student.fullName;
      }

      if (data.borrowerType === "STAFF") {
        const staff = await tx.staff.findFirst({
          where: { id: data.staffId, schoolId: session.schoolId },
          select: { fullName: true }
        });
        if (!staff) throw new Error("Staff borrower not found.");
        borrowerName = staff.fullName;
      }

      await tx.libraryBook.update({
        where: { id: book.id },
        data: { availableCopies: { decrement: 1 } }
      });

      return tx.libraryIssue.create({
        data: {
          schoolId: session.schoolId,
          bookId: book.id,
          studentId: data.borrowerType === "STUDENT" ? data.studentId : null,
          staffId: data.borrowerType === "STAFF" ? data.staffId : null,
          borrowerName,
          borrowerType: data.borrowerType,
          issueDate: new Date(`${data.issueDate}T00:00:00.000Z`),
          dueDate: new Date(`${data.dueDate}T23:59:59.999Z`),
          remarks: data.remarks || null
        }
      });
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "library.book.issued",
      entityType: "LibraryIssue",
      entityId: issue.id,
      metadata: { bookId: data.bookId, borrowerName: issue.borrowerName }
    });

    revalidatePath("/dashboard/library");
    return { status: "success", message: "Book issued successfully." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to issue book."
    };
  }
}

export async function returnLibraryBookAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageLibrary);
  const parsed = libraryReturnSchema.safeParse({
    issueId: getString(formData, "issueId"),
    fineAmount: getString(formData, "fineAmount"),
    remarks: getString(formData, "remarks")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the return details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;

  try {
    const issue = await db.$transaction(async (tx) => {
      const existing = await tx.libraryIssue.findFirst({
        where: { id: data.issueId, schoolId: session.schoolId, status: LibraryIssueStatus.ISSUED },
        include: { book: true }
      });

      if (!existing) {
        throw new Error("Active issue record not found.");
      }

      await tx.libraryBook.update({
        where: { id: existing.bookId },
        data: { availableCopies: { increment: 1 } }
      });

      return tx.libraryIssue.update({
        where: { id: existing.id },
        data: {
          status: LibraryIssueStatus.RETURNED,
          returnedAt: new Date(),
          fineAmount:
            data.fineAmount === undefined || data.fineAmount === ""
              ? new Prisma.Decimal(0)
              : new Prisma.Decimal(data.fineAmount),
          remarks: data.remarks || existing.remarks
        }
      });
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "library.book.returned",
      entityType: "LibraryIssue",
      entityId: issue.id
    });

    revalidatePath("/dashboard/library");
    return { status: "success", message: "Book return recorded." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to return book."
    };
  }
}
