import { RoleCode } from "@prisma/client";

import { db } from "@/lib/db";
import type { ScopeContext } from "@/lib/rbac/types";

const ADMIN_ROLES: RoleCode[] = [RoleCode.SUPER_ADMIN, RoleCode.ADMIN];
const ACADEMIC_STAFF_ROLES: RoleCode[] = [RoleCode.TEACHER, RoleCode.HOD, RoleCode.EXAM_CONTROLLER, RoleCode.PRINCIPAL, RoleCode.DIRECTOR];

function hasRole(context: ScopeContext, role: RoleCode) {
  return context.roles.includes(role);
}

function hasAnyRole(context: ScopeContext, roles: readonly RoleCode[]) {
  return roles.some((role) => hasRole(context, role));
}

function hasAdminAccess(context: ScopeContext) {
  return hasAnyRole(context, ADMIN_ROLES);
}

async function getLinkedStudent(context: ScopeContext) {
  return db.student.findFirst({
    where: {
      schoolId: context.schoolId,
      userId: context.userId,
      isArchived: false
    },
    select: {
      id: true,
      classId: true,
      sectionId: true
    }
  });
}

async function getParentLinkedStudents(context: ScopeContext) {
  return db.studentGuardian.findMany({
    where: {
      parent: {
        schoolId: context.schoolId,
        userId: context.userId,
        isArchived: false
      },
      student: {
        schoolId: context.schoolId,
        isArchived: false
      }
    },
    select: {
      studentId: true
    }
  });
}

async function getTeacherAssignmentScope(context: ScopeContext) {
  const staff = await db.staff.findFirst({
    where: {
      schoolId: context.schoolId,
      userId: context.userId,
      isArchived: false
    },
    select: {
      id: true,
      classTeacherFor: {
        select: {
          id: true,
          classId: true
        }
      }
    }
  });

  return {
    staffId: staff?.id ?? null,
    classIds: Array.from(new Set((staff?.classTeacherFor ?? []).map((section) => section.classId))),
    sectionIds: Array.from(new Set((staff?.classTeacherFor ?? []).map((section) => section.id)))
  };
}

export function canAccessOwnData(context: ScopeContext, targetUserId: string) {
  return context.userId === targetUserId;
}

export async function parentCanAccessChild(context: ScopeContext, studentId: string) {
  if (!hasRole(context, RoleCode.PARENT)) {
    return false;
  }

  const linkedStudentIds = await getParentLinkedStudentIds(context);
  const match = linkedStudentIds.includes(studentId);

  return Boolean(match);
}

export async function teacherCanAccessAssignedClass(context: ScopeContext, classId: string) {
  if (!hasAnyRole(context, ACADEMIC_STAFF_ROLES)) {
    return false;
  }

  const scope = await getTeacherAssignmentScope(context);
  return scope.classIds.includes(classId);
}

export async function teacherCanMarkAttendance(context: ScopeContext, classId: string, sectionId?: string) {
  if (!hasAnyRole(context, ACADEMIC_STAFF_ROLES)) {
    return false;
  }

  const scope = await getTeacherAssignmentScope(context);
  if (!scope.classIds.includes(classId)) {
    return false;
  }

  if (!sectionId) {
    return true;
  }

  return scope.sectionIds.includes(sectionId);
}

export async function teacherCanAccessStudent(context: ScopeContext, studentId: string) {
  if (!hasAnyRole(context, ACADEMIC_STAFF_ROLES)) {
    return false;
  }

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId: context.schoolId, isArchived: false },
    select: { classId: true, sectionId: true }
  });

  if (!student?.classId) {
    return false;
  }

  return teacherCanMarkAttendance(context, student.classId, student.sectionId ?? undefined);
}

export async function teacherCanAccessExam(context: ScopeContext, examId: string) {
  if (!hasAnyRole(context, ACADEMIC_STAFF_ROLES)) {
    return false;
  }

  const exam = await db.exam.findFirst({
    where: { id: examId, schoolId: context.schoolId, isArchived: false },
    select: { classId: true }
  });

  if (!exam?.classId) {
    return false;
  }

  return teacherCanAccessAssignedClass(context, exam.classId);
}

