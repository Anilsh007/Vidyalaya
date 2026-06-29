import { db } from "@/lib/db";

type SaveNoticeInput = {
  schoolId: string;
  createdById: string;
  id?: string;
  title: string;
  body: string;
  audienceType: string;
  roleCode?: string;
  classId?: string;
  sectionId?: string;
  noticeType: string;
  expiresAt?: string;
};

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

export async function getNoticesPageData(schoolId: string) {
  const [classes, sections, notices, roles] = await Promise.all([
    db.schoolClass.findMany({
      where: { schoolId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    }),
    db.section.findMany({
      where: { schoolId },
      orderBy: [{ name: "asc" }]
    }),
    db.notice.findMany({
      where: { schoolId },
      orderBy: [{ updatedAt: "desc" }]
    }),
    db.role.findMany({
      where: { schoolId },
      orderBy: { code: "asc" }
    })
  ]);

  return { classes, sections, notices, roles };
}

export async function saveNoticeRecord(input: SaveNoticeInput) {
  const [schoolClass, section] = await Promise.all([
    input.classId
      ? db.schoolClass.findFirst({
          where: { id: input.classId, schoolId: input.schoolId }
        })
      : Promise.resolve(null),
    input.sectionId
      ? db.section.findFirst({
          where: { id: input.sectionId, schoolId: input.schoolId }
        })
      : Promise.resolve(null)
  ]);

  const audienceLabel = buildAudienceLabel({
    audienceType: input.audienceType,
    roleCode: input.roleCode,
    className: schoolClass?.name ?? undefined,
    sectionName: section?.name ?? undefined
  });

  const notice = input.id
    ? await db.notice.update({
        where: { id: input.id },
        data: {
          title: input.title,
          body: input.body,
          audienceType: input.audienceType as never,
          audienceLabel,
          roleCode: input.roleCode || null,
          classId: input.classId || null,
          sectionId: input.sectionId || null,
          noticeType: input.noticeType as never,
          expiresAt: input.expiresAt ? new Date(`${input.expiresAt}T23:59:59.999Z`) : null
        }
      })
    : await db.notice.create({
        data: {
          schoolId: input.schoolId,
          title: input.title,
          body: input.body,
          audienceType: input.audienceType as never,
          audienceLabel,
          roleCode: input.roleCode || null,
          classId: input.classId || null,
          sectionId: input.sectionId || null,
          noticeType: input.noticeType as never,
          expiresAt: input.expiresAt ? new Date(`${input.expiresAt}T23:59:59.999Z`) : null,
          createdById: input.createdById
        }
      });

  return { notice, audienceLabel };
}

export async function toggleNoticePublish(input: { schoolId: string; noticeId: string }) {
  const notice = await db.notice.findFirst({
    where: { id: input.noticeId, schoolId: input.schoolId }
  });

  if (!notice) {
    return null;
  }

  const isPublishing = !notice.isPublished;

  await db.notice.update({
    where: { id: notice.id },
    data: {
      isPublished: isPublishing,
      publishedAt: isPublishing ? new Date() : null
    }
  });

  return { notice, isPublishing };
}
