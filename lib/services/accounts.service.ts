import { ExpenseVoucherStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { fromMoney } from "@/lib/fees";
import { nextExpenseVoucherNumber } from "@/lib/validations/accounts";

type ExpenseCategoryInput = {
  schoolId: string;
  id?: string;
  name: string;
  code: string;
  description?: string;
  isActive: string;
};

type ExpenseVoucherInput = {
  schoolId: string;
  categoryId: string;
  voucherNumber: string;
  expenseDate: string;
  paidTo: string;
  vendorName?: string;
  amount: number;
  paymentMode: string;
  referenceNo?: string;
  description: string;
};

type ExpenseVoucherStatusInput = {
  schoolId: string;
  userId: string;
  voucherId: string;
  status: "APPROVED" | "PAID" | "CANCELLED";
};

export async function getAccountsPageData({ schoolId }: { schoolId: string }) {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [categories, vouchers, monthlyExpenseAggregate, paidExpenseAggregate] = await Promise.all([
    db.expenseCategory.findMany({ where: { schoolId }, orderBy: [{ code: "asc" }] }),
    db.expenseVoucher.findMany({
      where: { schoolId },
      include: { category: true },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      take: 60
    }),
    db.expenseVoucher.aggregate({
      where: { schoolId, expenseDate: { gte: monthStart }, status: { not: "CANCELLED" } },
      _sum: { amount: true }
    }),
    db.expenseVoucher.aggregate({
      where: { schoolId, status: "PAID" },
      _sum: { amount: true }
    })
  ]);

  const activeCategories = categories.filter((category) => category.isActive);
  const draftVouchers = vouchers.filter((voucher) => voucher.status === "DRAFT");
  const approvedVouchers = vouchers.filter((voucher) => voucher.status === "APPROVED");
  const monthlyExpense = fromMoney(monthlyExpenseAggregate._sum.amount);
  const paidExpense = fromMoney(paidExpenseAggregate._sum.amount);

  return {
    categories,
    vouchers,
    activeCategories,
    draftVouchers,
    approvedVouchers,
    monthlyExpense,
    paidExpense
  };
}

export async function saveExpenseCategory(input: ExpenseCategoryInput) {
  if (input.id) {
    const existing = await db.expenseCategory.findFirst({
      where: { id: input.id, schoolId: input.schoolId },
      select: { id: true }
    });
    if (!existing) throw new Error("Expense category not found.");

    return db.expenseCategory.update({
      where: { id: input.id },
      data: {
        name: input.name,
        code: input.code,
        description: input.description || null,
        isActive: input.isActive === "yes"
      }
    });
  }

  return db.expenseCategory.create({
    data: {
      schoolId: input.schoolId,
      name: input.name,
      code: input.code,
      description: input.description || null,
      isActive: input.isActive === "yes"
    }
  });
}

export async function createExpenseVoucher(input: ExpenseVoucherInput) {
  const category = await db.expenseCategory.findFirst({
    where: { id: input.categoryId, schoolId: input.schoolId, isActive: true },
    select: { id: true }
  });
  if (!category) throw new Error("Expense category not found.");

  return db.expenseVoucher.create({
    data: {
      schoolId: input.schoolId,
      categoryId: input.categoryId,
      voucherNumber: input.voucherNumber,
      expenseDate: new Date(`${input.expenseDate}T00:00:00.000Z`),
      paidTo: input.paidTo,
      vendorName: input.vendorName || null,
      amount: new Prisma.Decimal(input.amount),
      paymentMode: input.paymentMode as never,
      referenceNo: input.referenceNo || null,
      description: input.description
    }
  });
}

export async function generateExpenseVoucherNumber(schoolId: string) {
  const count = await db.expenseVoucher.count({ where: { schoolId } });
  return nextExpenseVoucherNumber(count);
}

export async function updateExpenseVoucherStatus(input: ExpenseVoucherStatusInput) {
  const existing = await db.expenseVoucher.findFirst({
    where: { id: input.voucherId, schoolId: input.schoolId },
    select: { id: true }
  });
  if (!existing) throw new Error("Expense voucher not found.");

  return db.expenseVoucher.update({
    where: { id: existing.id },
    data: {
      status: input.status as ExpenseVoucherStatus,
      approvedById: input.status === "APPROVED" || input.status === "PAID" ? input.userId : undefined,
      approvedAt: input.status === "APPROVED" || input.status === "PAID" ? new Date() : undefined,
      paidAt: input.status === "PAID" ? new Date() : undefined
    }
  });
}
