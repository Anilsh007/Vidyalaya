"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { noticeSchema } from "@/lib/notices";
import { PERMISSIONS } from "@/lib/permissions";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || undefined;
}

function buildAudienceLabel(input: {
  audienceType: string;
  roleCode?: string;
  className?: string;
  sectionName?: string;
}) {
  if (input.audienceType === "ROLE") {
    return input.roleCode?.replaceAll("_", " ") ?? "Role";
  }

  if (input.audienceType === "CLASS") {
    return input.className ?? "Class";
  }

  if (input.audienceType === "SECTION") {
    return input.sectionName ?? "Section";
  }

  return input.audienceType.replaceAll("_", " ");
}

export async function saveNoticeAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageNotices);
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

  const data = parsed.data;
  const [schoolClass, section] = await Promise.all([
    data.classId
      ? db.schoolClass.findFirst({
          where: { id: data.classId, schoolId: session.schoolId }
        })
      : Promise.resolve(null),
    data.sectionId
      ? db.section.findFirst({
          where: { id: data.sectionId, schoolId: session.schoolId }
        })
      : Promise.resolve(null)
  ]);

  const audienceLabel = buildAudienceLabel({
    audienceType: data.audienceType,
    roleCode: data.roleCode,
    className: schoolClass?.name ?? undefined,
    sectionName: section?.name ?? undefined
  });

  const notice = data.id
    ? await db.notice.update({
        where: { id: data.id },
        data: {
          title: data.title,
          body: data.body,
          audienceType: data.audienceType,
          audienceLabel,
          roleCode: data.roleCode || null,
          classId: data.classId || null,
          sectionId: data.sectionId || null,
          noticeType: data.noticeType,
          expiresAt: data.expiresAt ? new Date(`${data.expiresAt}T23:59:59.999Z`) : null
        }
      })
    : await db.notice.create({
        data: {
          schoolId: session.schoolId,
          title: data.title,
          body: data.body,
          audienceType: data.audienceType,
          audienceLabel,
          roleCode: data.roleCode || null,
          classId: data.classId || null,
          sectionId: data.sectionId || null,
          noticeType: data.noticeType,
          expiresAt: data.expiresAt ? new Date(`${data.expiresAt}T23:59:59.999Z`) : null,
          createdById: session.userId
        }
      });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: data.id ? "notice.updated" : "notice.created",
    entityType: "Notice",
    entityId: notice.id,
    metadata: {
      audienceType: data.audienceType,
      audienceLabel,
      noticeType: data.noticeType
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notices");

  return {
    status: "success",
    message: data.id ? "Notice updated." : "Notice created."
  };
}

export async function toggleNoticePublishAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.manageNotices);
  const noticeId = getString(formData, "noticeId");

  const notice = await db.notice.findFirst({
    where: { id: noticeId, schoolId: session.schoolId }
  });

  if (!notice) {
    return;
  }

  const isPublishing = !notice.isPublished;

  await db.notice.update({
    where: { id: notice.id },
    data: {
      isPublished: isPublishing,
      publishedAt: isPublishing ? new Date() : null
    }
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: isPublishing ? "notice.published" : "notice.unpublished",
    entityType: "Notice",
    entityId: notice.id
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notices");
}
