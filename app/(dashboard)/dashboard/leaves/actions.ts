"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import { reviewLeaveRequest, saveLeaveRequest } from "@/lib/services/leaves.service";
import { calculateLeaveDays, leaveRequestSchema, leaveReviewSchema } from "@/lib/validations/leaves";

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
  const session = await requirePermission(PERMISSIONS.manageLeaves);
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
    const { leave, requesterName } = await saveLeaveRequest({
      schoolId: session.schoolId,
      requesterType: data.requesterType,
      studentId: data.studentId,
      staffId: data.staffId,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
      totalDays: calculateLeaveDays(data.startDate, data.endDate)
    });

    await recordAuditLog({ actorUserId: session.userId, schoolId: session.schoolId, action: "leave.request.created", entityType: "LeaveRequest", entityId: leave.id, metadata: { requesterName, leaveType: data.leaveType } });
    revalidatePath("/dashboard/leaves");
    return { status: "success", message: "Leave request created." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to create leave request." };
  }
}

export async function reviewLeaveRequestAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageLeaves);
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
    const leave = await reviewLeaveRequest({
      schoolId: session.schoolId,
      userId: session.userId,
      leaveId: data.leaveId,
      status: data.status,
      reviewRemarks: data.reviewRemarks
    });

    await recordAuditLog({ actorUserId: session.userId, schoolId: session.schoolId, action: "leave.request.reviewed", entityType: "LeaveRequest", entityId: leave.id, metadata: { status: data.status } });
    revalidatePath("/dashboard/leaves");
    return { status: "success", message: "Leave request updated." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to update leave request." };
  }
}
