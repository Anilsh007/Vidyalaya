"use server";

import { DocumentOwnerType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { documentSchema } from "@/lib/documents";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function saveDocumentAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageDocuments);
  const parsed = documentSchema.safeParse({
    id: getString(formData, "id") || undefined,
    ownerType: getString(formData, "ownerType"),
    studentId: getString(formData, "studentId"),
    staffId: getString(formData, "staffId"),
    userId: getString(formData, "userId"),
    title: getString(formData, "title"),
    fileName: getString(formData, "fileName"),
    filePath: getString(formData, "filePath"),
    mimeType: getString(formData, "mimeType"),
    fileSizeBytes: getString(formData, "fileSizeBytes")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the document details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;

  try {
    const ownerType = data.ownerType as DocumentOwnerType;
    const ownerLinks = await resolveOwnerLinks(session.schoolId, ownerType, {
      studentId: data.studentId,
      staffId: data.staffId,
      userId: data.userId
    });

    const documentData = {
      ownerType,
      ...ownerLinks,
      title: data.title,
      fileName: data.fileName,
      filePath: data.filePath,
      mimeType: data.mimeType || null,
      fileSizeBytes:
        data.fileSizeBytes === "" || data.fileSizeBytes === undefined ? null : Number(data.fileSizeBytes)
    };

    const document = data.id
      ? await (async () => {
          const existing = await db.document.findFirst({
            where: { id: data.id, schoolId: session.schoolId },
            select: { id: true }
          });

          if (!existing) {
            throw new Error("Document record not found.");
          }

          return db.document.update({
            where: { id: data.id },
            data: documentData
          });
        })()
      : await db.document.create({
          data: {
            schoolId: session.schoolId,
            ...documentData
          }
        });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: data.id ? "document.updated" : "document.created",
      entityType: "Document",
      entityId: document.id,
      metadata: {
        title: document.title,
        ownerType: document.ownerType,
        fileName: document.fileName
      }
    });

    revalidatePath("/dashboard/documents");
    revalidatePath(`/dashboard/documents/${document.id}`);
    redirect(`/dashboard/documents/${document.id}?saved=1`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save the document record.";
    return { status: "error", message };
  }
}

export async function archiveDocumentAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.manageDocuments);
  const documentId = getString(formData, "documentId");
  if (!documentId) {
    return;
  }

  const document = await db.document.findFirst({
    where: { id: documentId, schoolId: session.schoolId },
    select: { id: true, title: true }
  });

  if (!document) {
    return;
  }

  await db.document.update({
    where: { id: document.id },
    data: { isArchived: true, archivedAt: new Date() }
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "document.archived",
    entityType: "Document",
    entityId: document.id,
    metadata: { title: document.title }
  });

  revalidatePath("/dashboard/documents");
  revalidatePath(`/dashboard/documents/${document.id}`);
}

async function resolveOwnerLinks(
  schoolId: string,
  ownerType: DocumentOwnerType,
  ownerIds: { studentId?: string; staffId?: string; userId?: string }
) {
  if (ownerType === DocumentOwnerType.STUDENT) {
    const student = await db.student.findFirst({
      where: { id: ownerIds.studentId, schoolId },
      select: { id: true }
    });

    if (!student) {
      throw new Error("Selected student was not found.");
    }

    return { studentId: student.id, staffId: null, userId: null };
  }

  if (ownerType === DocumentOwnerType.STAFF) {
    const staff = await db.staff.findFirst({
      where: { id: ownerIds.staffId, schoolId },
      select: { id: true }
    });

    if (!staff) {
      throw new Error("Selected staff member was not found.");
    }

    return { studentId: null, staffId: staff.id, userId: null };
  }

  if (ownerType === DocumentOwnerType.USER) {
    const user = await db.user.findFirst({
      where: { id: ownerIds.userId, schoolId },
      select: { id: true }
    });

    if (!user) {
      throw new Error("Selected user account was not found.");
    }

    return { studentId: null, staffId: null, userId: user.id };
  }

  return { studentId: null, staffId: null, userId: null };
}
