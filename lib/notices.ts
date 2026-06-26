import { NoticeAudienceType } from "@prisma/client";
import { z } from "zod";

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
  },
  sessionRoles: string[]
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
    return sessionRoles.some((role) =>
      ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "TEACHER", "ACCOUNTANT"].includes(role)
    );
  }

  return false;
}

export function noticeTypeTone(noticeType: string) {
  return noticeType === "IMPORTANT"
    ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-slate-100 text-slate-700 border-slate-200";
}
