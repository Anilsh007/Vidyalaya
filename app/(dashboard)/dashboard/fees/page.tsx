import Link from "next/link";
import { FeeInvoiceStatus } from "@prisma/client";
import { FileText, IndianRupee, Receipt, WalletCards } from "lucide-react";
import type { ReactNode } from "react";

import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/school/empty-state";
import { FeeHeadForm, FeeInvoiceForm, FeePaymentForm, FeeStructureForm } from "@/components/fees/fee-forms";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { fromMoney } from "@/lib/fees";
import { PERMISSIONS } from "@/lib/permissions";
import { getFeesPageData } from "@/lib/services/fees.service";
import { formatCurrency } from "@/lib/utils";

export default async function FeesPage() {
  const session = await requirePermission(PERMISSIONS.manageFees);
  const {
    feeHeads,
    classes,
    students,
    structures,
    invoices,
    dailyPayments,
    monthlyPayments,
    totalOutstanding,
    totalInvoiced,
    totalCollected,
    todayCollections,
    monthCollections,
    pendingInvoices
  } = await getFeesPageData(session.schoolId);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 4"
        title="Fees and receipts"
        description="Configure fee heads and class structures, raise student invoices, collect full or partial payments, track dues, and print receipts from one finance workspace."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total invoiced" value={formatCurrency(totalInvoiced)} icon={<FileText className="h-5 w-5" />} />
        <SummaryCard title="Collected" value={formatCurrency(totalCollected)} icon={<IndianRupee className="h-5 w-5" />} />
        <SummaryCard title="Outstanding dues" value={formatCurrency(totalOutstanding)} icon={<WalletCards className="h-5 w-5" />} />
        <SummaryCard title="Today collections" value={formatCurrency(todayCollections)} icon={<Receipt className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Fee heads</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Define reusable heads like tuition, admission, transport, or lab fees.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FeeHeadForm />
            {feeHeads.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Head</TH>
                      <TH>Code</TH>
                      <TH>Type</TH>
                      <TH className="text-right">Edit</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {feeHeads.map((head) => (
                      <tr key={head.id}>
                        <TD className="font-medium text-slate-950">{head.name}</TD>
                        <TD>{head.code}</TD>
                        <TD>{head.isOptional ? "Optional" : "Mandatory"}</TD>
                        <TD className="text-right">
                          <Dialog
                            title={`Edit ${head.name}`}
                            description="Update the fee head label, code, or optional flag."
                            triggerLabel="Edit"
                          >
                            <FeeHeadForm defaultValues={head} />
                          </Dialog>
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                title="No fee heads yet"
                description="Create the fee heads first so the class-wise fee structure can use them."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Class-wise fee structure</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Save a structure once and reuse it during student invoice generation.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4">
            {feeHeads.length ? (
              <FeeStructureForm
                classes={classes.map((item) => ({ id: item.id, name: item.name }))}
                feeHeads={feeHeads.map((item) => ({ id: item.id, name: item.name, code: item.code }))}
              />
            ) : (
              <EmptyState
                title="Fee heads required first"
                description="Add at least one fee head before creating a class-wise structure."
              />
            )}
            {structures.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Structure</TH>
                      <TH>Class</TH>
                      <TH>Effective</TH>
                      <TH>Total</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {structures.map((structure) => (
                      <tr key={structure.id}>
                        <TD>
                          <div className="grid gap-1">
                            <span className="font-medium text-slate-950">{structure.name}</span>
                            <span className="text-xs text-slate-500">
                              {structure.items.map((item) => item.feeHead.name).join(", ")}
                            </span>
                          </div>
                        </TD>
                        <TD>{structure.class?.name ?? "Common"}</TD>
                        <TD>{structure.effectiveFrom.toLocaleDateString("en-IN")}</TD>
                        <TD>
                          {formatCurrency(
                            structure.items.reduce((sum, item) => sum + fromMoney(item.amount), 0)
                          )}
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Student fee invoice generation</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Pick a student and the system will use the matching class structure to raise the invoice.
            </p>
          </CardHeader>
          <CardContent>
            {students.length ? (
              <FeeInvoiceForm
                students={students.map((student) => ({
                  id: student.id,
                  fullName: student.fullName,
                  admissionNumber: student.admissionNumber,
                  className: student.class?.name,
                  sectionName: student.section?.name
                }))}
              />
            ) : (
              <EmptyState
                title="No students available"
                description="Add students before generating invoices."
                action={
                  <Link href="/dashboard/students/new">
                    <Button>Add student</Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee invoice list</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Collect full or partial payments, see balances, and open printable receipts from here.
            </p>
          </CardHeader>
          <CardContent>
            {invoices.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Invoice</TH>
                      <TH>Student</TH>
                      <TH>Total</TH>
                      <TH>Paid</TH>
                      <TH>Balance</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {invoices.map((invoice) => {
                      const total = fromMoney(invoice.totalAmount);
                      const paid = fromMoney(invoice.paidAmount);
                      const balance = Math.max(0, total - paid);
                      const latestPayment = invoice.payments[0];

                      return (
                        <tr key={invoice.id}>
                          <TD>
                            <div className="grid gap-1">
                              <span className="font-medium text-slate-950">{invoice.invoiceNumber}</span>
                              <span className="text-xs text-slate-500">
                                Due {invoice.dueDate.toLocaleDateString("en-IN")}
                              </span>
                            </div>
                          </TD>
                          <TD>
                            <div className="grid gap-1">
                              <span className="font-medium text-slate-950">{invoice.student.fullName}</span>
                              <span className="text-xs text-slate-500">
                                {[invoice.student.class?.name, invoice.student.section?.name]
                                  .filter(Boolean)
                                  .join(" - ") || "Class not assigned"}
                              </span>
                            </div>
                          </TD>
                          <TD>{formatCurrency(total)}</TD>
                          <TD>{formatCurrency(paid)}</TD>
                          <TD>{formatCurrency(balance)}</TD>
                          <TD>{invoice.status.replaceAll("_", " ")}</TD>
                          <TD>
                            <div className="flex flex-wrap justify-end gap-2">
                              {balance > 0 ? (
                                <Dialog
                                  title={`Collect payment for ${invoice.invoiceNumber}`}
                                  description="Record full or partial collection without any online gateway."
                                  triggerLabel="Collect"
                                >
                                  <FeePaymentForm feeInvoiceId={invoice.id} maxAmount={balance} />
                                </Dialog>
                              ) : null}
                              {latestPayment ? (
                                <Link href={`/dashboard/fees/receipts/${latestPayment.id}`}>
                                  <Button variant="secondary" size="sm">Receipt</Button>
                                </Link>
                              ) : null}
                            </div>
                          </TD>
                        </tr>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                title="No fee invoices yet"
                description="Generate the first invoice once a fee structure and student record are ready."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Pending dues report</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Outstanding invoices that still need collection follow-up.
            </p>
          </CardHeader>
          <CardContent>
            {pendingInvoices.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Student</TH>
                      <TH>Invoice</TH>
                      <TH>Due date</TH>
                      <TH>Balance due</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {pendingInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <TD className="font-medium text-slate-950">{invoice.student.fullName}</TD>
                        <TD>{invoice.invoiceNumber}</TD>
                        <TD>{invoice.dueDate.toLocaleDateString("en-IN")}</TD>
                        <TD>
                          {formatCurrency(
                            Math.max(
                              0,
                              fromMoney(invoice.totalAmount) - fromMoney(invoice.paidAmount)
                            )
                          )}
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No pending dues right now.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily and monthly collection report</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Quick finance view for today and the current month. Online payment remains a future placeholder only.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FinanceStat label="Today" value={formatCurrency(todayCollections)} count={dailyPayments.length} />
              <FinanceStat label="This month" value={formatCurrency(monthCollections)} count={monthlyPayments.length} />
            </div>
            {monthlyPayments.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Receipt</TH>
                      <TH>Date</TH>
                      <TH>Invoice</TH>
                      <TH>Mode</TH>
                      <TH>Amount</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {monthlyPayments.slice(0, 12).map((payment) => (
                      <tr key={payment.id}>
                        <TD className="font-medium text-slate-950">{payment.receiptNumber}</TD>
                        <TD>{payment.paymentDate.toLocaleDateString("en-IN")}</TD>
                        <TD>{payment.feeInvoice.invoiceNumber}</TD>
                        <TD>{payment.paymentMode.replaceAll("_", " ")}</TD>
                        <TD>{formatCurrency(fromMoney(payment.amount))}</TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No payments have been recorded this month yet.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-panel">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-brand-700">
        {icon}
      </div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function FinanceStat({
  label,
  value,
  count
}: {
  label: string;
  value: string;
  count: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{count} collection record{count === 1 ? "" : "s"}</p>
    </div>
  );
}
