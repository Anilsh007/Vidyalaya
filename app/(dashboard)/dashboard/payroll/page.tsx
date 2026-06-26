import { CalendarDays, IndianRupee, Landmark, ReceiptText, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { PayrollRunForm, PayrollRunStatusForm, PayrollSlipStatusForm } from "@/components/payroll/payroll-forms";
import { EmptyState } from "@/components/school/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { payrollPeriodLabel } from "@/lib/payroll";
import { PERMISSIONS } from "@/lib/permissions";
import { cn, formatCurrency } from "@/lib/utils";

export default async function PayrollPage() {
  const session = await requirePermission(PERMISSIONS.viewPayroll);
  const canManagePayroll = session.permissions.includes(PERMISSIONS.managePayroll);

  const [staffWithSalary, payrollRuns, payrollSlips] = await Promise.all([
    db.staff.findMany({
      where: { schoolId: session.schoolId, isArchived: false, salaryAmount: { not: null } },
      orderBy: [{ fullName: "asc" }]
    }),
    db.payrollRun.findMany({
      where: { schoolId: session.schoolId },
      include: { slips: true },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      take: 12
    }),
    db.payrollSlip.findMany({
      where: { schoolId: session.schoolId },
      include: { payrollRun: true, staff: true },
      orderBy: [{ createdAt: "desc" }],
      take: 60
    })
  ]);

  const monthlyPayroll = staffWithSalary.reduce((sum, member) => sum + Number(member.salaryAmount ?? 0), 0);
  const draftSlips = payrollSlips.filter((slip) => slip.status === "DRAFT");
  const paidThisCycle = payrollSlips.filter((slip) => slip.status === "PAID").reduce((sum, slip) => sum + Number(slip.netPay), 0);
  const latestRun = payrollRuns[0];

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
              {canManagePayroll ? "Create a monthly payroll run from active staff records that have salary references." : "Your account can review payroll records but cannot generate or update payroll."}
            </p>
          </CardHeader>
          <CardContent>
            {canManagePayroll ? <PayrollRunForm /> : <EmptyState title="View-only access" description="Ask an administrator for payroll management permission to generate and approve payroll." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll runs</CardTitle>
            <p className="text-sm leading-6 text-slate-600">Monthly payroll cycles with total net amount, slips, and approval state.</p>
          </CardHeader>
          <CardContent>
            {payrollRuns.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
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
                          <TD><StatusBadge status={run.status} /></TD>
                          <TD className="text-right">{canManagePayroll ? <Dialog title={`Update ${run.title}`} description="Finalize, mark paid, or cancel this payroll cycle." triggerLabel="Update"><PayrollRunStatusForm payrollRunId={run.id} /></Dialog> : <span className="text-sm text-slate-500">View only</span>}</TD>
                        </tr>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
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
            <div className="overflow-hidden rounded-2xl border border-slate-200">
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
                      <TD><StatusBadge status={slip.status} /></TD>
                      <TD className="text-right">{canManagePayroll ? <Dialog title={`Update ${slip.staffName}`} description="Approve this payslip or mark it as paid." triggerLabel="Update"><PayrollSlipStatusForm slipId={slip.id} /></Dialog> : <span className="text-sm text-slate-500">View only</span>}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="No payroll slips" description="Payroll slips will appear after a payroll run is generated." />
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoPanel title="Latest cycle" value={latestRun ? payrollPeriodLabel(latestRun.periodMonth, latestRun.periodYear) : "Not generated"} description="The most recent payroll cycle gives accounts a quick starting point for salary review." />
        <InfoPanel title="Salary readiness" value={`${staffWithSalary.length} staff`} description="Payroll runs include active staff members with salary reference amounts in staff management." />
        <InfoPanel title="Payment control" value={`${payrollSlips.filter((slip) => slip.status === "PAID").length} paid`} description="Paid slips are tracked separately from draft and approved slips for accounting follow-up." />
      </section>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return <Card><CardContent className="flex items-center justify-between gap-4 pt-6"><div><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{value}</p></div><div className="rounded-2xl bg-brand-50 p-3 text-brand-700">{icon}</div></CardContent></Card>;
}

function InfoPanel({ title, value, description }: { title: string; value: string; description: string }) {
  return <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-panel"><div className="mb-4 inline-flex rounded-2xl bg-slate-100 p-3 text-slate-700"><CalendarDays className="h-5 w-5" /></div><p className="text-sm font-medium text-slate-500">{title}</p><p className="mt-1 text-xl font-semibold text-slate-950">{value}</p><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p></div>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", status === "PAID" ? "bg-emerald-50 text-emerald-700" : status === "APPROVED" || status === "FINALIZED" ? "bg-blue-50 text-blue-700" : status === "CANCELLED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>{status}</span>;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
