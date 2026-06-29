"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createPayrollRun,
  updatePayrollRunStatus,
  updatePayrollSlipStatus
} from "@/lib/services/payroll.service";
import {
  parsePayrollPeriod,
  payrollPeriodLabel,
  payrollRunSchema,
  payrollRunStatusSchema,
  payrollSlipStatusSchema
} from "@/lib/validations/payroll";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function createPayrollRunAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.managePayroll);
  const parsed = payrollRunSchema.safeParse({
    period: getString(formData, "period"),
    paymentDate: getString(formData, "paymentDate"),
    notes: getString(formData, "notes")
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review payroll run details.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { periodMonth, periodYear } = parsePayrollPeriod(parsed.data.period);
  const title = `${payrollPeriodLabel(periodMonth, periodYear)} Payroll`;

  try {
    const { payrollRun, staffCount } = await createPayrollRun({
      schoolId: session.schoolId,
      userId: session.userId,
      title,
      periodMonth,
      periodYear,
      paymentDate: parsed.data.paymentDate,
      notes: parsed.data.notes
    });

    await recordAuditLog({ actorUserId: session.userId, schoolId: session.schoolId, action: "payroll.run.created", entityType: "PayrollRun", entityId: payrollRun.id, metadata: { title, slips: staffCount } });
    revalidatePath("/dashboard/payroll");
    return { status: "success", message: `Payroll run created with ${staffCount} slip(s).` };
  } catch (error) {
    const message = error instanceof Error && error.message.includes("Unique constraint") ? "Payroll for this month already exists." : error instanceof Error ? error.message : "Unable to create payroll run.";
    return { status: "error", message };
  }
}

export async function updatePayrollSlipStatusAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.managePayroll);
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
  const session = await requirePermission(PERMISSIONS.managePayroll);
  const parsed = payrollRunStatusSchema.safeParse({
    payrollRunId: getString(formData, "payrollRunId"),
    status: getString(formData, "status")
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review payroll run status.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const payrollRun = await updatePayrollRunStatus({
      schoolId: session.schoolId,
      payrollRunId: parsed.data.payrollRunId,
      status: parsed.data.status
    });

    await recordAuditLog({ actorUserId: session.userId, schoolId: session.schoolId, action: "payroll.run.status.updated", entityType: "PayrollRun", entityId: payrollRun.id, metadata: { status: parsed.data.status } });
    revalidatePath("/dashboard/payroll");
    return { status: "success", message: "Payroll run status updated." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to update payroll run." };
  }
}
