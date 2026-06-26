import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, PencilLine, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { archiveStudentAction } from "@/app/(dashboard)/dashboard/students/actions";
import { attendanceLabel } from "@/lib/attendance";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { toDateInput } from "@/lib/school";

type Params = Promise<{ studentId: string }>;

export default async function StudentProfilePage({ params }: { params: Params }) {
  const session = await requirePermission(PERMISSIONS.viewStudents);
  const { studentId } = await params;
  const student = await db.student.findFirst({
    where: { id: studentId, schoolId: session.schoolId },
    include: {
      class: true,
      section: true,
      guardians: {
        include: { parent: true },
        orderBy: { isPrimary: "desc" }
      }
    }
  });

  if (!student) {
    notFound();
  }

  const primaryGuardian = student.guardians[0]?.parent;
  const canViewAttendance = session.permissions.includes(PERMISSIONS.viewAttendance);
  const canViewExams = session.permissions.includes(PERMISSIONS.viewExams);
  const attendanceHistoryPromise = canViewAttendance
    ? db.attendance.findMany({
        where: {
          schoolId: session.schoolId,
          studentId: student.id
        },
        orderBy: { date: "desc" },
        take: 12
      })
    : Promise.resolve([]);
  const resultHistoryPromise = canViewExams
    ? db.examResult.findMany({
        where: {
          studentId: student.id,
          student: { schoolId: session.schoolId }
        },
        include: {
          exam: true
        },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    : Promise.resolve([]);

  const [auditLogs, attendanceHistory, resultHistory] = await Promise.all([
    db.auditLog.findMany({
      where: {
        schoolId: session.schoolId,
        entityType: "Student",
        entityId: student.id,
        action: {
          in: ["student.created", "student.updated", "student.archived"]
        }
      },
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    attendanceHistoryPromise,
    resultHistoryPromise
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Student profile"
        title={student.fullName}
        description="Review identity, admission data, class placement, and guardian details before making changes."
        actions={
          <div className="flex flex-wrap gap-3">
            {session.permissions.includes(PERMISSIONS.manageStudents) ? (
              <>
                <Link href={`/dashboard/students/${student.id}/edit`}>
                  <Button variant="secondary">
                    <PencilLine className="h-4 w-4" />
                    Edit student
                  </Button>
                </Link>
                {student.status !== "ARCHIVED" ? (
                  <form action={archiveStudentAction}>
                    <input type="hidden" name="studentId" value={student.id} />
                    <Button type="submit" variant="danger">
                      <Archive className="h-4 w-4" />
                      Archive
                    </Button>
                  </form>
                ) : null}
              </>
            ) : null}
          </div>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Core information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="Admission number" value={student.admissionNumber} />
            <InfoRow label="Roll number" value={student.rollNumber ?? "Not assigned"} />
            <InfoRow label="Status" value={student.status} />
            <InfoRow label="Gender" value={student.gender ?? "Not set"} />
            <InfoRow label="Date of birth" value={formatDate(student.dateOfBirth)} />
            <InfoRow label="Admission date" value={formatDate(student.admissionDate)} />
            <InfoRow
              label="Class and section"
              value={[student.class?.name, student.section?.name].filter(Boolean).join(" - ") || "Not assigned"}
            />
            <InfoRow
              label="Address"
              value={[
                student.addressLine1,
                student.addressLine2,
                student.city,
                student.state,
                student.postalCode
              ]
                .filter(Boolean)
                .join(", ") || "Not set"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Primary guardian</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="Guardian name" value={primaryGuardian?.guardianName ?? "Not linked"} />
            <InfoRow label="Relation" value={primaryGuardian?.relation ?? "Not linked"} />
            <InfoRow
              label="Phone"
              value={primaryGuardian?.phonePrimary ?? "Not available"}
              icon={<Phone className="h-4 w-4 text-slate-400" />}
            />
            <InfoRow label="Secondary phone" value={primaryGuardian?.phoneSecondary ?? "Not available"} />
            <InfoRow label="Email" value={primaryGuardian?.email ?? "Not available"} />
            <InfoRow label="Occupation" value={primaryGuardian?.occupation ?? "Not available"} />
            <InfoRow label="Father's name" value={primaryGuardian?.fatherName ?? "Not available"} />
            <InfoRow label="Mother's name" value={primaryGuardian?.motherName ?? "Not available"} />
          </CardContent>
        </Card>
      </section>

      {canViewAttendance ? (
        <Card>
          <CardHeader>
            <CardTitle>Attendance history</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Recent attendance entries for this student, useful during parent meetings and follow-up checks.
            </p>
          </CardHeader>
          <CardContent>
            {attendanceHistory.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Date</TH>
                      <TH>Status</TH>
                      <TH>Remarks</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {attendanceHistory.map((item) => (
                      <tr key={item.id}>
                        <TD className="font-medium text-slate-950">{item.date.toLocaleDateString("en-IN")}</TD>
                        <TD>{attendanceLabel(item.status)}</TD>
                        <TD>{item.remarks || "No remarks"}</TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No attendance has been recorded for this student yet.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {canViewExams ? (
        <Card>
          <CardHeader>
            <CardTitle>Result history</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Recent exam outcomes and grades for this student.
            </p>
          </CardHeader>
          <CardContent>
            {resultHistory.length ? (
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
                    {resultHistory.map((item) => (
                      <tr key={item.id}>
                        <TD className="font-medium text-slate-950">{item.exam.name}</TD>
                        <TD>{Number(item.percentage)}%</TD>
                        <TD>{item.grade}</TD>
                        <TD>{item.resultStatus}</TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No exam results have been recorded for this student yet.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Student audit log</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            Admission, edits, and archive actions for this student appear here.
          </p>
        </CardHeader>
        <CardContent>
          {auditLogs.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <TH>Action</TH>
                    <TH>By</TH>
                    <TH>When</TH>
                  </tr>
                </THead>
                <TBody>
                  {auditLogs.map((item) => (
                    <tr key={item.id}>
                      <TD className="font-medium text-slate-950">{item.action}</TD>
                      <TD>{item.actor?.fullName ?? "System"}</TD>
                      <TD>{item.createdAt.toLocaleString("en-IN")}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No audit entries have been captured for this student yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="flex items-center gap-2 text-right text-sm font-medium text-slate-950">
        {icon}
        {value}
      </span>
    </div>
  );
}

function formatDate(value: Date | null) {
  return value ? toDateInput(value) : "Not set";
}
