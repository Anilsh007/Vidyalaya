"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { requireAnyPermission, requirePermission } from "@/lib/rbac/guards";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { archiveDocumentRecord, saveDocumentRecord } from "@/lib/services/documents.service";
import { documentSchema } from "@/lib/validations/documents";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function saveDocumentAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const isEditing = Boolean(getString(formData, "id"));
  const session = await requireAnyPermission(
    isEditing
      ? [RBAC_PERMISSIONS.documentsUpdate]
      : [RBAC_PERMISSIONS.documentsUpload, RBAC_PERMISSIONS.documentsUpdate]
  );
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

  try {
    const document = await saveDocumentRecord({
      schoolId: session.schoolId,
      ...parsed.data
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: parsed.data.id ? "document.updated" : "document.uploaded",
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

export async function archiveDocumentAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(RBAC_PERMISSIONS.documentsArchive);
  const documentId = getString(formData, "documentId");
  if (!documentId) {
    return { status: "error", message: "Document ID is required." };
  }

  const document = await archiveDocumentRecord({ schoolId: session.schoolId, documentId });
  if (!document) {
    return { status: "error", message: "Document record not found." };
  }

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

  return {
    status: "success",
    message: "Document archived."
  };
}

export async function archiveDocumentSubmitAction(formData: FormData) {
  await archiveDocumentAction(initialActionFormState, formData);
}
