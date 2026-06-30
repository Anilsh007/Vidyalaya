"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import {
  updatePayrollSlipStatus
} from "@/lib/services/payroll.service";
import {
  payrollRunSchema,
  payrollRunStatusSchema,
  payrollSlipStatusSchema
} from "@/lib/validations/payroll";
import { approveRequest, completeRequest, createApprovalRequest, rejectRequest } from "@/lib/workflows/workflow.service";
import { WORKFLOW_TYPES } from "@/lib/workflows/types";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function createPayrollRunAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(RBAC_PERMISSIONS.payrollRun);
  const parsed = payrollRunSchema.safeParse({
    period: getString(formData, "period"),
    paymentDate: getString(formData, "paymentDate"),
    notes: getString(formData, "notes")
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review payroll run details.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const workflow = await createApprovalRequest({
      workflowType: WORKFLOW_TYPES.PAYROLL_RUN,
      actor: session,
      period: parsed.data.period,
      paymentDate: parsed.data.paymentDate,
      notes: parsed.data.notes
    });

    revalidatePath("/dashboard/payroll");
    return { status: "success", message: `${workflow.title} generated and queued for approval.` };
  } catch (error) {
    const message = error instanceof Error && error.message.includes("Unique constraint") ? "Payroll for this month already exists." : error instanceof Error ? error.message : "Unable to create payroll run.";
    return { status: "error", message };
  }
}

export async function updatePayrollSlipStatusAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(RBAC_PERMISSIONS.payrollApprove);
  const parsed = payrollSlipStatusSchema.safeParse({
    slipId: getString(formData, "slipId"),
    status: getString(formData, "status"),
    remarks: getString(formData, "remarks")
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review payroll slip decision.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const slip = await updatePayrollSlipStatus({
      schoolId: session.schoolId,
      slipId: parsed.data.slipId,
      status: parsed.data.status,
      remarks: parsed.data.remarks
    });

    await recordAuditLog({ actorUserId: session.userId, schoolId: session.schoolId, action: "payroll.slip.status.updated", entityType: "PayrollSlip", entityId: slip.id, metadata: { status: parsed.data.status } });
    revalidatePath("/dashboard/payroll");
    return { status: "success", message: "Payroll slip updated." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to update payroll slip." };
  }
}

export async function updatePayrollRunStatusAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(RBAC_PERMISSIONS.payrollRead);
  const parsed = payrollRunStatusSchema.safeParse({
    payrollRunId: getString(formData, "payrollRunId"),
    status: getString(formData, "status"),
    remarks: getString(formData, "remarks")
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review payroll run status.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const workflowInput = {
      actor: session,
      workflowType: WORKFLOW_TYPES.PAYROLL_RUN,
      targetId: parsed.data.payrollRunId,
      remarks: parsed.data.remarks
    } as const;

    if (parsed.data.status === "FINALIZED") {
      await approveRequest(workflowInput);
    } else if (parsed.data.status === "PAID") {
      await completeRequest(workflowInput);
    } else {
      await rejectRequest(workflowInput);
    }

    revalidatePath("/dashboard/payroll");
    return { status: "success", message: "Payroll workflow updated." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to update payroll run." };
  }
}
