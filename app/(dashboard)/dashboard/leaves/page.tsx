import { CalendarCheck2, CalendarDays, Clock3, UserRoundCheck, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { LeaveRequestForm, LeaveReviewForm } from "@/components/leaves/leave-forms";
import { EmptyState } from "@/components/school/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export default async function LeavesPage() {
  const session = await requirePermission(PERMISSIONS.viewLeaves);
  const canManageLeaves = session.permissions.includes(PERMISSIONS.manageLeaves);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [students, staff, leaveRequests] = await Promise.all([
    db.student.findMany({
      where: { schoolId: session.schoolId, status: { not: "ARCHIVED" } },
      include: { class: true, section: true },
      orderBy: [{ fullName: "asc" }]
    }),
    db.staff.findMany({
      where: { schoolId: session.schoolId, isArchived: false },
      orderBy: [{ fullName: "asc" }]
    }),
    db.leaveRequest.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ createdAt: "desc" }],
      take: 60
    })
  ]);

  const pendingLeaves = leaveRequests.filter((leave) => leave.status === "PENDING");
  const approvedThisMonth = leaveRequests.filter((leave) => leave.status === "APPROVED" && leave.startDate >= monthStart);
  const studentLeaves = leaveRequests.filter((leave) => leave.requesterType === "STUDENT");
  const staffLeaves = leaveRequests.filter((leave) => leave.requesterType === "STAFF");

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 18"
        title="Leave management"
        description="Submit, review, approve, reject, and report student and staff leave requests with date ranges, reason tracking, and audit-ready decision history."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Pending review" value={pendingLeaves.length.toString()} icon={<Clock3 className="h-5 w-5" />} />
        <SummaryCard title="Approved this month" value={approvedThisMonth.length.toString()} icon={<CalendarCheck2 className="h-5 w-5" />} />
        <SummaryCard title="Student leaves" value={studentLeaves.length.toString()} icon={<UsersRound className="h-5 w-5" />} />
        <SummaryCard title="Staff leaves" value={staffLeaves.length.toString()} icon={<UserRoundCheck className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>{canManageLeaves ? "New leave request" : "Leave controls"}</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              {canManageLeaves ? "Create student or staff leave requests with inclusive start and end dates." : "Your account can review leave records but cannot submit or approve requests."}
            </p>
          </CardHeader>
          <CardContent>
            {canManageLeaves ? (
              <LeaveRequestForm
                students={students.map((student) => ({ id: student.id, name: student.fullName, meta: [student.class?.name, student.section?.name].filter(Boolean).join(" ") }))}
                staff={staff.map((member) => ({ id: member.id, name: member.fullName, meta: member.designation }))}
              />
            ) : (
              <EmptyState title="View-only access" description="Ask an administrator for leave management permission to submit or review leave requests." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending approvals</CardTitle>
            <p className="text-sm leading-6 text-slate-600">Requests waiting for a decision, sorted by the latest submission.</p>
          </CardHeader>
          <CardContent>
            {pendingLeaves.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <THead><tr><TH>Requester</TH><TH>Dates</TH><TH>Type</TH><TH>Reason</TH><TH className="text-right">Action</TH></tr></THead>
                  <TBody>
                    {pendingLeaves.map((leave) => (
                      <tr key={leave.id}>
                        <TD><RequesterCell name={leave.requesterName} type={leave.requesterType} /></TD>
                        <TD>{formatDate(leave.startDate)} to {formatDate(leave.endDate)}<p className="text-xs text-slate-500">{Number(leave.totalDays)} day(s)</p></TD>
                        <TD>{leave.leaveType}</TD>
                        <TD className="max-w-[240px]"><span className="line-clamp-2">{leave.reason}</span></TD>
                        <TD className="text-right">{canManageLeaves ? <Dialog title={`Review ${leave.requesterName}`} description="Approve, reject, or cancel this leave request." triggerLabel="Review"><LeaveReviewForm leaveId={leave.id} /></Dialog> : <span className="text-sm text-slate-500">View only</span>}</TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : (
              <EmptyState title="No pending leaves" description="All leave requests are reviewed at the moment." />
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Leave register</CardTitle>
          <p className="text-sm leading-6 text-slate-600">Recent student and staff leave requests with status, review remarks, and date range.</p>
        </CardHeader>
        <CardContent>
          {leaveRequests.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <Table>
                <THead><tr><TH>Requester</TH><TH>Leave type</TH><TH>Period</TH><TH>Reason</TH><TH>Status</TH><TH>Review</TH></tr></THead>
                <TBody>
                  {leaveRequests.map((leave) => (
                    <tr key={leave.id}>
                      <TD><RequesterCell name={leave.requesterName} type={leave.requesterType} /></TD>
                      <TD>{leave.leaveType}</TD>
                      <TD>{formatDate(leave.startDate)} to {formatDate(leave.endDate)}<p className="text-xs text-slate-500">{Number(leave.totalDays)} day(s)</p></TD>
                      <TD className="max-w-[300px]"><span className="line-clamp-2">{leave.reason}</span></TD>
                      <TD><StatusBadge status={leave.status} /></TD>
                      <TD className="max-w-[240px]"><span className="line-clamp-2 text-sm text-slate-600">{leave.reviewRemarks ?? (leave.reviewedAt ? `Reviewed on ${formatDate(leave.reviewedAt)}` : "Awaiting review")}</span></TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="No leave requests" description="Submit the first request to start the leave register." />
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoPanel title="Approval discipline" value={`${pendingLeaves.length} open`} description="Review pending requests daily so attendance and payroll teams can act on approved leave quickly." />
        <InfoPanel title="Student coverage" value={`${studentLeaves.length} requests`} description="Student leave history is available for attendance reconciliation and parent communication." />
        <InfoPanel title="Staff coverage" value={`${staffLeaves.length} requests`} description="Staff leave status gives principals and admins visibility into daily availability." />
      </section>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return <Card><CardContent className="flex items-center justify-between gap-4 pt-6"><div><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p></div><div className="rounded-2xl bg-brand-50 p-3 text-brand-700">{icon}</div></CardContent></Card>;
}

function InfoPanel({ title, value, description }: { title: string; value: string; description: string }) {
  return <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-panel"><div className="mb-4 inline-flex rounded-2xl bg-slate-100 p-3 text-slate-700"><CalendarDays className="h-5 w-5" /></div><p className="text-sm font-medium text-slate-500">{title}</p><p className="mt-1 text-xl font-semibold text-slate-950">{value}</p><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p></div>;
}

function RequesterCell({ name, type }: { name: string; type: string }) {
  return <div className="grid gap-1"><span className="font-medium text-slate-950">{name}</span><span className="text-xs uppercase tracking-[0.18em] text-slate-500">{type.toLowerCase()}</span></div>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : status === "REJECTED" ? "bg-red-50 text-red-700" : status === "CANCELLED" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700")}>{status}</span>;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
