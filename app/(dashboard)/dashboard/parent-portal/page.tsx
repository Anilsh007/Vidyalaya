import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/school/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { attendanceLabel } from "@/lib/attendance";
import { requireAnyPermission } from "@/lib/rbac/guards";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { getParentPortalData } from "@/lib/services/portal.service";
import { formatCurrency } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ParentPortalPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireAnyPermission([
    RBAC_PERMISSIONS.dashboardReadOwn,
    RBAC_PERMISSIONS.studentsReadChild,
    RBAC_PERMISSIONS.attendanceReadChild,
    RBAC_PERMISSIONS.feesReadChild,
    RBAC_PERMISSIONS.examsReadChild,
    RBAC_PERMISSIONS.documentsReadChild
  ]);
  const params = await searchParams;
  const selectedStudentId = asSingle(params.studentId) ?? "";
  const data = await getParentPortalData(session, selectedStudentId || undefined);

  if (data.invalidSelectedChild) {
    redirect("/forbidden");
  }

  if (!data.children.length) {
    return (
      <div className="grid gap-6">
        <PageHeader
          eyebrow="Parent portal"
          title="Ward academic workspace"
          description="This portal shows only the children linked to your parent account."
        />
        <EmptyState
          title="No linked children found"
          description="Ask the school administrator to link your wards with this parent login before using the parent portal."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Parent portal"
        title={data.parent?.guardianName ?? "Parent portal"}
        description="Attendance, fee, exam, and notice details below are limited to the child records linked with this parent account."
      />

      <Card>
        <CardHeader>
          <CardTitle>Linked children</CardTitle>
        </CardHeader>
        <CardContent>
          {data.children.length > 1 ? (
            <form className="mb-4 grid gap-3 sm:max-w-sm">
              <FormField label="Selected child" htmlFor="studentId">
                <Select id="studentId" name="studentId" defaultValue={data.selectedChild?.id ?? data.children[0]?.id ?? ""}>
                  {data.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.fullName}
                    </option>
                  ))}
                </Select>
              </FormField>
              <Button type="submit" variant="secondary">Load child details</Button>
            </form>
          ) : null}
          <Table>
            <THead>
              <tr>
                <TH>Student</TH>
                <TH>Class</TH>
                <TH>Attendance</TH>
                <TH>Pending dues</TH>
                <TH>Latest result</TH>
                <TH>Documents</TH>
              </tr>
            </THead>
            <TBody>
              {data.childSummaries.map((summary) => (
                <tr key={summary.student.id}>
                  <TD>{summary.student.fullName}</TD>
                  <TD>{[summary.student.class?.name, summary.student.section?.name].filter(Boolean).join(" - ") || "Not assigned"}</TD>
                  <TD>{summary.markedDays ? `${summary.attendancePct}%` : "No data"}</TD>
                  <TD>{summary.totalDueLabel}</TD>
                  <TD>{summary.latestResult ? `${summary.latestResult.grade} (${Number(summary.latestResult.percentage)}%)` : "No result"}</TD>
                  <TD>{summary.documentsCount}</TD>
                </tr>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{data.selectedChild ? `${data.selectedChild.fullName} details` : "Child details"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {data.selectedChild && data.selectedChildDetails ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoTile label="Class" value={[data.selectedChild.class?.name, data.selectedChild.section?.name].filter(Boolean).join(" - ") || "Not assigned"} />
                  <InfoTile label="Admission no." value={data.selectedChild.admissionNumber} />
                  <InfoTile label="Attendance" value={`${data.selectedChildDetails.attendanceSummary.attendancePct}%`} />
                  <InfoTile label="Pending dues" value={data.selectedChildDetails.feeSummary.totalDueLabel} />
                </div>

                <div className="grid gap-4">
                  <Subsection title="Attendance">
                    {data.selectedChildDetails.attendanceRows.length ? (
                      <Table>
                        <THead>
                          <tr>
                            <TH>Date</TH>
                            <TH>Status</TH>
                            <TH>Remarks</TH>
                          </tr>
                        </THead>
                        <TBody>
                          {data.selectedChildDetails.attendanceRows.map((row) => (
                            <tr key={row.id}>
                              <TD>{row.date.toLocaleDateString("en-IN")}</TD>
                              <TD>{attendanceLabel(row.status)}</TD>
                              <TD>{row.remarks || "No remarks"}</TD>
                            </tr>
                          ))}
                        </TBody>
                      </Table>
                    ) : (
                      <EmptyCopy text="No attendance records are available for this child yet." />
                    )}
                  </Subsection>

                  <Subsection title="Fee summary">
                    {data.selectedChildDetails.invoices.length ? (
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
                          {data.selectedChildDetails.invoices.map((invoice) => (
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
                      <EmptyCopy text="No fee invoices are linked to this child yet." />
                    )}
                  </Subsection>
                </div>
              </>
            ) : (
              <EmptyCopy text="Select a linked child to review attendance and fee details." />
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
              <EmptyCopy text="No parent-visible notices are available right now." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latest results</CardTitle>
          </CardHeader>
          <CardContent>
            {data.selectedChildDetails?.results.length ? (
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
                  {data.selectedChildDetails.results.map((result) => (
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
              <EmptyCopy text="No results are available for the selected child yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents and upcoming exams</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Subsection title="Documents">
              {data.selectedChildDetails?.documents.length ? (
                <div className="grid gap-3">
                  {data.selectedChildDetails.documents.map((document) => (
                    <PortalLink key={document.id} href={`/dashboard/documents/${document.id}`} label={document.title} />
                  ))}
                </div>
              ) : (
                <EmptyCopy text="No document records are linked to the selected child yet." />
              )}
            </Subsection>

            <Subsection title="Upcoming exams">
              {data.selectedChildDetails?.upcomingExams.length ? (
                <Table>
                  <THead>
                    <tr>
                      <TH>Exam</TH>
                      <TH>Type</TH>
                      <TH>Date</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {data.selectedChildDetails.upcomingExams.map((exam) => (
                      <tr key={exam.id}>
                        <TD>{exam.name}</TD>
                        <TD>{exam.examType ?? "Not set"}</TD>
                        <TD>{exam.startDate.toLocaleDateString("en-IN")}</TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              ) : (
                <EmptyCopy text="No upcoming exams are scheduled for the selected child yet." />
              )}
            </Subsection>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function PortalLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}

function EmptyCopy({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">{text}</div>;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Subsection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}
