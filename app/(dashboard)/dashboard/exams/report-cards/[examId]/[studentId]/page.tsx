import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { PrintButton } from "@/components/ui/print-button";
import { ReportCardTemplate } from "@/components/shared/report-card-template";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

type Params = Promise<{ examId: string; studentId: string }>;

export default async function ReportCardPage({ params }: { params: Params }) {
  const session = await requirePermission(PERMISSIONS.viewExams);
  const { examId, studentId } = await params;

  const [exam, student, result, settings] = await Promise.all([
    db.exam.findFirst({
      where: { id: examId, schoolId: session.schoolId },
      include: {
        examSubjects: {
          include: { subject: true }
        }
      }
    }),
    db.student.findFirst({
      where: { id: studentId, schoolId: session.schoolId },
      include: {
        class: true,
        section: true,
        school: true
      }
    }),
    db.examResult.findFirst({
      where: {
        examId,
        studentId
      }
    }),
    db.setting.findMany({
      where: {
        schoolId: session.schoolId,
        category: "report_card"
      }
    })
  ]);

  if (!exam || !student || !result) {
    notFound();
  }

  const marks = await db.examMark.findMany({
    where: {
      examId: exam.id,
      studentId: student.id
    },
    include: {
      examSubject: true,
      subject: true
    },
    orderBy: { subject: { name: "asc" } }
  });

  const settingsMap = new Map(settings.map((item) => [item.key, item.value]));
  const reportTitle =
    (typeof settingsMap.get("title") === "string" ? settingsMap.get("title") : null) ??
    "Progress Report";
  const principalSignatureLabel =
    (typeof settingsMap.get("principalSignatureLabel") === "string"
      ? settingsMap.get("principalSignatureLabel")
      : null) ?? "Principal";
  const schoolAddress = [
    student.school.addressLine1,
    student.school.addressLine2,
    student.school.city,
    student.school.state,
    student.school.postalCode,
    student.school.country
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Report card"
        title={`${student.fullName} • ${exam.name}`}
        description="Printable report card generated from the saved exam marks and result summary."
        actions={<PrintButton />}
      />
      <ReportCardTemplate
        schoolName={student.school.name}
        schoolAddress={schoolAddress || "Address not configured"}
        reportTitle={reportTitle}
        studentName={student.fullName}
        classSection={[student.class?.name, student.section?.name].filter(Boolean).join(" - ") || "Class not assigned"}
        admissionNumber={student.admissionNumber}
        examName={exam.name}
        examTerm={exam.examTerm ?? "Exam term not set"}
        examType={exam.examType ?? "Exam type not set"}
        generatedOn={new Date()}
        rows={marks.map((mark) => ({
          subject: mark.subject.name,
          maxMarks: Number(mark.examSubject.maxMarks),
          passMarks: Number(mark.examSubject.passMarks),
          obtainedMarks: Number(mark.marksObtained),
          remarks: mark.remarks
        }))}
        totalMarks={Number(result.totalMarks)}
        obtainedMarks={Number(result.obtainedMarks)}
        percentage={Number(result.percentage)}
        grade={result.grade}
        resultStatus={result.resultStatus}
        teacherRemarks={result.teacherRemarks}
        principalRemarks={result.principalRemarks}
        principalSignatureLabel={principalSignatureLabel}
      />
    </div>
  );
}
