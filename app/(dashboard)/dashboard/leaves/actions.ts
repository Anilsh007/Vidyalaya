"use server";

import { revalidatePath } from "next/cache";
import { LeaveRequesterType, LeaveRequestStatus, Prisma } from "@prisma/client";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { calculateLeaveDays, leaveRequestSchema, leaveReviewSchema } from "@/lib/leaves";
import { PERMISSIONS } from "@/lib/permissions";

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
    let requesterName = "";
    if (data.requesterType === "STUDENT") {
      const student = await db.student.findFirst({ where: { id: data.studentId, schoolId: session.schoolId }, select: { fullName: true } });
      if (!student) throw new Error("Student not found.");
      requesterName = student.fullName;
    } else {
      const staff = await db.staff.findFirst({ where: { id: data.staffId, schoolId: session.schoolId }, select: { fullName: true } });
      if (!staff) throw new Error("Staff member not found.");
      requesterName = staff.fullName;
    }

    const leave = await db.leaveRequest.create({
      data: {
        schoolId: session.schoolId,
        requesterType: data.requesterType as LeaveRequesterType,
        studentId: data.requesterType === "STUDENT" ? data.studentId : null,
        staffId: data.requesterType === "STAFF" ? data.staffId : null,
        requesterName,
        leaveType: data.leaveType,
        startDate: new Date(`${data.startDate}T00:00:00.000Z`),
        endDate: new Date(`${data.endDate}T23:59:59.999Z`),
        totalDays: new Prisma.Decimal(calculateLeaveDays(data.startDate, data.endDate)),
        reason: data.reason
      }
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
    const existing = await db.leaveRequest.findFirst({ where: { id: data.leaveId, schoolId: session.schoolId }, select: { id: true } });
    if (!existing) throw new Error("Leave request not found.");

    const leave = await db.leaveRequest.update({
      where: { id: existing.id },
      data: {
        status: data.status as LeaveRequestStatus,
        reviewedById: session.userId,
        reviewedAt: new Date(),
        reviewRemarks: data.reviewRemarks || null
      }
    });

    await recordAuditLog({ actorUserId: session.userId, schoolId: session.schoolId, action: "leave.request.reviewed", entityType: "LeaveRequest", entityId: leave.id, metadata: { status: data.status } });
    revalidatePath("/dashboard/leaves");
    return { status: "success", message: "Leave request updated." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to update leave request." };
  }
}
