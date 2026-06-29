import { NoticeAudienceType } from "@prisma/client";
import { z } from "zod";

import { isStaffRole } from "@/lib/rbac/roles";

export const noticeSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Notice title is required."),
  body: z.string().trim().min(10, "Notice body is required."),
  audienceType: z.nativeEnum(NoticeAudienceType),
  roleCode: z.string().trim().optional(),
  classId: z.string().trim().optional(),
  sectionId: z.string().trim().optional(),
  noticeType: z.enum(["NORMAL", "IMPORTANT"]),
  expiresAt: z.string().trim().optional()
});

export function isNoticeVisibleToSession(
  notice: {
    audienceType: NoticeAudienceType;
    roleCode?: string | null;
    isPublished: boolean;
    classId?: string | null;
    sectionId?: string | null;
  },
  sessionRoles: string[],
  scope?: {
    classIds?: string[];
    sectionIds?: string[];
    includeStudents?: boolean;
    includeParents?: boolean;
  }
) {
  if (!notice.isPublished) {
    return false;
  }

  if (notice.audienceType === NoticeAudienceType.ALL) {
    return true;
  }

  if (notice.audienceType === NoticeAudienceType.ROLE) {
    return notice.roleCode ? sessionRoles.includes(notice.roleCode) : false;
  }

  if (notice.audienceType === NoticeAudienceType.STAFF) {
    return sessionRoles.some((role) => isStaffRole(role));
  }

  if (notice.audienceType === NoticeAudienceType.STUDENTS) {
    return scope?.includeStudents ?? false;
  }

  if (notice.audienceType === NoticeAudienceType.PARENTS) {
    return scope?.includeParents ?? false;
  }

  if (notice.audienceType === NoticeAudienceType.CLASS) {
    return notice.classId ? (scope?.classIds ?? []).includes(notice.classId) : false;
  }

  if (notice.audienceType === NoticeAudienceType.SECTION) {
    return notice.sectionId ? (scope?.sectionIds ?? []).includes(notice.sectionId) : false;
  }

  return false;
}

export function noticeTypeTone(noticeType: string) {
  return noticeType === "IMPORTANT"
    ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-slate-100 text-slate-700 border-slate-200";
}
