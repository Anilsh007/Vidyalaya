import { toMoney, computeResultSummary, getGradeBands, parseGradeBandsText } from "@/lib/exams";
import { upsertSetting } from "@/lib/school";
import { db } from "@/lib/db";
import { getTeacherScope } from "@/lib/rbac/scope";
import type { SessionLike } from "@/lib/rbac/types";

type SaveExamInput = {
  schoolId: string;
  academicYearId: string;
  id?: string;
  name: string;
  classId?: string;
  examTerm: string;
  examType: string;
  startDate: string;
  endDate: string;
  subjects: Array<{
    subjectId: string;
    maxMarks: number;
    passMarks: number;
  }>;
};

type SaveMarksSheetInput = {
  schoolId: string;
  examId: string;
  sectionId: string;
  examSubjectId: string;
  teacherRemarks?: string | null;
  principalRemarks?: string | null;
  entries: Array<{
    studentId: string;
    marksObtained: number;
    remarks: string | null;
  }>;
};

type ViewerContext = SessionLike | null | undefined;

function isTeacherScopedViewer(viewer: ViewerContext) {
  if (!viewer) {
    return false;
  }

  return viewer.roles.some((role) => ["TEACHER", "HOD", "EXAM_CONTROLLER"].includes(role));
}

export async function getExamsPageData(schoolId: string, viewer?: ViewerContext) {
  const teacherScope = isTeacherScopedViewer(viewer) ? await getTeacherScope(viewer!) : null;
  const classFilter = teacherScope
    ? teacherScope.classIds.length
      ? { id: { in: teacherScope.classIds } }
      : { id: { in: ["__none__"] } }
    : {};
  const sectionFilter = teacherScope
    ? teacherScope.sectionIds.length
      ? { id: { in: teacherScope.sectionIds } }
      : { id: { in: ["__none__"] } }
    : {};
  const examFilter = teacherScope
    ? teacherScope.classIds.length
      ? { classId: { in: teacherScope.classIds } }
      : { classId: "__none__" }
    : {};

  const [classes, sections, subjects, exams, gradeBands] = await Promise.all([
    db.schoolClass.findMany({
      where: { schoolId, ...classFilter },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    }),
    db.section.findMany({
      where: { schoolId, ...sectionFilter },
      include: { class: true },
      orderBy: [{ class: { displayOrder: "asc" } }, { name: "asc" }]
    }),
    db.subject.findMany({
      where: { schoolId, ...(teacherScope?.classIds.length ? { classId: { in: teacherScope.classIds } } : {}) },
      orderBy: [{ name: "asc" }]
    }),
    db.exam.findMany({
      where: { schoolId, ...examFilter },
      include: {
        class: true,
        examSubjects: {
          include: { subject: true }
        },
        results: true
      },
      orderBy: [{ startDate: "desc" }]
    }),
    getGradeBands(schoolId)
  ]);

  return { classes, sections, subjects, exams, gradeBands };
}

