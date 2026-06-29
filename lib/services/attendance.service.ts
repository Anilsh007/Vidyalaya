import { AttendanceStatus, RoleCode, type Prisma } from "@prisma/client";

import { getMonthBounds, toDayBounds, toDateInput, toMonthInput } from "@/lib/attendance";
import { db } from "@/lib/db";
import type { SessionLike } from "@/lib/rbac/types";
import { getLinkedStudentIdForUser, getTeacherScope } from "@/lib/rbac/scope";

type AttendanceFilters = {
  schoolId: string;
  classId?: string;
  sectionId?: string;
  date?: string;
  month?: string;
  viewer?: SessionLike;
};

type SaveAttendanceInput = {
  schoolId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  date: string;
  entries: Array<{
    studentId: string;
    status: AttendanceStatus;
    remarks: string | null;
  }>;
};

function hasRole(viewer: SessionLike | undefined, role: RoleCode) {
  return viewer?.roles.includes(role) ?? false;
}

async function getScopedStudents(filters: AttendanceFilters, classId: string, sectionId: string) {
  const baseWhere: Prisma.StudentWhereInput = {
    schoolId: filters.schoolId,
    classId,
    sectionId,
    status: { not: "ARCHIVED" },
    isArchived: false
  };

  const viewer = filters.viewer;
  if (!viewer) {
    return db.student.findMany({
      where: baseWhere,
      orderBy: [{ rollNumber: "asc" }, { fullName: "asc" }]
    });
  }

  if ([RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.PRINCIPAL, RoleCode.DIRECTOR].some((role) => viewer.roles.includes(role))) {
    return db.student.findMany({
      where: baseWhere,
      orderBy: [{ rollNumber: "asc" }, { fullName: "asc" }]
    });
  }

  if (hasRole(viewer, RoleCode.STUDENT)) {
    const linkedStudentId = await getLinkedStudentIdForUser(viewer);
    return db.student.findMany({
      where: {
        ...baseWhere,
        id: linkedStudentId ?? "__no_student_link__"
      },
      orderBy: [{ rollNumber: "asc" }, { fullName: "asc" }]
    });
  }

  if (hasRole(viewer, RoleCode.PARENT)) {
    const wardLinks = await db.studentGuardian.findMany({
      where: {
        parent: { schoolId: filters.schoolId, userId: viewer.userId, isArchived: false }
      },
      select: { studentId: true }
    });

    return db.student.findMany({
      where: {
        ...baseWhere,
        id: { in: wardLinks.map((link) => link.studentId) }
      },
      orderBy: [{ rollNumber: "asc" }, { fullName: "asc" }]
    });
  }

  if ([RoleCode.TEACHER, RoleCode.HOD, RoleCode.EXAM_CONTROLLER].some((role) => viewer.roles.includes(role))) {
    const teacherScope = await getTeacherScope(viewer);
    if (!teacherScope.classIds.includes(classId) || !teacherScope.sectionIds.includes(sectionId)) {
      return [];
    }
  }

  return db.student.findMany({
    where: baseWhere,
    orderBy: [{ rollNumber: "asc" }, { fullName: "asc" }]
  });
}

export async function getAttendancePageData(filters: AttendanceFilters) {
  const viewer = filters.viewer;
  let classes = await db.schoolClass.findMany({
    where: { schoolId: filters.schoolId, isArchived: false },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
  });

  if (viewer && [RoleCode.TEACHER, RoleCode.HOD, RoleCode.EXAM_CONTROLLER].some((role) => viewer.roles.includes(role))) {
    const teacherScope = await getTeacherScope(viewer);
    classes = classes.filter((item) => teacherScope.classIds.includes(item.id));
  }

  const classId = filters.classId ?? classes[0]?.id ?? "";
  let sections = await db.section.findMany({
    where: {
      schoolId: filters.schoolId,
      ...(classId ? { classId } : {}),
      isArchived: false
    },
    orderBy: { name: "asc" }
  });

  if (viewer && [RoleCode.TEACHER, RoleCode.HOD, RoleCode.EXAM_CONTROLLER].some((role) => viewer.roles.includes(role))) {
    const teacherScope = await getTeacherScope(viewer);
    sections = sections.filter((item) => teacherScope.sectionIds.includes(item.id));
  }

  const sectionId = filters.sectionId ?? sections[0]?.id ?? "";
  const date = filters.date ?? toDateInput();
  const month = filters.month ?? toMonthInput();
  const selectedClass = classes.find((item) => item.id === classId) ?? classes[0];
  const selectedSection = sections.find((item) => item.id === sectionId) ?? sections[0];

  const students =
    selectedClass && selectedSection
      ? await getScopedStudents(filters, selectedClass.id, selectedSection.id)
      : [];

  const dayBounds = toDayBounds(date);
  const monthBounds = getMonthBounds(month);
  const dayAttendances = students.length
    ? await db.attendance.findMany({
        where: {
          schoolId: filters.schoolId,
          studentId: { in: students.map((student) => student.id) },
          date: {
            gte: dayBounds.start,
            lte: dayBounds.end
          }
        }
      })
    : [];

  const monthlyAttendances = students.length
    ? await db.attendance.findMany({
        where: {
          schoolId: filters.schoolId,
          studentId: { in: students.map((student) => student.id) },
          date: {
            gte: monthBounds.start,
            lte: monthBounds.end
          }
        },
        orderBy: [{ date: "asc" }]
      })
    : [];

  return {
    classes,
    sections,
    selectedClass,
    selectedSection,
    students,
    dayAttendances,
    monthlyAttendances,
    date,
    month
  };
}

export async function saveAttendanceSheet(input: SaveAttendanceInput) {
  const students = await db.student.findMany({
    where: {
      schoolId: input.schoolId,
      classId: input.classId,
      sectionId: input.sectionId,
      status: { not: "ARCHIVED" }
    },
    orderBy: [{ rollNumber: "asc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true
    }
  });

  if (!students.length) {
    throw new Error("No active students are assigned to this section.");
  }

  const entryMap = new Map(input.entries.map((entry) => [entry.studentId, entry]));
  const bounds = toDayBounds(input.date);
  const auditEntries: Array<{
    attendanceId: string;
    studentId: string;
    fullName: string;
    action: string;
    status: AttendanceStatus;
    remarks: string | null;
  }> = [];

  await db.$transaction(async (tx) => {
    for (const student of students) {
      const entry = entryMap.get(student.id);
      const statusValue = entry?.status ?? AttendanceStatus.PRESENT;
      const remarks = entry?.remarks ?? null;
      const existing = await tx.attendance.findFirst({
        where: {
          schoolId: input.schoolId,
          academicYearId: input.academicYearId,
          studentId: student.id,
          date: {
            gte: bounds.start,
            lte: bounds.end
          }
        }
      });

      if (existing) {
        const updated = await tx.attendance.update({
          where: { id: existing.id },
          data: {
            status: statusValue,
            remarks
          }
        });

        auditEntries.push({
          attendanceId: updated.id,
          studentId: student.id,
          fullName: student.fullName,
          action: "attendance.updated",
          status: updated.status,
          remarks
        });
      } else {
        const created = await tx.attendance.create({
          data: {
            schoolId: input.schoolId,
            academicYearId: input.academicYearId,
            studentId: student.id,
            date: bounds.start,
            status: statusValue,
            remarks
          }
        });

        auditEntries.push({
          attendanceId: created.id,
          studentId: student.id,
          fullName: student.fullName,
          action: "attendance.marked",
          status: created.status,
          remarks
        });
      }
    }
  });

  return {
    studentsCount: students.length,
    auditEntries
  };
}
