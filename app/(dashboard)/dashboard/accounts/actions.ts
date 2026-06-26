"use server";

import { revalidatePath } from "next/cache";
import { ExpenseVoucherStatus, Prisma } from "@prisma/client";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { expenseCategorySchema, expenseVoucherSchema, expenseVoucherStatusSchema, nextExpenseVoucherNumber } from "@/lib/accounts";
import { db } from "@/lib/db";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || undefined;
}

export async function saveExpenseCategoryAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageAccounts);
  const parsed = expenseCategorySchema.safeParse({
    id: getOptionalString(formData, "id"),
    name: getString(formData, "name"),
    code: getString(formData, "code").toUpperCase(),
    description: getString(formData, "description"),
    isActive: getString(formData, "isActive") || "yes"
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review expense category details.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    if (data.id) {
      const existing = await db.expenseCategory.findFirst({ where: { id: data.id, schoolId: session.schoolId }, select: { id: true } });
      if (!existing) throw new Error("Expense category not found.");
    }

    const category = data.id
      ? await db.expenseCategory.update({
          where: { id: data.id },
          data: { name: data.name, code: data.code, description: data.description || null, isActive: data.isActive === "yes" }
        })
      : await db.expenseCategory.create({
          data: { schoolId: session.schoolId, name: data.name, code: data.code, description: data.description || null, isActive: data.isActive === "yes" }
        });

    await recordAuditLog({ actorUserId: session.userId, schoolId: session.schoolId, action: data.id ? "expense.category.updated" : "expense.category.created", entityType: "ExpenseCategory", entityId: category.id, metadata: { code: category.code } });
    revalidatePath("/dashboard/accounts");
    return { status: "success", message: data.id ? "Expense category updated." : "Expense category created." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to save category." };
  }
}

export async function createExpenseVoucherAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageAccounts);
  const parsed = expenseVoucherSchema.safeParse({
    categoryId: getString(formData, "categoryId"),
    expenseDate: getString(formData, "expenseDate"),
    paidTo: getString(formData, "paidTo"),
    vendorName: getString(formData, "vendorName"),
    amount: getString(formData, "amount"),
    paymentMode: getString(formData, "paymentMode"),
    referenceNo: getString(formData, "referenceNo"),
    description: getString(formData, "description")
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review expense voucher details.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    const category = await db.expenseCategory.findFirst({ where: { id: data.categoryId, schoolId: session.schoolId, isActive: true }, select: { id: true } });
    if (!category) throw new Error("Expense category not found.");

    const count = await db.expenseVoucher.count({ where: { schoolId: session.schoolId } });
    const voucherNumber = await nextExpenseVoucherNumber(count);
    const voucher = await db.expenseVoucher.create({
      data: {
        schoolId: session.schoolId,
        categoryId: data.categoryId,
        voucherNumber,
        expenseDate: new Date(`${data.expenseDate}T00:00:00.000Z`),
        paidTo: data.paidTo,
        vendorName: data.vendorName || null,
        amount: new Prisma.Decimal(data.amount),
        paymentMode: data.paymentMode,
        referenceNo: data.referenceNo || null,
        description: data.description
      }
    });

    await recordAuditLog({ actorUserId: session.userId, schoolId: session.schoolId, action: "expense.voucher.created", entityType: "ExpenseVoucher", entityId: voucher.id, metadata: { voucherNumber, amount: data.amount } });
    revalidatePath("/dashboard/accounts");
    return { status: "success", message: `Expense voucher ${voucherNumber} created.` };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to create expense voucher." };
  }
}

export async function updateExpenseVoucherStatusAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageAccounts);
  const parsed = expenseVoucherStatusSchema.safeParse({
    voucherId: getString(formData, "voucherId"),
    status: getString(formData, "status")
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review voucher status.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const existing = await db.expenseVoucher.findFirst({ where: { id: parsed.data.voucherId, schoolId: session.schoolId }, select: { id: true } });
    if (!existing) throw new Error("Expense voucher not found.");

    const voucher = await db.expenseVoucher.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status as ExpenseVoucherStatus,
        approvedById: parsed.data.status === "APPROVED" || parsed.data.status === "PAID" ? session.userId : undefined,
        approvedAt: parsed.data.status === "APPROVED" || parsed.data.status === "PAID" ? new Date() : undefined,
        paidAt: parsed.data.status === "PAID" ? new Date() : undefined
      }
    });

    await recordAuditLog({ actorUserId: session.userId, schoolId: session.schoolId, action: "expense.voucher.status.updated", entityType: "ExpenseVoucher", entityId: voucher.id, metadata: { status: parsed.data.status } });
    revalidatePath("/dashboard/accounts");
    return { status: "success", message: "Expense voucher status updated." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to update expense voucher." };
  }
}
