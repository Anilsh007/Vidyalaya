import { CalendarDays, IndianRupee, Landmark, ReceiptText, UsersRound } from "lucide-react";

import { PayrollRunForm, PayrollRunStatusForm, PayrollSlipStatusForm } from "@/components/payroll/payroll-forms";
import { EmptyState } from "@/components/school/empty-state";
import { InfoPanel, StatusBadge, SummaryCard, TableFrame } from "@/components/shared/dashboard-primitives";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { payrollPeriodLabel } from "@/lib/payroll";
import { PERMISSIONS } from "@/lib/permissions";
import { getPayrollPageData } from "@/lib/services/payroll.service";
import { formatCurrency } from "@/lib/utils";
import { getWorkspaceAccessCopy, resolveExperienceRole } from "@/lib/dashboard-experience";

export default async function PayrollPage() {
  const session = await requirePermission(PERMISSIONS.viewPayroll);
  const canManagePayroll = session.permissions.includes(PERMISSIONS.managePayroll);
  const accessCopy = getWorkspaceAccessCopy(resolveExperienceRole(session.roles), "payroll");
  const { staffWithSalary, payrollRuns, payrollSlips, monthlyPayroll, draftSlips, paidThisCycle, latestRun } =
    await getPayrollPageData({ schoolId: session.schoolId });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 19"
        title="Payroll management"
        description="Generate monthly payroll runs from staff salary references, review staff-wise payslips, approve payroll, and track paid salary records."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Salary staff" value={staffWithSalary.length.toString()} icon={<UsersRound className="h-5 w-5" />} />
        <SummaryCard title="Monthly payroll" value={formatCurrency(monthlyPayroll)} icon={<IndianRupee className="h-5 w-5" />} />
        <SummaryCard title="Draft slips" value={draftSlips.length.toString()} icon={<ReceiptText className="h-5 w-5" />} />
        <SummaryCard title="Paid tracked" value={formatCurrency(paidThisCycle)} icon={<Landmark className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>{canManagePayroll ? "Generate payroll" : "Payroll controls"}</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              {canManagePayroll ? "Create a monthly payroll run from active staff records that have salary references." : accessCopy.summary}
            </p>
          </CardHeader>
          <CardContent>
            {canManagePayroll ? <PayrollRunForm /> : <EmptyState title={accessCopy.title} description={accessCopy.description} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll runs</CardTitle>
            <p className="text-sm leading-6 text-slate-600">Monthly payroll cycles with total net amount, slips, and approval state.</p>
          </CardHeader>
          <CardContent>
            {payrollRuns.length ? (
                <TableFrame>
                <Table>
                  <THead><tr><TH>Period</TH><TH>Slips</TH><TH>Net pay</TH><TH>Status</TH><TH className="text-right">Action</TH></tr></THead>
                  <TBody>
                    {payrollRuns.map((run) => {
                      const totalNet = run.slips.reduce((sum, slip) => sum + Number(slip.netPay), 0);
                      return (
                        <tr key={run.id}>
                          <TD><div className="grid gap-1"><span className="font-medium text-slate-950">{payrollPeriodLabel(run.periodMonth, run.periodYear)}</span><span className="text-xs text-slate-500">{run.paymentDate ? `Payment ${formatDate(run.paymentDate)}` : "No payment date"}</span></div></TD>
                          <TD>{run.slips.length}</TD>
                          <TD>{formatCurrency(totalNet)}</TD>
                          <TD><StatusBadge status={run.status} toneMap={{ PAID: "bg-emerald-50 text-emerald-700", APPROVED: "bg-blue-50 text-blue-700", FINALIZED: "bg-blue-50 text-blue-700", CANCELLED: "bg-red-50 text-red-700", DRAFT: "bg-amber-50 text-amber-700" }} /></TD>
                          <TD className="text-right">{canManagePayroll ? <Dialog title={`Update ${run.title}`} description="Finalize, mark paid, or cancel this payroll cycle." triggerLabel="Update"><PayrollRunStatusForm payrollRunId={run.id} /></Dialog> : <span className="text-sm text-slate-500">View only</span>}</TD>
                        </tr>
                      );
                    })}
                  </TBody>
                </Table>
                </TableFrame>
            ) : (
              <EmptyState title="No payroll runs" description="Generate the first payroll run after staff salary references are ready." />
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Payroll slips</CardTitle>
          <p className="text-sm leading-6 text-slate-600">Recent staff payslips generated from payroll runs, with gross pay, deductions, net pay, and payment state.</p>
        </CardHeader>
        <CardContent>
          {payrollSlips.length ? (
            <TableFrame>
              <Table>
                <THead><tr><TH>Staff</TH><TH>Period</TH><TH>Gross</TH><TH>Allowances</TH><TH>Deductions</TH><TH>Net</TH><TH>Status</TH><TH className="text-right">Action</TH></tr></THead>
                <TBody>
                  {payrollSlips.map((slip) => (
                    <tr key={slip.id}>
                      <TD><div className="grid gap-1"><span className="font-medium text-slate-950">{slip.staffName}</span><span className="text-xs text-slate-500">{slip.employeeCode} - {slip.designation}</span></div></TD>
                      <TD>{payrollPeriodLabel(slip.payrollRun.periodMonth, slip.payrollRun.periodYear)}</TD>
                      <TD>{formatCurrency(Number(slip.grossPay))}</TD>
                      <TD>{formatCurrency(Number(slip.allowances))}</TD>
                      <TD>{formatCurrency(Number(slip.deductions))}</TD>
                      <TD className="font-medium text-slate-950">{formatCurrency(Number(slip.netPay))}</TD>
                      <TD><StatusBadge status={slip.status} toneMap={{ PAID: "bg-emerald-50 text-emerald-700", APPROVED: "bg-blue-50 text-blue-700", FINALIZED: "bg-blue-50 text-blue-700", CANCELLED: "bg-red-50 text-red-700", DRAFT: "bg-amber-50 text-amber-700" }} /></TD>
                      <TD className="text-right">{canManagePayroll ? <Dialog title={`Update ${slip.staffName}`} description="Approve this payslip or mark it as paid." triggerLabel="Update"><PayrollSlipStatusForm slipId={slip.id} /></Dialog> : <span className="text-sm text-slate-500">View only</span>}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </TableFrame>
          ) : (
            <EmptyState title="No payroll slips" description="Payroll slips will appear after a payroll run is generated." />
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoPanel title="Latest cycle" value={latestRun ? payrollPeriodLabel(latestRun.periodMonth, latestRun.periodYear) : "Not generated"} description="The most recent payroll cycle gives accounts a quick starting point for salary review." icon={<CalendarDays className="h-5 w-5" />} />
        <InfoPanel title="Salary readiness" value={`${staffWithSalary.length} staff`} description="Payroll runs include active staff members with salary reference amounts in staff management." icon={<CalendarDays className="h-5 w-5" />} />
        <InfoPanel title="Payment control" value={`${payrollSlips.filter((slip) => slip.status === "PAID").length} paid`} description="Paid slips are tracked separately from draft and approved slips for accounting follow-up." icon={<CalendarDays className="h-5 w-5" />} />
      </section>
    </div>
  );
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