export async function getExamWorkspaceData(input: {
  schoolId: string;
  viewer?: ViewerContext;
  examId?: string;
  examSubjectId?: string;
  sectionId?: string;
  studentId?: string;
}) {
  const { classes, sections, subjects, exams, gradeBands } = await getExamsPageData(input.schoolId, input.viewer);
  const teacherScope = isTeacherScopedViewer(input.viewer) ? await getTeacherScope(input.viewer!) : null;
  const selectedExam = exams.find((item) => item.id === input.examId) ?? exams[0];
  const examSubjects = selectedExam?.examSubjects ?? [];
  const selectedExamSubject =
    examSubjects.find((item) => item.id === input.examSubjectId) ?? examSubjects[0];
  const examClassId = selectedExam?.classId ?? "";
  const availableSections = examClassId
    ? sections.filter((section) => section.classId === examClassId)
    : sections;
  const selectedSection =
    availableSections.find((item) => item.id === input.sectionId) ?? availableSections[0];

  const students = selectedSection
    ? await db.student.findMany({
        where: {
          schoolId: input.schoolId,
          classId: selectedSection.classId,
          sectionId: selectedSection.id,
          status: { not: "ARCHIVED" }
        },
        orderBy: [{ rollNumber: "asc" }, { fullName: "asc" }]
      })
    : [];

  const existingMarks =
    selectedExam && selectedExamSubject
      ? await db.examMark.findMany({
          where: {
            examId: selectedExam.id,
            examSubjectId: selectedExamSubject.id,
            studentId: { in: students.map((student) => student.id) }
          }
        })
      : [];

  const existingResults = selectedExam
    ? await db.examResult.findMany({
        where: {
          examId: selectedExam.id,
          studentId: { in: students.map((student) => student.id) }
        }
      })
    : [];

  const marksMap = new Map(existingMarks.map((item) => [item.studentId, item]));
  const resultsMap = new Map(existingResults.map((item) => [item.studentId, item]));
  const selectedStudent = students.find((item) => item.id === input.studentId) ?? students[0];
  const selectedStudentResult = selectedStudent ? resultsMap.get(selectedStudent.id) : undefined;

  const studentResultHistory = selectedStudent
    ? await db.examResult.findMany({
        where: {
          studentId: selectedStudent.id,
          student: { schoolId: input.schoolId }
        },
        include: { exam: true },
        orderBy: [{ createdAt: "desc" }]
      })
    : [];

  const classResults = selectedExam
    ? await db.examResult.findMany({
        where: {
          examId: selectedExam.id,
          student: {
            schoolId: input.schoolId,
            ...(selectedSection
              ? { classId: selectedSection.classId, sectionId: selectedSection.id }
              : {})
          }
        },
        include: {
          student: true
        },
        orderBy: [{ percentage: "desc" }]
      })
    : [];

  const scopedStudents =
    teacherScope && !teacherScope.classIds.includes(selectedSection?.classId ?? "")
      ? []
      : students;
  const scopedStudentIds = new Set(scopedStudents.map((student) => student.id));
  const scopedClassResults = classResults.filter((result) => scopedStudentIds.has(result.studentId));
  const scopedSelectedStudent =
    selectedStudent && scopedStudentIds.has(selectedStudent.id) ? selectedStudent : scopedStudents[0];
  const scopedStudentHistory = scopedSelectedStudent
    ? studentResultHistory.filter((result) => result.studentId === scopedSelectedStudent.id)
    : [];
  const scopedMarksMap = new Map(
    Array.from(marksMap.entries()).filter(([studentId]) => scopedStudentIds.has(studentId))
  );
  const scopedResultsMap = new Map(
    Array.from(resultsMap.entries()).filter(([studentId]) => scopedStudentIds.has(studentId))
  );

  const passCount = scopedClassResults.filter((item) => item.resultStatus === "PASS").length;
  const failCount = scopedClassResults.filter((item) => item.resultStatus === "FAIL").length;
  const averagePercentage = scopedClassResults.length
    ? Number(
        (
          scopedClassResults.reduce((sum, item) => sum + Number(item.percentage), 0) / scopedClassResults.length
        ).toFixed(2)
      )
    : 0;

  return {
    classes,
    sections,
    subjects,
    exams,
    gradeBands,
    selectedExam,
    examSubjects,
    selectedExamSubject,
    availableSections,
    selectedSection,
    students: scopedStudents,
    marksMap: scopedMarksMap,
    resultsMap: scopedResultsMap,
    selectedStudent: scopedSelectedStudent,
    selectedStudentResult: scopedSelectedStudent ? scopedResultsMap.get(scopedSelectedStudent.id) : undefined,
    studentResultHistory: scopedStudentHistory,
    classResults: scopedClassResults,
    passCount,
    failCount,
    averagePercentage
  };
}

