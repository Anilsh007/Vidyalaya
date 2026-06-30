import { CalendarCheck2, CalendarDays, Clock3, UserRoundCheck, UsersRound } from "lucide-react";

import { LeaveRequestForm, LeaveReviewForm } from "@/components/leaves/leave-forms";
import { EmptyState } from "@/components/school/empty-state";
import { InfoPanel, StatusBadge, SummaryCard, TableFrame } from "@/components/shared/dashboard-primitives";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { getLeavesPageData } from "@/lib/services/leaves.service";
import { getWorkspaceAccessCopy, resolveExperienceRole } from "@/lib/dashboard-experience";

export default async function LeavesPage() {
  const session = await requirePermission(RBAC_PERMISSIONS.leavesRead);
  const canRequestLeaves =
    session.permissions.includes(RBAC_PERMISSIONS.leavesRequest) ||
    session.permissions.includes(RBAC_PERMISSIONS.leavesManage);
  const canApproveLeaves =
    session.permissions.includes(RBAC_PERMISSIONS.leavesApprove) ||
    session.permissions.includes(RBAC_PERMISSIONS.leavesManage);
  const accessCopy = getWorkspaceAccessCopy(resolveExperienceRole(session.roles), "leaves");
  const { students, staff, leaveRequests, pendingLeaves, approvedThisMonth, studentLeaves, staffLeaves } =
    await getLeavesPageData({ schoolId: session.schoolId });

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
            <CardTitle>{canRequestLeaves ? "New leave request" : "Leave controls"}</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              {canRequestLeaves ? "Create student or staff leave requests with inclusive start and end dates." : accessCopy.summary}
            </p>
          </CardHeader>
          <CardContent>
            {canRequestLeaves ? (
              <LeaveRequestForm
                students={students.map((student) => ({ id: student.id, name: student.fullName, meta: [student.class?.name, student.section?.name].filter(Boolean).join(" ") }))}
                staff={staff.map((member) => ({ id: member.id, name: member.fullName, meta: member.designation }))}
              />
            ) : (
              <EmptyState title={accessCopy.title} description={accessCopy.description} />
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
                <TableFrame>
                <Table>
                  <THead><tr><TH>Requester</TH><TH>Dates</TH><TH>Type</TH><TH>Reason</TH><TH className="text-right">Action</TH></tr></THead>
                  <TBody>
                    {pendingLeaves.map((leave) => (
                      <tr key={leave.id}>
                        <TD><RequesterCell name={leave.requesterName} type={leave.requesterType} /></TD>
                        <TD>{formatDate(leave.startDate)} to {formatDate(leave.endDate)}<p className="text-xs text-slate-500">{Number(leave.totalDays)} day(s)</p></TD>
                        <TD>{leave.leaveType}</TD>
                        <TD className="max-w-[240px]"><span className="line-clamp-2">{leave.reason}</span></TD>
                        <TD className="text-right">{canApproveLeaves ? <Dialog title={`Review ${leave.requesterName}`} description="Approve, reject, or cancel this leave request." triggerLabel="Review"><LeaveReviewForm leaveId={leave.id} /></Dialog> : <span className="text-sm text-slate-500">View only</span>}</TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
                </TableFrame>
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
            <TableFrame>
              <Table>
                <THead><tr><TH>Requester</TH><TH>Leave type</TH><TH>Period</TH><TH>Reason</TH><TH>Status</TH><TH>Review</TH></tr></THead>
                <TBody>
                  {leaveRequests.map((leave) => (
                    <tr key={leave.id}>
                      <TD><RequesterCell name={leave.requesterName} type={leave.requesterType} /></TD>
                      <TD>{leave.leaveType}</TD>
                      <TD>{formatDate(leave.startDate)} to {formatDate(leave.endDate)}<p className="text-xs text-slate-500">{Number(leave.totalDays)} day(s)</p></TD>
                      <TD className="max-w-[300px]"><span className="line-clamp-2">{leave.reason}</span></TD>
                      <TD><StatusBadge status={leave.status} toneMap={{ APPROVED: "bg-emerald-50 text-emerald-700", REJECTED: "bg-red-50 text-red-700", CANCELLED: "bg-slate-100 text-slate-600", PENDING: "bg-amber-50 text-amber-700" }} /></TD>
                      <TD className="max-w-[240px]"><span className="line-clamp-2 text-sm text-slate-600">{leave.reviewRemarks ?? (leave.reviewedAt ? `Reviewed on ${formatDate(leave.reviewedAt)}` : "Awaiting review")}</span></TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </TableFrame>
          ) : (
            <EmptyState title="No leave requests" description="Submit the first request to start the leave register." />
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoPanel title="Approval discipline" value={`${pendingLeaves.length} open`} description="Review pending requests daily so attendance and payroll teams can act on approved leave quickly." icon={<CalendarDays className="h-5 w-5" />} />
        <InfoPanel title="Student coverage" value={`${studentLeaves.length} requests`} description="Student leave history is available for attendance reconciliation and parent communication." icon={<CalendarDays className="h-5 w-5" />} />
        <InfoPanel title="Staff coverage" value={`${staffLeaves.length} requests`} description="Staff leave status gives principals and admins visibility into daily availability." icon={<CalendarDays className="h-5 w-5" />} />
      </section>
    </div>
  );
}

function RequesterCell({ name, type }: { name: string; type: string }) {
  return <div className="grid gap-1"><span className="font-medium text-slate-950">{name}</span><span className="text-xs uppercase tracking-[0.18em] text-slate-500">{type.toLowerCase()}</span></div>;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

