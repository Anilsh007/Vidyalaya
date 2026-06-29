import { Gender, RoleCode, type Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import type { SessionLike } from "@/lib/rbac/types";
import { getLinkedStudentIdForUser, getTeacherScope } from "@/lib/rbac/scope";

type StudentListFilters = {
  schoolId: string;
  query?: string;
  classId?: string;
  sectionId?: string;
  status?: string;
  sort?: string;
  viewer?: SessionLike;
};

type SaveStudentInput = {
  schoolId: string;
  academicYearId: string;
  id?: string;
  firstName: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  admissionDate: string;
  admissionNumber: string;
  rollNumber?: string;
  status: string;
  classId?: string;
  sectionId?: string;
  address?: string;
  guardianName: string;
  relation: string;
  fatherName?: string;
  motherName?: string;
  guardianPhonePrimary: string;
  guardianPhoneSecondary?: string;
  guardianEmail?: string;
  occupation?: string;
};

function hasRole(viewer: SessionLike | undefined, role: RoleCode) {
  return viewer?.roles.includes(role) ?? false;
}

function isDefinedString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

async function buildStudentScope(filters: StudentListFilters): Promise<Prisma.StudentWhereInput> {
  const baseWhere: Prisma.StudentWhereInput = {
    schoolId: filters.schoolId,
    ...(filters.classId ? { classId: filters.classId } : {}),
    ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
    ...(filters.status ? { status: filters.status } : {})
  };

  const query = filters.query?.trim();
  if (query) {
    baseWhere.OR = [
      { fullName: { contains: query, mode: "insensitive" } },
      { admissionNumber: { contains: query, mode: "insensitive" } },
      { rollNumber: { contains: query, mode: "insensitive" } }
    ];
  }

  const viewer = filters.viewer;
  if (!viewer) {
    return baseWhere;
  }

  if (hasRole(viewer, RoleCode.SUPER_ADMIN) || hasRole(viewer, RoleCode.ADMIN) || hasRole(viewer, RoleCode.PRINCIPAL) || hasRole(viewer, RoleCode.DIRECTOR)) {
    return baseWhere;
  }

  if (hasRole(viewer, RoleCode.STUDENT)) {
    const linkedStudentId = await getLinkedStudentIdForUser(viewer);
    return {
      ...baseWhere,
      id: linkedStudentId ?? "__no_student_link__"
    };
  }

  if (hasRole(viewer, RoleCode.PARENT)) {
    const wardLinks = await db.studentGuardian.findMany({
      where: {
        parent: {
          schoolId: filters.schoolId,
          userId: viewer.userId,
          isArchived: false
        },
        student: {
          schoolId: filters.schoolId,
          isArchived: false
        }
      },
      select: { studentId: true }
    });

    return {
      ...baseWhere,
      id: { in: wardLinks.map((link) => link.studentId) }
    };
  }

  if ([RoleCode.TEACHER, RoleCode.HOD, RoleCode.EXAM_CONTROLLER].some((role) => viewer.roles.includes(role))) {
    const teacherScope = await getTeacherScope(viewer);
    return {
      ...baseWhere,
      classId: { in: teacherScope.classIds.length ? teacherScope.classIds : ["__no_class__"] },
      ...(teacherScope.sectionIds.length ? { sectionId: { in: teacherScope.sectionIds } } : {})
    };
  }

  return baseWhere;
}

function splitAddress(address?: string) {
  const parts = (address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    addressLine1: parts[0] ?? null,
    addressLine2: parts[1] ?? null,
    city: parts[2] ?? null,
    state: parts[3] ?? null,
    postalCode: parts[4] ?? null
  };
}

export async function getStudentsPageData(filters: StudentListFilters) {
  const studentWhere = await buildStudentScope(filters);
  const students = await db.student.findMany({
    where: studentWhere,
    include: {
      class: true,
      section: true,
      guardians: {
        where: { isPrimary: true },
        include: { parent: true },
        take: 1
      }
    },
    orderBy:
      filters.sort === "recent"
        ? { createdAt: "desc" }
        : filters.sort === "admission-asc"
          ? { admissionNumber: "asc" }
          : { fullName: "asc" }
  });

  const classIds = Array.from(new Set(students.map((student) => student.classId).filter(isDefinedString)));
  const sectionIds = Array.from(new Set(students.map((student) => student.sectionId).filter(isDefinedString)));

  const [classes, sections] = await Promise.all([
    db.schoolClass.findMany({
      where: {
        schoolId: filters.schoolId,
        ...(classIds.length ? { id: { in: classIds } } : {})
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    }),
    db.section.findMany({
      where: {
        schoolId: filters.schoolId,
        ...(sectionIds.length ? { id: { in: sectionIds } } : {})
      },
      include: { class: true },
      orderBy: [{ class: { displayOrder: "asc" } }, { name: "asc" }]
    })
  ]);

  return { classes, sections, students };
}

export async function saveStudentRecord(input: SaveStudentInput) {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ");
  const studentAddress = splitAddress(input.address);
  const duplicate = await db.student.findFirst({
    where: {
      schoolId: input.schoolId,
      admissionNumber: input.admissionNumber,
      ...(input.id ? { id: { not: input.id } } : {})
    },
    select: { id: true }
  });

  if (duplicate) {
    throw new Error("Admission number already exists in this school.");
  }

  return db.$transaction(async (tx) => {
    const parentData = {
      schoolId: input.schoolId,
      guardianName: input.guardianName,
      relation: input.relation,
      fatherName: input.fatherName || null,
      motherName: input.motherName || null,
      phonePrimary: input.guardianPhonePrimary,
      phoneSecondary: input.guardianPhoneSecondary || null,
      email: input.guardianEmail || null,
      occupation: input.occupation || null,
      ...studentAddress
    };

    if (input.id) {
      const existingStudent = await tx.student.findFirst({
        where: { id: input.id, schoolId: input.schoolId }
      });

      if (!existingStudent) {
        throw new Error("Student not found.");
      }

      const existingLink = await tx.studentGuardian.findFirst({
        where: {
          studentId: input.id,
          student: { schoolId: input.schoolId },
          isPrimary: true
        },
        include: { parent: true }
      });

      const student = await tx.student.update({
        where: { id: input.id },
        data: {
          academicYearId: input.academicYearId,
          firstName: input.firstName,
          lastName: input.lastName || null,
          fullName,
          gender: input.gender ? (input.gender as Gender) : null,
          dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null,
          admissionDate: new Date(`${input.admissionDate}T00:00:00.000Z`),
          admissionNumber: input.admissionNumber,
          rollNumber: input.rollNumber || null,
          status: input.status,
          classId: input.classId || null,
          sectionId: input.sectionId || null,
          ...studentAddress
        }
      });

      if (existingLink) {
        await tx.parent.update({
          where: { id: existingLink.parentId },
          data: parentData
        });
      } else {
        const parent = await tx.parent.create({ data: parentData });
        await tx.studentGuardian.create({
          data: {
            studentId: student.id,
            parentId: parent.id,
            isPrimary: true
          }
        });
      }

      return {
        studentId: student.id,
        created: false,
        fullName,
        admissionNumber: input.admissionNumber,
        classId: input.classId || null,
        sectionId: input.sectionId || null
      };
    }

    const parent = await tx.parent.create({ data: parentData });
    const student = await tx.student.create({
      data: {
        schoolId: input.schoolId,
        academicYearId: input.academicYearId,
        firstName: input.firstName,
        lastName: input.lastName || null,
        fullName,
        gender: input.gender ? (input.gender as Gender) : null,
        dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null,
        admissionDate: new Date(`${input.admissionDate}T00:00:00.000Z`),
        admissionNumber: input.admissionNumber,
        rollNumber: input.rollNumber || null,
        status: input.status,
        classId: input.classId || null,
        sectionId: input.sectionId || null,
        ...studentAddress
      }
    });

    await tx.studentGuardian.create({
      data: {
        studentId: student.id,
        parentId: parent.id,
        isPrimary: true
      }
    });

    return {
      studentId: student.id,
      created: true,
      fullName,
      admissionNumber: input.admissionNumber,
      classId: input.classId || null,
      sectionId: input.sectionId || null
    };
  });
}

export async function archiveStudentRecord(input: { schoolId: string; studentId: string }) {
  const student = await db.student.findFirst({
    where: { id: input.studentId, schoolId: input.schoolId },
    select: { id: true, fullName: true, admissionNumber: true }
  });

  if (!student) {
    return null;
  }

  await db.student.update({
    where: { id: student.id },
    data: { status: "ARCHIVED", archivedAt: new Date(), isArchived: true }
  });

  return student;
}