export async function saveExamRecord(input: SaveExamInput) {
  return db.$transaction(async (tx) => {
    const saved = input.id
      ? await tx.exam.update({
          where: { id: input.id },
          data: {
            name: input.name,
            classId: input.classId || null,
            examTerm: input.examTerm,
            examType: input.examType,
            startDate: new Date(`${input.startDate}T00:00:00.000Z`),
            endDate: new Date(`${input.endDate}T23:59:59.999Z`)
          }
        })
      : await tx.exam.create({
          data: {
            schoolId: input.schoolId,
            academicYearId: input.academicYearId,
            classId: input.classId || null,
            name: input.name,
            examTerm: input.examTerm,
            examType: input.examType,
            startDate: new Date(`${input.startDate}T00:00:00.000Z`),
            endDate: new Date(`${input.endDate}T23:59:59.999Z`)
          }
        });

    await tx.examSubject.deleteMany({
      where: { examId: saved.id }
    });

    await tx.examSubject.createMany({
      data: input.subjects.map((item) => ({
        examId: saved.id,
        subjectId: item.subjectId,
        maxMarks: toMoney(item.maxMarks),
        passMarks: toMoney(item.passMarks)
      }))
    });

    return saved;
  });
}

export async function saveGradeConfig(input: { schoolId: string; gradeConfig: string }) {
  const bands = parseGradeBandsText(input.gradeConfig);
  if (!bands.length) {
    throw new Error("Add grading rules using the format min:grade:PASS or FAIL.");
  }

  await db.$transaction(async (tx) => {
    await upsertSetting(tx, input.schoolId, "grading", "bands", bands);
  });

  return { bands };
}

export async function saveMarksSheet(input: SaveMarksSheetInput) {
  const exam = await db.exam.findFirst({
    where: { id: input.examId, schoolId: input.schoolId },
    include: {
      examSubjects: {
        include: { subject: true }
      }
    }
  });

  if (!exam) {
    throw new Error("Exam not found.");
  }

  const examSubject = exam.examSubjects.find((item) => item.id === input.examSubjectId);
  if (!examSubject) {
    throw new Error("Exam subject not found.");
  }

  const section = await db.section.findFirst({
    where: {
      id: input.sectionId,
      schoolId: input.schoolId
    },
    include: { class: true }
  });

  if (!section) {
    throw new Error("Section not found.");
  }

  const students = await db.student.findMany({
    where: {
      schoolId: input.schoolId,
      sectionId: section.id,
      classId: section.classId,
      status: { not: "ARCHIVED" }
    },
    orderBy: [{ rollNumber: "asc" }, { fullName: "asc" }]
  });

  const gradeBands = await getGradeBands(input.schoolId);
  const entryMap = new Map(input.entries.map((entry) => [entry.studentId, entry]));

  await db.$transaction(async (tx) => {
    for (const student of students) {
      const entry = entryMap.get(student.id);
      const marksValue = entry?.marksObtained ?? 0;
      const subjectRemarks = entry?.remarks ?? null;
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

      const totalMarks = allMarks.reduce((sum, item) => sum + Number(item.examSubject.maxMarks), 0);
      const obtainedMarks = allMarks.reduce((sum, item) => sum + Number(item.marksObtained), 0);
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
          teacherRemarks: input.teacherRemarks ?? null,
          principalRemarks: input.principalRemarks ?? null
        },
        create: {
          examId: exam.id,
          studentId: student.id,
          totalMarks: toMoney(totalMarks),
          obtainedMarks: toMoney(obtainedMarks),
          percentage: toMoney(summary.percentage),
          grade: summary.grade,
          resultStatus: summary.resultStatus,
          teacherRemarks: input.teacherRemarks ?? null,
          principalRemarks: input.principalRemarks ?? null
        }
      });
    }
  });

  return {
    exam,
    examSubject,
    section,
    studentsCount: students.length
  };
}
