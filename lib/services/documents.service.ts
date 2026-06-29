import { DocumentOwnerType } from "@prisma/client";

import { db } from "@/lib/db";

type DocumentListFilters = {
  schoolId: string;
  query?: string;
  ownerType?: string;
  status?: string;
  sort?: string;
};

type SaveDocumentInput = {
  schoolId: string;
  id?: string;
  ownerType: string;
  studentId?: string;
  staffId?: string;
  userId?: string;
  title: string;
  fileName: string;
  filePath: string;
  mimeType?: string;
  fileSizeBytes?: string | number;
};

export async function getDocumentsPageData(filters: DocumentListFilters) {
  const query = filters.query?.trim() ?? "";
  const ownerType = filters.ownerType ?? "";
  const status = filters.status ?? "active";
  const sort = filters.sort ?? "recent";

  const documents = await db.document.findMany({
    where: {
      schoolId: filters.schoolId,
      ...(status === "archived" ? { isArchived: true } : status === "all" ? {} : { isArchived: false }),
      ...(ownerType ? { ownerType: ownerType as DocumentOwnerType } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { fileName: { contains: query, mode: "insensitive" } },
              { filePath: { contains: query, mode: "insensitive" } },
              { student: { is: { fullName: { contains: query, mode: "insensitive" } } } },
              { staff: { is: { fullName: { contains: query, mode: "insensitive" } } } },
              { user: { is: { fullName: { contains: query, mode: "insensitive" } } } }
            ]
          }
        : {})
    },
    include: { student: true, staff: true, user: true },
    orderBy:
      sort === "title-asc"
        ? { title: "asc" }
        : sort === "owner-asc"
          ? { ownerType: "asc" }
          : { uploadedAt: "desc" }
  });

  return { documents };
}

export async function saveDocumentRecord(input: SaveDocumentInput) {
  const ownerType = input.ownerType as DocumentOwnerType;
  const ownerLinks = await resolveOwnerLinks(input.schoolId, ownerType, {
    studentId: input.studentId,
    staffId: input.staffId,
    userId: input.userId
  });

  const documentData = {
    ownerType,
    ...ownerLinks,
    title: input.title,
    fileName: input.fileName,
    filePath: input.filePath,
    mimeType: input.mimeType || null,
    fileSizeBytes:
      input.fileSizeBytes === "" || input.fileSizeBytes === undefined ? null : Number(input.fileSizeBytes)
  };

  if (input.id) {
    const existing = await db.document.findFirst({
      where: { id: input.id, schoolId: input.schoolId },
      select: { id: true }
    });

    if (!existing) {
      throw new Error("Document record not found.");
    }

    return db.document.update({
      where: { id: input.id },
      data: documentData
    });
  }

  return db.document.create({
    data: {
      schoolId: input.schoolId,
      ...documentData
    }
  });
}

export async function archiveDocumentRecord(input: { schoolId: string; documentId: string }) {
  const document = await db.document.findFirst({
    where: { id: input.documentId, schoolId: input.schoolId },
    select: { id: true, title: true }
  });

  if (!document) {
    return null;
  }

  await db.document.update({
    where: { id: document.id },
    data: { isArchived: true, archivedAt: new Date() }
  });

  return document;
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
