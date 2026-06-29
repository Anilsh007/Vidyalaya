"use server";

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { requireAnyPermission, requirePermission } from "@/lib/rbac/guards";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { saveNoticeRecord, toggleNoticePublish } from "@/lib/services/notices.service";
import { noticeSchema } from "@/lib/validations/notices";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || undefined;
}

export async function saveNoticeAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const isEditing = Boolean(getOptionalString(formData, "id"));
  const session = await requireAnyPermission(
    isEditing
      ? [RBAC_PERMISSIONS.noticesUpdate]
      : [RBAC_PERMISSIONS.noticesCreate, RBAC_PERMISSIONS.noticesUpdate]
  );
  const parsed = noticeSchema.safeParse({
    id: getOptionalString(formData, "id"),
    title: getString(formData, "title"),
    body: getString(formData, "body"),
    audienceType: getString(formData, "audienceType"),
    roleCode: getOptionalString(formData, "roleCode"),
    classId: getOptionalString(formData, "classId"),
    sectionId: getOptionalString(formData, "sectionId"),
    noticeType: getString(formData, "noticeType") || "NORMAL",
    expiresAt: getOptionalString(formData, "expiresAt")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the notice details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  try {
    const result = await saveNoticeRecord({
      schoolId: session.schoolId,
      createdById: session.userId,
      ...parsed.data
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: parsed.data.id ? "notice.updated" : "notice.created",
      entityType: "Notice",
      entityId: result.notice.id,
      metadata: {
        audienceType: parsed.data.audienceType,
        audienceLabel: result.audienceLabel,
        noticeType: parsed.data.noticeType
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/notices");

    return {
      status: "success",
      message: parsed.data.id ? "Notice updated." : "Notice created."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to save notice."
    };
  }
}

export async function toggleNoticePublishAction(formData: FormData) {
  const session = await requirePermission(RBAC_PERMISSIONS.noticesPublish);
  const noticeId = getString(formData, "noticeId");
  if (!noticeId) {
    return;
  }

  const result = await toggleNoticePublish({ schoolId: session.schoolId, noticeId });
  if (!result) {
    return;
  }

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: result.isPublishing ? "notice.published" : "notice.updated",
    entityType: "Notice",
    entityId: result.notice.id,
    metadata: { isPublished: result.isPublishing }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notices");
}
