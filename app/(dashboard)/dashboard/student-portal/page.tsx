import Link from "next/link";

import { EmptyState } from "@/components/school/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { attendanceLabel } from "@/lib/attendance";
import { requireAnyPermission } from "@/lib/rbac/guards";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { getStudentPortalData } from "@/lib/services/portal.service";
import { formatCurrency } from "@/lib/utils";

export default async function StudentPortalPage() {
  const session = await requireAnyPermission([
    RBAC_PERMISSIONS.dashboardReadOwn,
    RBAC_PERMISSIONS.studentsReadOwn,
    RBAC_PERMISSIONS.attendanceReadOwn,
    RBAC_PERMISSIONS.feesReadOwn,
    RBAC_PERMISSIONS.examsReadOwn,
    RBAC_PERMISSIONS.documentsReadOwn
  ]);
  const data = await getStudentPortalData(session);

  if (!data.student) {
    return (
      <div className="grid gap-6">
        <PageHeader
          eyebrow="Student portal"
          title="My academic workspace"
          description="This portal only shows the data linked to your own student profile."
        />
        <EmptyState
          title="Student profile not linked"
          description="Ask the school administrator to link this login with your admission record before using the student portal."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Student portal"
        title={data.student.fullName}
        description="Your attendance, fees, exam results, notices, and documents are shown from live school records only."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Class" value={[data.student.class?.name, data.student.section?.name].filter(Boolean).join(" - ") || "Not assigned"} />
        <StatCard title="Attendance" value={data.attendanceSummary ? `${data.attendanceSummary.attendancePct}%` : "No data"} />
        <StatCard title="Pending dues" value={data.feeSummary?.totalDueLabel ?? "No dues"} />
        <StatCard title="Upcoming exams" value={String(data.upcomingExams.length)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance record</CardTitle>
          </CardHeader>
          <CardContent>
            {data.attendanceRows.length ? (
              <Table>
                <THead>
                  <tr>
                    <TH>Date</TH>
                    <TH>Status</TH>
                    <TH>Remarks</TH>
                  </tr>
                </THead>
                <TBody>
                  {data.attendanceRows.map((row) => (
                    <tr key={row.id}>
                      <TD>{row.date.toLocaleDateString("en-IN")}</TD>
                      <TD>{attendanceLabel(row.status)}</TD>
                      <TD>{row.remarks || "No remarks"}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            ) : (
              <EmptyCopy text="No attendance records are linked to your profile yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {data.invoices.length ? (
              <Table>
                <THead>
                  <tr>
                    <TH>Invoice</TH>
                    <TH>Due date</TH>
                    <TH>Status</TH>
                    <TH>Balance</TH>
                  </tr>
                </THead>
                <TBody>
                  {data.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <TD>{invoice.invoiceNumber}</TD>
                      <TD>{invoice.dueDate.toLocaleDateString("en-IN")}</TD>
                      <TD>{invoice.status.replaceAll("_", " ")}</TD>
                      <TD>{formatCurrency(Math.max(0, Number(invoice.totalAmount) - Number(invoice.paidAmount)))}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            ) : (
              <EmptyCopy text="No fee invoices are available for your profile yet." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent results</CardTitle>
          </CardHeader>
          <CardContent>
            {data.results.length ? (
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
                  {data.results.map((result) => (
                    <tr key={result.id}>
                      <TD>{result.exam.name}</TD>
                      <TD>{Number(result.percentage)}%</TD>
                      <TD>{result.grade}</TD>
                      <TD>{result.resultStatus}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            ) : (
              <EmptyCopy text="No exam results are available yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notices</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.notices.length ? (
              data.notices.map((notice) => (
                <div key={notice.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="font-medium text-slate-950">{notice.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{notice.body}</p>
                </div>
              ))
            ) : (
              <EmptyCopy text="No notices are available for your class right now." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My documents</CardTitle>
          </CardHeader>
          <CardContent>
            {data.documents.length ? (
              <div className="grid gap-3">
                {data.documents.map((document) => (
                  <Link
                    key={document.id}
                    href={`/dashboard/documents/${document.id}`}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-brand-300 hover:bg-slate-50"
                  >
                    <div className="font-medium text-slate-950">{document.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{document.fileName}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyCopy text="No document records are linked to your account yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming exams</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingExams.length ? (
              <Table>
                <THead>
                  <tr>
                    <TH>Exam</TH>
                    <TH>Type</TH>
                    <TH>Date</TH>
                  </tr>
                </THead>
                <TBody>
                  {data.upcomingExams.map((exam) => (
                    <tr key={exam.id}>
                      <TD>{exam.name}</TD>
                      <TD>{exam.examType ?? "Not set"}</TD>
                      <TD>{exam.startDate.toLocaleDateString("en-IN")}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            ) : (
              <EmptyCopy text="No upcoming exams are scheduled for your class yet." />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-lg font-semibold text-slate-950">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyCopy({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">{text}</div>;
}
