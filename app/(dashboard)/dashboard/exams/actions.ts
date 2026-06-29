"use server";

import { revalidatePath } from "next/cache";
import { RoleCode } from "@prisma/client";

import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { hasAnyRole, requireAnyPermission, requirePermission } from "@/lib/rbac/guards";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { teacherCanAccessAssignedClass } from "@/lib/rbac/scope";
import {
  getExamsPageData,
  saveExamRecord,
  saveGradeConfig,
  saveMarksSheet
} from "@/lib/services/exams.service";
import { getCurrentAcademicYear } from "@/lib/school";
import { examSchema, gradeConfigSchema, marksSheetSchema } from "@/lib/validations/exams";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || undefined;
}

export async function saveExamAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const isEditing = Boolean(getOptionalString(formData, "id"));
  const session = await requireAnyPermission(
    isEditing
      ? [RBAC_PERMISSIONS.examsUpdate]
      : [RBAC_PERMISSIONS.examsCreate, RBAC_PERMISSIONS.examsUpdate]
  );
  const academicYear = await getCurrentAcademicYear(session.schoolId);

  if (!academicYear) {
    return { status: "error", message: "Create an academic year before adding exams." };
  }

  const parsed = examSchema.safeParse({
    id: getOptionalString(formData, "id"),
    name: getString(formData, "name"),
    classId: getOptionalString(formData, "classId"),
    examTerm: getString(formData, "examTerm"),
    examType: getString(formData, "examType"),
    startDate: getString(formData, "startDate"),
    endDate: getString(formData, "endDate")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the exam details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  if (new Date(parsed.data.startDate) > new Date(parsed.data.endDate)) {
    return {
      status: "error",
      message: "Exam end date must be after the start date."
    };
  }

  if (
    parsed.data.classId &&
    hasAnyRole(session, [RoleCode.TEACHER, RoleCode.HOD, RoleCode.EXAM_CONTROLLER])
  ) {
    const canAccess = await teacherCanAccessAssignedClass(session, parsed.data.classId);
    if (!canAccess) {
      return {
        status: "error",
        message: "You can only manage exams for your assigned class."
      };
    }
  }

  const subjectCodes = formData
    .getAll("subjectCode")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const maxMarksValues = formData
    .getAll("maxMarks")
    .map((value) => Number(String(value) || 0));
  const passMarksValues = formData
    .getAll("passMarks")
    .map((value) => Number(String(value) || 0));

  const subjectsInput = subjectCodes
    .map((subjectId, index) => ({
      subjectId,
      maxMarks: maxMarksValues[index] ?? 0,
      passMarks: passMarksValues[index] ?? 0
    }))
    .filter((item) => item.subjectId && item.maxMarks > 0 && item.passMarks >= 0);

  if (!subjectsInput.length) {
    return {
      status: "error",
      message: "Add at least one exam subject with maximum and passing marks."
    };
  }

  try {
    const exam = await saveExamRecord({
      schoolId: session.schoolId,
      academicYearId: academicYear.id,
      ...parsed.data,
      subjects: subjectsInput
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: parsed.data.id ? "exam.updated" : "exam.created",
      entityType: "Exam",
      entityId: exam.id,
      metadata: {
        classId: parsed.data.classId || null,
        examTerm: parsed.data.examTerm,
        examType: parsed.data.examType,
        subjectCount: subjectsInput.length
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/exams");

    return {
      status: "success",
      message: parsed.data.id ? "Exam updated." : "Exam created."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to save exam."
    };
  }
}

export async function saveGradeConfigAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(RBAC_PERMISSIONS.examsMarksModerate);
  const parsed = gradeConfigSchema.safeParse({
    gradeConfig: getString(formData, "gradeConfig")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the grading configuration.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  try {
    const result = await saveGradeConfig({
      schoolId: session.schoolId,
      gradeConfig: parsed.data.gradeConfig
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "exam.updated",
      entityType: "Setting",
      metadata: { subtype: "grading.updated", bands: result.bands }
    });

    revalidatePath("/dashboard/exams");

    return {
      status: "success",
      message: "Grading configuration updated."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to save grading."
    };
  }
}

export async function saveMarksSheetAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requireAnyPermission([
    RBAC_PERMISSIONS.examsMarksEntry,
    RBAC_PERMISSIONS.examsMarksModerate
  ]);
  const parsed = marksSheetSchema.safeParse({
    examId: getString(formData, "examId"),
    sectionId: getString(formData, "sectionId"),
    examSubjectId: getString(formData, "examSubjectId")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Select the exam, section, and subject before saving marks.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const pageData = await getExamsPageData(session.schoolId);
  const selectedExam = pageData.exams.find((item) => item.id === parsed.data.examId);
  if (
    selectedExam?.classId &&
    hasAnyRole(session, [RoleCode.TEACHER, RoleCode.HOD, RoleCode.EXAM_CONTROLLER])
  ) {
    const canAccess = await teacherCanAccessAssignedClass(session, selectedExam.classId);
    if (!canAccess) {
      return {
        status: "error",
        message: "You can only enter marks for your assigned class."
      };
    }
  }

  const entries = Array.from(new Set(
    Array.from(formData.keys())
      .filter((key) => key.startsWith("marks_"))
      .map((key) => key.replace("marks_", ""))
  )).map((studentId) => ({
    studentId,
    marksObtained: Number(getString(formData, `marks_${studentId}`) || 0),
    remarks: getString(formData, `remarks_${studentId}`).trim() || null
  }));

  try {
    const result = await saveMarksSheet({
      schoolId: session.schoolId,
      examId: parsed.data.examId,
      sectionId: parsed.data.sectionId,
      examSubjectId: parsed.data.examSubjectId,
      teacherRemarks: getString(formData, "teacherRemarks").trim() || null,
      principalRemarks: getString(formData, "principalRemarks").trim() || null,
      entries
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "exam.marks_saved",
      entityType: "Exam",
      entityId: result.exam.id,
      metadata: {
        sectionId: result.section.id,
        examSubjectId: result.examSubject.id,
        subjectId: result.examSubject.subjectId,
        studentCount: result.studentsCount
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/exams");
    revalidatePath("/dashboard/students");

    return {
      status: "success",
      message: `Marks saved for ${result.studentsCount} student${result.studentsCount === 1 ? "" : "s"}.`
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to save marks."
    };
  }
}