export async function canAccessStudent(context: ScopeContext, studentId: string) {
  if (hasAdminAccess(context)) {
    return true;
  }

  if (hasRole(context, RoleCode.STUDENT)) {
    const linkedStudent = await getLinkedStudent(context);
    return linkedStudent?.id === studentId;
  }

  if (hasRole(context, RoleCode.PARENT)) {
    return parentCanAccessChild(context, studentId);
  }

  if (hasAnyRole(context, ACADEMIC_STAFF_ROLES)) {
    return teacherCanAccessStudent(context, studentId);
  }

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId: context.schoolId, isArchived: false },
    select: { id: true }
  });
  return Boolean(student);
}

export async function canAccessStaff(context: ScopeContext, staffId: string) {
  if (hasAdminAccess(context) || hasRole(context, RoleCode.HR)) {
    return true;
  }

  const ownStaff = await db.staff.findFirst({
    where: { id: staffId, schoolId: context.schoolId, userId: context.userId, isArchived: false },
    select: { id: true }
  });
  return Boolean(ownStaff);
}

export async function canAccessClass(context: ScopeContext, classId: string) {
  if (hasAdminAccess(context)) {
    return true;
  }

  if (hasRole(context, RoleCode.STUDENT)) {
    const linkedStudent = await getLinkedStudent(context);
    return linkedStudent?.classId === classId;
  }

  if (hasRole(context, RoleCode.PARENT)) {
    const match = await db.studentGuardian.findFirst({
      where: {
        parent: { schoolId: context.schoolId, userId: context.userId, isArchived: false },
        student: { schoolId: context.schoolId, classId, isArchived: false }
      },
      select: { id: true }
    });
    return Boolean(match);
  }

  if (hasAnyRole(context, ACADEMIC_STAFF_ROLES)) {
    return teacherCanAccessAssignedClass(context, classId);
  }

  return false;
}

export async function canAccessSection(context: ScopeContext, sectionId: string) {
  if (hasAdminAccess(context)) {
    return true;
  }

  if (hasRole(context, RoleCode.STUDENT)) {
    const linkedStudent = await getLinkedStudent(context);
    return linkedStudent?.sectionId === sectionId;
  }

  if (hasRole(context, RoleCode.PARENT)) {
    const match = await db.studentGuardian.findFirst({
      where: {
        parent: { schoolId: context.schoolId, userId: context.userId, isArchived: false },
        student: { schoolId: context.schoolId, sectionId, isArchived: false }
      },
      select: { id: true }
    });
    return Boolean(match);
  }

  if (hasAnyRole(context, ACADEMIC_STAFF_ROLES)) {
    const scope = await getTeacherAssignmentScope(context);
    return scope.sectionIds.includes(sectionId);
  }

  return false;
}

export async function studentCanAccessDocument(context: ScopeContext, documentId: string) {
  if (!hasRole(context, RoleCode.STUDENT)) {
    return false;
  }

  const linkedStudent = await getLinkedStudent(context);
  if (!linkedStudent) {
    return false;
  }

  const document = await db.document.findFirst({
    where: {
      id: documentId,
      schoolId: context.schoolId,
      isArchived: false
    },
    select: {
      userId: true,
      studentId: true
    }
  });

  if (!document) {
    return false;
  }

  return document.userId === context.userId || document.studentId === linkedStudent.id;
}

export async function parentCanAccessDocument(context: ScopeContext, documentId: string) {
  if (!hasRole(context, RoleCode.PARENT)) {
    return false;
  }

  const document = await db.document.findFirst({
    where: {
      id: documentId,
      schoolId: context.schoolId,
      isArchived: false
    },
    select: {
      userId: true,
      studentId: true
    }
  });

  if (!document?.studentId) {
    return document?.userId === context.userId;
  }

  return parentCanAccessChild(context, document.studentId);
}

export async function getLinkedStudentIdForUser(context: ScopeContext) {
  const linkedStudent = await getLinkedStudent(context);
  return linkedStudent?.id ?? null;
}

export async function getLinkedStudentProfileForUser(context: ScopeContext) {
  return getLinkedStudent(context);
}

export async function getParentLinkedStudentIds(context: ScopeContext) {
  const links = await getParentLinkedStudents(context);
  return links.map((link) => link.studentId);
}

export async function getTeacherScope(context: ScopeContext) {
  return getTeacherAssignmentScope(context);
}
