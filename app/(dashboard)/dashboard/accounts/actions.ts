"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import {
  saveExpenseCategory,
} from "@/lib/services/accounts.service";
import {
  expenseCategorySchema,
  expenseVoucherSchema,
  expenseVoucherStatusSchema
} from "@/lib/validations/accounts";
import { approveRequest, completeRequest, createApprovalRequest, rejectRequest } from "@/lib/workflows/workflow.service";
import { WORKFLOW_TYPES } from "@/lib/workflows/types";

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
  const session = await requirePermission(RBAC_PERMISSIONS.accountsExpensesManage);
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
  const session = await requirePermission(RBAC_PERMISSIONS.accountsExpensesManage);
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
    const workflow = await createApprovalRequest({
      workflowType: WORKFLOW_TYPES.EXPENSE_VOUCHER,
      actor: session,
      categoryId: data.categoryId,
      expenseDate: data.expenseDate,
      paidTo: data.paidTo,
      vendorName: data.vendorName,
      amount: data.amount,
      paymentMode: data.paymentMode,
      referenceNo: data.referenceNo,
      description: data.description
    });

    revalidatePath("/dashboard/accounts");
    return { status: "success", message: `Expense voucher ${workflow.title} submitted.` };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to create expense voucher." };
  }
}

export async function updateExpenseVoucherStatusAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(RBAC_PERMISSIONS.accountsRead);
  const parsed = expenseVoucherStatusSchema.safeParse({
    voucherId: getString(formData, "voucherId"),
    status: getString(formData, "status"),
    remarks: getString(formData, "remarks")
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review voucher status.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const workflowInput = {
      actor: session,
      workflowType: WORKFLOW_TYPES.EXPENSE_VOUCHER,
      targetId: parsed.data.voucherId,
      remarks: parsed.data.remarks
    } as const;

    if (parsed.data.status === "APPROVED") {
      await approveRequest(workflowInput);
    } else if (parsed.data.status === "PAID") {
      await completeRequest(workflowInput);
    } else {
      await rejectRequest(workflowInput);
    }

    revalidatePath("/dashboard/accounts");
    return { status: "success", message: "Expense workflow updated." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to update expense voucher." };
  }
}
