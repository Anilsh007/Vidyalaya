import { ClipboardList, IndianRupee, ReceiptText, Tags, WalletCards } from "lucide-react";
import type { ExpenseVoucherStatus, FeePaymentMode, Prisma } from "@prisma/client";

import { ExpenseCategoryForm, ExpenseVoucherForm, ExpenseVoucherStatusForm } from "@/components/accounts/account-forms";
import { EmptyState } from "@/components/school/empty-state";
import { InfoPanel, StatusBadge, SummaryCard, TableFrame } from "@/components/shared/dashboard-primitives";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { fromMoney } from "@/lib/fees";
import { PERMISSIONS } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { getWorkspaceAccessCopy, resolveExperienceRole } from "@/lib/dashboard-experience";

export default async function AccountsPage() {
  const session = await requirePermission(PERMISSIONS.viewAccounts);
  const canManageAccounts = session.permissions.includes(PERMISSIONS.manageAccounts);
  const accessCopy = getWorkspaceAccessCopy(resolveExperienceRole(session.roles), "accounts");
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [categories, vouchers, monthlyExpenseAggregate, paidExpenseAggregate] = await Promise.all([
    db.expenseCategory.findMany({ where: { schoolId: session.schoolId }, orderBy: [{ code: "asc" }] }),
    db.expenseVoucher.findMany({ where: { schoolId: session.schoolId }, include: { category: true }, orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }], take: 60 }),
    db.expenseVoucher.aggregate({ where: { schoolId: session.schoolId, expenseDate: { gte: monthStart }, status: { not: "CANCELLED" } }, _sum: { amount: true } }),
    db.expenseVoucher.aggregate({ where: { schoolId: session.schoolId, status: "PAID" }, _sum: { amount: true } })
  ]);

  const activeCategories = categories.filter((category) => category.isActive);
  const draftVouchers = vouchers.filter((voucher) => voucher.status === "DRAFT");
  const approvedVouchers = vouchers.filter((voucher) => voucher.status === "APPROVED");
  const monthlyExpense = fromMoney(monthlyExpenseAggregate._sum.amount);
  const paidExpense = fromMoney(paidExpenseAggregate._sum.amount);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 20"
        title="Accounts and expenses"
        description="Create expense categories, record school expense vouchers, approve bills, mark payments, and export expense reports for accounting review."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Categories" value={activeCategories.length.toString()} icon={<Tags className="h-5 w-5" />} />
        <SummaryCard title="This month" value={formatCurrency(monthlyExpense)} icon={<IndianRupee className="h-5 w-5" />} />
        <SummaryCard title="Draft vouchers" value={draftVouchers.length.toString()} icon={<ClipboardList className="h-5 w-5" />} />
        <SummaryCard title="Paid expenses" value={formatCurrency(paidExpense)} icon={<WalletCards className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader><CardTitle>{canManageAccounts ? "New expense voucher" : "Expense controls"}</CardTitle><p className="text-sm leading-6 text-slate-600">{canManageAccounts ? "Record bill, vendor, amount, payment mode, and expense category." : accessCopy.summary}</p></CardHeader>
          <CardContent>{canManageAccounts ? <ExpenseVoucherForm categories={activeCategories.map((category) => ({ id: category.id, code: category.code, name: category.name }))} /> : <EmptyState title={accessCopy.title} description={accessCopy.description} />}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Expense categories</CardTitle><p className="text-sm leading-6 text-slate-600">Maintain reusable heads such as utilities, repairs, supplies, events, and maintenance.</p></CardHeader>
          <CardContent className="grid gap-5">
            {canManageAccounts ? <ExpenseCategoryForm /> : null}
            {categories.length ? (
              <TableFrame><Table><THead><tr><TH>Code</TH><TH>Name</TH><TH>Status</TH><TH className="text-right">Action</TH></tr></THead><TBody>{categories.map((category) => (<tr key={category.id}><TD>{category.code}</TD><TD><div className="grid gap-1"><span className="font-medium text-slate-950">{category.name}</span><span className="text-xs text-slate-500">{category.description ?? "No description"}</span></div></TD><TD><StatusBadge status={category.isActive ? "ACTIVE" : "INACTIVE"} toneMap={{ ACTIVE: "bg-emerald-50 text-emerald-700", INACTIVE: "bg-red-50 text-red-700" }} /></TD><TD className="text-right">{canManageAccounts ? <Dialog title={`Edit ${category.name}`} description="Update category label and active status." triggerLabel="Edit"><ExpenseCategoryForm defaultValues={category} /></Dialog> : <span className="text-sm text-slate-500">View only</span>}</TD></tr>))}</TBody></Table></TableFrame>
            ) : <EmptyState title="No categories" description="Create an expense category before recording vouchers." />}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader><CardTitle>Approval queue</CardTitle><p className="text-sm leading-6 text-slate-600">Draft and approved vouchers that need accounting action.</p></CardHeader>
        <CardContent>{draftVouchers.length || approvedVouchers.length ? <VoucherTable vouchers={[...draftVouchers, ...approvedVouchers]} canManage={canManageAccounts} /> : <EmptyState title="No pending vouchers" description="All recent expense vouchers are either paid or cancelled." />}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Expense register</CardTitle><p className="text-sm leading-6 text-slate-600">Recent voucher history with category, paid-to details, amount, status, and payment references.</p></CardHeader>
        <CardContent>{vouchers.length ? <VoucherTable vouchers={vouchers} canManage={canManageAccounts} /> : <EmptyState title="No expense vouchers" description="Create the first expense voucher to start accounting records." />}</CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
          <InfoPanel title="Approval discipline" value={`${draftVouchers.length} draft`} description="Draft vouchers should be approved before accounts marks them as paid." icon={<ReceiptText className="h-5 w-5" />} />
          <InfoPanel title="Payment tracking" value={formatCurrency(paidExpense)} description="Paid totals help accounts compare cash/bank outflow against supporting vouchers." icon={<ReceiptText className="h-5 w-5" />} />
          <InfoPanel title="Category control" value={`${activeCategories.length} active`} description="Expense categories keep reports grouped by operational spending heads." icon={<ReceiptText className="h-5 w-5" />} />
        </section>
      </div>
    );
  }

