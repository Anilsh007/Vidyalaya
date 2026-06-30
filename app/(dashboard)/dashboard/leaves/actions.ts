"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/access";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { calculateLeaveDays, leaveRequestSchema, leaveReviewSchema } from "@/lib/validations/leaves";
import { approveRequest, cancelRequest, createApprovalRequest, rejectRequest } from "@/lib/workflows/workflow.service";
import { WORKFLOW_TYPES } from "@/lib/workflows/types";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || undefined;
}

export async function saveLeaveRequestAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(RBAC_PERMISSIONS.leavesRequest);
  const parsed = leaveRequestSchema.safeParse({
    requesterType: getString(formData, "requesterType") || "STUDENT",
    studentId: getOptionalString(formData, "studentId"),
    staffId: getOptionalString(formData, "staffId"),
    leaveType: getString(formData, "leaveType"),
    startDate: getString(formData, "startDate"),
    endDate: getString(formData, "endDate"),
    reason: getString(formData, "reason")
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review the leave request.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    const workflow = await createApprovalRequest({
      workflowType: WORKFLOW_TYPES.LEAVE_REQUEST,
      actor: session,
      requesterType: data.requesterType,
      studentId: data.studentId,
      staffId: data.staffId,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason
    });

    revalidatePath("/dashboard/leaves");
    return {
      status: "success",
      message: "Leave request submitted for approval.",
      meta: { leaveId: workflow.id, totalDays: calculateLeaveDays(data.startDate, data.endDate) }
    };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to create leave request." };
  }
}

export async function reviewLeaveRequestAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(RBAC_PERMISSIONS.leavesApprove);
  const parsed = leaveReviewSchema.safeParse({
    leaveId: getString(formData, "leaveId"),
    status: getString(formData, "status"),
    reviewRemarks: getString(formData, "reviewRemarks")
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review the decision.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    const workflowInput = {
      actor: session,
      workflowType: WORKFLOW_TYPES.LEAVE_REQUEST,
      targetId: data.leaveId,
      remarks: data.reviewRemarks
    } as const;

    if (data.status === "APPROVED") {
      await approveRequest(workflowInput);
    } else if (data.status === "REJECTED") {
      await rejectRequest(workflowInput);
    } else {
      await cancelRequest(workflowInput);
    }

    revalidatePath("/dashboard/leaves");
    return { status: "success", message: "Leave workflow updated." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to update leave request." };
  }
}
