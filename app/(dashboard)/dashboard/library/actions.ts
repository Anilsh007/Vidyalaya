"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import {
  archiveLibraryBook,
  issueLibraryBook,
  returnLibraryBook,
  saveLibraryBook
} from "@/lib/services/library.service";
import { libraryBookSchema, libraryIssueSchema, libraryReturnSchema } from "@/lib/validations/library";

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
    const book = await saveLibraryBook({
      schoolId: session.schoolId,
      id: data.id,
      accessionNumber: data.accessionNumber,
      title: data.title,
      author: data.author,
      category: data.category,
      publisher: data.publisher,
      isbn: data.isbn,
      shelfLocation: data.shelfLocation,
      totalCopies: data.totalCopies,
      availableCopies: data.availableCopies
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
  const book = await archiveLibraryBook({ schoolId: session.schoolId, bookId });

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
    const issue = await issueLibraryBook({
      schoolId: session.schoolId,
      bookId: data.bookId,
      borrowerType: data.borrowerType,
      studentId: data.studentId,
      staffId: data.staffId,
      borrowerName: data.borrowerName,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      remarks: data.remarks
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
    const issue = await returnLibraryBook({
      schoolId: session.schoolId,
      issueId: data.issueId,
      fineAmount: data.fineAmount,
      remarks: data.remarks
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