type Voucher = {
  id: string;
  voucherNumber: string;
  expenseDate: Date;
  paidTo: string;
  vendorName: string | null;
  description: string;
  amount: Prisma.Decimal;
  paymentMode: FeePaymentMode;
  referenceNo: string | null;
  status: ExpenseVoucherStatus;
  category: { code: string; name: string };
};

function VoucherTable({ vouchers, canManage }: { vouchers: Voucher[]; canManage: boolean }) {
  return <TableFrame><Table><THead><tr><TH>Voucher</TH><TH>Category</TH><TH>Paid to</TH><TH>Amount</TH><TH>Mode</TH><TH>Status</TH><TH className="text-right">Action</TH></tr></THead><TBody>{vouchers.map((voucher) => (<tr key={voucher.id}><TD><div className="grid gap-1"><span className="font-medium text-slate-950">{voucher.voucherNumber}</span><span className="text-xs text-slate-500">{formatDate(voucher.expenseDate)}</span></div></TD><TD>{voucher.category.code} - {voucher.category.name}</TD><TD><div className="grid gap-1"><span>{voucher.paidTo}</span><span className="text-xs text-slate-500">{voucher.vendorName ?? voucher.description}</span></div></TD><TD>{formatCurrency(fromMoney(voucher.amount))}</TD><TD>{voucher.paymentMode.replaceAll("_", " ")}{voucher.referenceNo ? <p className="text-xs text-slate-500">{voucher.referenceNo}</p> : null}</TD><TD><StatusBadge status={voucher.status} toneMap={{ PAID: "bg-emerald-50 text-emerald-700", ACTIVE: "bg-emerald-50 text-emerald-700", APPROVED: "bg-blue-50 text-blue-700", CANCELLED: "bg-red-50 text-red-700", INACTIVE: "bg-red-50 text-red-700", DRAFT: "bg-amber-50 text-amber-700" }} /></TD><TD className="text-right">{canManage ? <Dialog title={`Update ${voucher.voucherNumber}`} description="Approve, mark paid, or cancel this expense voucher." triggerLabel="Update"><ExpenseVoucherStatusForm voucherId={voucher.id} /></Dialog> : <span className="text-sm text-slate-500">View only</span>}</TD></tr>))}</TBody></Table></TableFrame>;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

