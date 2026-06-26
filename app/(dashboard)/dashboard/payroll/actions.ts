"use server";

import { revalidatePath } from "next/cache";
import { PayrollRunStatus, PayrollSlipStatus, Prisma } from "@prisma/client";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { parsePayrollPeriod, payrollPeriodLabel, payrollRunSchema, payrollRunStatusSchema, payrollSlipStatusSchema } from "@/lib/payroll";
import { PERMISSIONS } from "@/lib/permissions";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalDate(value?: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
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
    const staff = await db.staff.findMany({
      where: { schoolId: session.schoolId, isArchived: false, salaryAmount: { not: null } },
      orderBy: [{ fullName: "asc" }]
    });

    if (!staff.length) {
      return { status: "error", message: "No active staff with salary reference found." };
    }

    const payrollRun = await db.payrollRun.create({
      data: {
        schoolId: session.schoolId,
        title,
        periodMonth,
        periodYear,
        paymentDate: getOptionalDate(parsed.data.paymentDate),
        notes: parsed.data.notes || null,
        createdById: session.userId,
        slips: {
          create: staff.map((member) => {
            const grossPay = new Prisma.Decimal(member.salaryAmount ?? 0);
            return {
              schoolId: session.schoolId,
              staffId: member.id,
              staffName: member.fullName,
              employeeCode: member.employeeCode,
              designation: member.designation,
              grossPay,
              allowances: new Prisma.Decimal(0),
              deductions: new Prisma.Decimal(0),
              netPay: grossPay
            };
          })
        }
      }
    });

    await recordAuditLog({ actorUserId: session.userId, schoolId: session.schoolId, action: "payroll.run.created", entityType: "PayrollRun", entityId: payrollRun.id, metadata: { title, slips: staff.length } });
    revalidatePath("/dashboard/payroll");
    return { status: "success", message: `Payroll run created with ${staff.length} slip(s).` };
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
    const existing = await db.payrollSlip.findFirst({ where: { id: parsed.data.slipId, schoolId: session.schoolId }, select: { id: true } });
    if (!existing) throw new Error("Payroll slip not found.");

    const slip = await db.payrollSlip.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status as PayrollSlipStatus,
        paymentDate: parsed.data.status === "PAID" ? new Date() : null,
        remarks: parsed.data.remarks || null
      }
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
    const existing = await db.payrollRun.findFirst({ where: { id: parsed.data.payrollRunId, schoolId: session.schoolId }, select: { id: true } });
    if (!existing) throw new Error("Payroll run not found.");

    const payrollRun = await db.payrollRun.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status as PayrollRunStatus,
        finalizedAt: parsed.data.status === "FINALIZED" ? new Date() : undefined,
        paidAt: parsed.data.status === "PAID" ? new Date() : undefined
      }
    });

    await recordAuditLog({ actorUserId: session.userId, schoolId: session.schoolId, action: "payroll.run.status.updated", entityType: "PayrollRun", entityId: payrollRun.id, metadata: { status: parsed.data.status } });
    revalidatePath("/dashboard/payroll");
    return { status: "success", message: "Payroll run status updated." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to update payroll run." };
  }
}
