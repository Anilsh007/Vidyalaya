import Link from "next/link";
import { ClipboardPenLine, FileChartColumnIncreasing, GraduationCap, ScrollText } from "lucide-react";
import type { ReactNode } from "react";

import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/school/empty-state";
import { ExamForm, GradeConfigForm, MarksEntryForm } from "@/components/exams/exam-forms";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { gradeBandsToText } from "@/lib/exams";
import { requireAnyPermission } from "@/lib/rbac/guards";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { getExamWorkspaceData } from "@/lib/services/exams.service";
import { toDateInput } from "@/lib/school";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ExamsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const session = await requireAnyPermission([
    RBAC_PERMISSIONS.examsRead,
    RBAC_PERMISSIONS.examsReadOwn,
    RBAC_PERMISSIONS.examsReadChild,
    RBAC_PERMISSIONS.examsMarksEntry,
    RBAC_PERMISSIONS.examsMarksModerate,
    RBAC_PERMISSIONS.examsPublishResult
  ]);
  const params = await searchParams;

  const examId = asSingle(params.examId) ?? "";
  const examSubjectId = asSingle(params.examSubjectId) ?? "";
  const sectionId = asSingle(params.sectionId) ?? "";
  const studentResultId = asSingle(params.studentId) ?? "";
  const {
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
    students,
    marksMap,
    selectedStudent,
    selectedStudentResult,
    studentResultHistory,
    classResults,
    passCount,
    failCount,
    averagePercentage
  } = await getExamWorkspaceData({
    schoolId: session.schoolId,
    viewer: session,
    examId,
    examSubjectId,
    sectionId,
    studentId: studentResultId
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 5"
        title="Exams, marks, and report cards"
        description="Set up exams and subjects, enter marks section-wise, compute grades and percentages, and print report cards from one academic workflow."
      />

      {!classes.length || !subjects.length ? (
        <EmptyState
          title="Classes and subjects are required first"
          description="Create the academic structure in school setup before adding exams and marks."
          action={
            <Link href="/dashboard/settings">
              <Button>Open school setup</Button>
            </Link>
          }
        />
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card>
              <CardHeader>
                <CardTitle>Exam setup</CardTitle>
                <p className="text-sm leading-6 text-slate-600">
                  Create exam plans with term, type, and subject-wise maximum and passing marks.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4">
                <ExamForm
                  classes={classes.map((item) => ({ id: item.id, name: item.name }))}
                  subjects={subjects.map((item) => ({
                    id: item.id,
                    name: item.name,
                    code: item.code,
                    classId: item.classId
                  }))}
                />

                {exams.length ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <Table>
                      <THead>
                        <tr>
                          <TH>Exam</TH>
                          <TH>Class</TH>
                          <TH>Term / type</TH>
                          <TH className="text-right">Edit</TH>
                        </tr>
                      </THead>
                      <TBody>
                        {exams.map((exam) => (
                          <tr key={exam.id}>
                            <TD>
                              <div className="grid gap-1">
                                <span className="font-medium text-slate-950">{exam.name}</span>
                                <span className="text-xs text-slate-500">
                                  {exam.startDate.toLocaleDateString("en-IN")} to{" "}
                                  {exam.endDate.toLocaleDateString("en-IN")}
                                </span>
                              </div>
                            </TD>
                            <TD>{exam.class?.name ?? "Common"}</TD>
                            <TD>{[exam.examTerm, exam.examType].filter(Boolean).join(" / ")}</TD>
                            <TD className="text-right">
                              <Dialog
                                title={`Edit ${exam.name}`}
                                description="Update the exam setup and subject rules."
                                triggerLabel="Edit"
                              >
                                <ExamForm
                                  classes={classes.map((item) => ({ id: item.id, name: item.name }))}
                                  subjects={subjects.map((item) => ({
                                    id: item.id,
                                    name: item.name,
                                    code: item.code,
                                    classId: item.classId
                                  }))}
                                  defaultValues={{
                                    id: exam.id,
                                    name: exam.name,
                                    classId: exam.classId,
                                    examTerm: exam.examTerm,
                                    examType: exam.examType,
                                    startDate: toDateInput(exam.startDate),
                                    endDate: toDateInput(exam.endDate),
                                    subjectConfig: Object.fromEntries(
                                      exam.examSubjects.map((item) => [
                                        item.subjectId,
                                        {
                                          maxMarks: Number(item.maxMarks),
                                          passMarks: Number(item.passMarks)
                                        }
                                      ])
                                    )
                                  }}
                                />
                              </Dialog>
                            </TD>
                          </tr>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configurable grading</CardTitle>
                <p className="text-sm leading-6 text-slate-600">
                  Keep grade cutoffs configurable so report cards stay practical for different school policies.
                </p>
              </CardHeader>
              <CardContent>
                <GradeConfigForm defaultText={gradeBandsToText(gradeBands)} />
              </CardContent>
            </Card>
          </section>

          {selectedExam ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Marks entry controls</CardTitle>
                  <p className="text-sm leading-6 text-slate-600">
                    Select the exam, section, and subject to open the marks entry sheet.
                  </p>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_220px_auto] lg:items-end">
                    <FormField label="Exam" htmlFor="examId">
                      <Select id="examId" name="examId" defaultValue={selectedExam.id}>
                        {exams.map((exam) => (
                          <option key={exam.id} value={exam.id}>
                            {exam.name}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Section" htmlFor="sectionId">
                      <Select id="sectionId" name="sectionId" defaultValue={selectedSection?.id ?? ""}>
                        {availableSections.map((section) => (
                          <option key={section.id} value={section.id}>
                            {section.class.name} - {section.name}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Subject" htmlFor="examSubjectId">
                      <Select id="examSubjectId" name="examSubjectId" defaultValue={selectedExamSubject?.id ?? ""}>
                        {examSubjects.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.subject.name}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Student history" htmlFor="studentId">
                      <Select id="studentId" name="studentId" defaultValue={selectedStudent?.id ?? ""}>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.fullName}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <Button type="submit">Load</Button>
                  </form>
                </CardContent>
              </Card>

              {selectedSection && selectedExamSubject && students.length ? (
                <MarksEntryForm
                  examId={selectedExam.id}
                  sectionId={selectedSection.id}
                  examSubjectId={selectedExamSubject.id}
                  subjectName={selectedExamSubject.subject.name}
                  maxMarks={Number(selectedExamSubject.maxMarks)}
                  students={students.map((student) => ({
                    id: student.id,
                    fullName: student.fullName,
                    rollNumber: student.rollNumber,
                    admissionNumber: student.admissionNumber,
                    marks: Number(marksMap.get(student.id)?.marksObtained ?? 0),
                    remarks: marksMap.get(student.id)?.remarks ?? ""
                  }))}
                  teacherRemarks={selectedStudentResult?.teacherRemarks}
                  principalRemarks={selectedStudentResult?.principalRemarks}
                />
              ) : (
                <EmptyState
                  title="Marks entry is waiting on a section and students"
                  description="Choose an exam with subjects and a section that has enrolled students."
                />
              )}

              <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Class result summary</CardTitle>
                    <p className="text-sm leading-6 text-slate-600">
                      Overall pass count, average score, and rank-style view for the selected exam and section.
                    </p>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <SummaryStat
                        icon={<GraduationCap className="h-5 w-5" />}
                        label="Pass"
                        value={String(passCount)}
                      />
                      <SummaryStat
                        icon={<ScrollText className="h-5 w-5" />}
                        label="Fail"
                        value={String(failCount)}
                      />
                      <SummaryStat
                        icon={<FileChartColumnIncreasing className="h-5 w-5" />}
                        label="Average %"
                        value={`${averagePercentage}%`}
                      />
                    </div>

                    {classResults.length ? (
                      <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <Table>
                          <THead>
                            <tr>
                              <TH>Student</TH>
                              <TH>Percentage</TH>
                              <TH>Grade</TH>
                              <TH>Result</TH>
                              <TH className="text-right">Report card</TH>
                            </tr>
                          </THead>
                          <TBody>
                            {classResults.map((result) => (
                              <tr key={result.id}>
                                <TD className="font-medium text-slate-950">{result.student.fullName}</TD>
                                <TD>{Number(result.percentage)}%</TD>
                                <TD>{result.grade}</TD>
                                <TD>{result.resultStatus}</TD>
                                <TD className="text-right">
                                  <Link href={`/dashboard/exams/report-cards/${selectedExam.id}/${result.studentId}`}>
                                    <Button variant="secondary" size="sm">
                                      View
                                    </Button>
                                  </Link>
                                </TD>
                              </tr>
                            ))}
                          </TBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                        No results have been computed for this exam and section yet.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Student result history</CardTitle>
                    <p className="text-sm leading-6 text-slate-600">
                      Result history for the selected student across available exams.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {selectedStudent && studentResultHistory.length ? (
                      <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <Table>
                          <THead>
                            <tr>
                              <TH>Exam</TH>
                              <TH>Percentage</TH>
                              <TH>Grade</TH>
                              <TH>Result</TH>
                            </tr>
                          </THead>
                          <TBody>
                            {studentResultHistory.map((result) => (
                              <tr key={result.id}>
                                <TD className="font-medium text-slate-950">{result.exam.name}</TD>
                                <TD>{Number(result.percentage)}%</TD>
                                <TD>{result.grade}</TD>
                                <TD>{result.resultStatus}</TD>
                              </tr>
                            ))}
                          </TBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                        No result history is available for the selected student yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </section>
            </>
          ) : (
            <EmptyState
              title="No exams yet"
              description="Create the first exam so subject rules, marks entry, and report cards can begin."
            />
          )}
        </>
      )}
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-700">
        {icon}
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
