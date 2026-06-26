"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  computeResultSummary,
  examSchema,
  getGradeBands,
  gradeConfigSchema,
  marksSheetSchema,
  parseGradeBandsText,
  toMoney
} from "@/lib/exams";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentAcademicYear, upsertSetting } from "@/lib/school";

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
  const session = await requirePermission(PERMISSIONS.manageExams);
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

  const data = parsed.data;
  if (new Date(data.startDate) > new Date(data.endDate)) {
    return {
      status: "error",
      message: "Exam end date must be after the start date."
    };
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

  const exam = await db.$transaction(async (tx) => {
    const saved = data.id
      ? await tx.exam.update({
          where: { id: data.id },
          data: {
            name: data.name,
            classId: data.classId || null,
            examTerm: data.examTerm,
            examType: data.examType,
            startDate: new Date(`${data.startDate}T00:00:00.000Z`),
            endDate: new Date(`${data.endDate}T23:59:59.999Z`)
          }
        })
      : await tx.exam.create({
          data: {
            schoolId: session.schoolId,
            academicYearId: academicYear.id,
            classId: data.classId || null,
            name: data.name,
            examTerm: data.examTerm,
            examType: data.examType,
            startDate: new Date(`${data.startDate}T00:00:00.000Z`),
            endDate: new Date(`${data.endDate}T23:59:59.999Z`)
          }
        });

    await tx.examSubject.deleteMany({
      where: { examId: saved.id }
    });

    await tx.examSubject.createMany({
      data: subjectsInput.map((item) => ({
        examId: saved.id,
        subjectId: item.subjectId,
        maxMarks: toMoney(item.maxMarks),
        passMarks: toMoney(item.passMarks)
      }))
    });

    return saved;
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: data.id ? "exam.updated" : "exam.created",
    entityType: "Exam",
    entityId: exam.id,
    metadata: {
      classId: data.classId || null,
      examTerm: data.examTerm,
      examType: data.examType,
      subjectCount: subjectsInput.length
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/exams");

  return {
    status: "success",
    message: data.id ? "Exam updated." : "Exam created."
  };
}

export async function saveGradeConfigAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageExams);
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

  const bands = parseGradeBandsText(parsed.data.gradeConfig);
  if (!bands.length) {
    return {
      status: "error",
      message: "Add grading rules using the format min:grade:PASS or FAIL."
    };
  }

  await db.$transaction(async (tx) => {
    await upsertSetting(tx, session.schoolId, "grading", "bands", bands);
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "grading.updated",
    entityType: "Setting",
    metadata: { bands }
  });

  revalidatePath("/dashboard/exams");

  return {
    status: "success",
    message: "Grading configuration updated."
  };
}

export async function saveMarksSheetAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageExams);
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

  const exam = await db.exam.findFirst({
    where: { id: parsed.data.examId, schoolId: session.schoolId },
    include: {
      examSubjects: {
        include: { subject: true }
      }
    }
  });

  if (!exam) {
    return { status: "error", message: "Exam not found." };
  }

  const examSubject = exam.examSubjects.find((item) => item.id === parsed.data.examSubjectId);
  if (!examSubject) {
    return { status: "error", message: "Exam subject not found." };
  }

  const section = await db.section.findFirst({
    where: {
      id: parsed.data.sectionId,
      schoolId: session.schoolId
    },
    include: { class: true }
  });

  if (!section) {
    return { status: "error", message: "Section not found." };
  }

  const students = await db.student.findMany({
    where: {
      schoolId: session.schoolId,
      sectionId: section.id,
      classId: section.classId,
      status: { not: "ARCHIVED" }
    },
    orderBy: [{ rollNumber: "asc" }, { fullName: "asc" }]
  });

  const gradeBands = await getGradeBands(session.schoolId);
  const teacherRemarks = getString(formData, "teacherRemarks").trim() || null;
  const principalRemarks = getString(formData, "principalRemarks").trim() || null;

  await db.$transaction(async (tx) => {
    for (const student of students) {
      const marksValue = Number(getString(formData, `marks_${student.id}`) || 0);
      const subjectRemarks = getString(formData, `remarks_${student.id}`).trim() || null;

      const safeMarks = Math.max(0, Math.min(marksValue, Number(examSubject.maxMarks)));

      await tx.examMark.upsert({
        where: {
          examSubjectId_studentId: {
            examSubjectId: examSubject.id,
            studentId: student.id
          }
        },
        update: {
          examId: exam.id,
          subjectId: examSubject.subjectId,
          marksObtained: toMoney(safeMarks),
          remarks: subjectRemarks
        },
        create: {
          examId: exam.id,
          examSubjectId: examSubject.id,
          subjectId: examSubject.subjectId,
          studentId: student.id,
          marksObtained: toMoney(safeMarks),
          remarks: subjectRemarks
        }
      });

      const allMarks = await tx.examMark.findMany({
        where: {
          examId: exam.id,
          studentId: student.id
        },
        include: {
          examSubject: true
        }
      });

      const totalMarks = allMarks.reduce(
        (sum, item) => sum + Number(item.examSubject.maxMarks),
        0
      );
      const obtainedMarks = allMarks.reduce(
        (sum, item) => sum + Number(item.marksObtained),
        0
      );
      const hasSubjectFailure = allMarks.some(
        (item) => Number(item.marksObtained) < Number(item.examSubject.passMarks)
      );
      const summary = computeResultSummary({
        obtainedMarks,
        totalMarks,
        hasSubjectFailure,
        bands: gradeBands
      });

      await tx.examResult.upsert({
        where: {
          examId_studentId: {
            examId: exam.id,
            studentId: student.id
          }
        },
        update: {
          totalMarks: toMoney(totalMarks),
          obtainedMarks: toMoney(obtainedMarks),
          percentage: toMoney(summary.percentage),
          grade: summary.grade,
          resultStatus: summary.resultStatus,
          teacherRemarks,
          principalRemarks
        },
        create: {
          examId: exam.id,
          studentId: student.id,
          totalMarks: toMoney(totalMarks),
          obtainedMarks: toMoney(obtainedMarks),
          percentage: toMoney(summary.percentage),
          grade: summary.grade,
          resultStatus: summary.resultStatus,
          teacherRemarks,
          principalRemarks
        }
      });
    }
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "exam_marks.saved",
    entityType: "Exam",
    entityId: exam.id,
    metadata: {
      sectionId: section.id,
      examSubjectId: examSubject.id,
      subjectId: examSubject.subjectId,
      studentCount: students.length
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/exams");
  revalidatePath("/dashboard/students");

  return {
    status: "success",
    message: `Marks saved for ${students.length} student${students.length === 1 ? "" : "s"}.`
  };
}
