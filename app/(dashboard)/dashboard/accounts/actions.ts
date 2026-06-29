"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createExpenseVoucher,
  generateExpenseVoucherNumber,
  saveExpenseCategory,
  updateExpenseVoucherStatus
} from "@/lib/services/accounts.service";
import {
  expenseCategorySchema,
  expenseVoucherSchema,
  expenseVoucherStatusSchema
} from "@/lib/validations/accounts";

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
    const category = await saveExpenseCategory({
      schoolId: session.schoolId,
      id: data.id,
      name: data.name,
      code: data.code,
      description: data.description,
      isActive: data.isActive
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
    const voucherNumber = await generateExpenseVoucherNumber(session.schoolId);
    const voucher = await createExpenseVoucher({
      schoolId: session.schoolId,
      categoryId: data.categoryId,
      voucherNumber,
      expenseDate: data.expenseDate,
      paidTo: data.paidTo,
      vendorName: data.vendorName,
      amount: data.amount,
      paymentMode: data.paymentMode,
      referenceNo: data.referenceNo,
      description: data.description
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
    const voucher = await updateExpenseVoucherStatus({
      schoolId: session.schoolId,
      userId: session.userId,
      voucherId: parsed.data.voucherId,
      status: parsed.data.status
    });

    await recordAuditLog({ actorUserId: session.userId, schoolId: session.schoolId, action: "expense.voucher.status.updated", entityType: "ExpenseVoucher", entityId: voucher.id, metadata: { status: parsed.data.status } });
    revalidatePath("/dashboard/accounts");
    return { status: "success", message: "Expense voucher status updated." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to update expense voucher." };
  }
}
