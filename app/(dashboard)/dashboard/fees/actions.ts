"use server";

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { requireAnyPermission, requirePermission } from "@/lib/rbac/guards";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import {
  collectFeePayment,
  generateFeeInvoice,
  saveFeeHead,
  saveFeeStructure
} from "@/lib/services/fees.service";
import { getCurrentAcademicYear } from "@/lib/school";
import {
  feeHeadSchema,
  feeInvoiceSchema,
  feePaymentSchema,
  feeStructureSchema
} from "@/lib/validations/fees";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || undefined;
}

export async function saveFeeHeadAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(RBAC_PERMISSIONS.feesUpdate);
  const parsed = feeHeadSchema.safeParse({
    id: getOptionalString(formData, "id"),
    name: getString(formData, "name"),
    code: getString(formData, "code"),
    description: getString(formData, "description"),
    isOptional: getString(formData, "isOptional") || "no"
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the fee head fields.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  try {
    const result = await saveFeeHead({
      schoolId: session.schoolId,
      ...parsed.data
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: parsed.data.id ? "fees.updated" : "fees.created",
      entityType: "FeeHead",
      entityId: result.id,
      metadata: {
        name: result.name,
        code: result.code
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/fees");

    return {
      status: "success",
      message: parsed.data.id ? "Fee head updated." : "Fee head created."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to save fee head."
    };
  }
}

export async function saveFeeStructureAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(RBAC_PERMISSIONS.feesUpdate);
  const parsed = feeStructureSchema.safeParse({
    id: getOptionalString(formData, "id"),
    classId: getOptionalString(formData, "classId"),
    name: getString(formData, "name"),
    effectiveFrom: getString(formData, "effectiveFrom"),
    effectiveTo: getString(formData, "effectiveTo")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the fee structure details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const itemInputs = Array.from(new Set(formData.keys()))
    .filter((key) => key.startsWith("amount_"))
    .map((key) => ({
      feeHeadId: key.replace("amount_", ""),
      amount: Number(getString(formData, key) || 0)
    }))
    .filter((item) => item.amount > 0);

  if (!itemInputs.length) {
    return {
      status: "error",
      message: "Add at least one fee amount to save the structure."
    };
  }

  try {
    const structure = await saveFeeStructure({
      schoolId: session.schoolId,
      ...parsed.data,
      items: itemInputs
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: parsed.data.id ? "fees.updated" : "fees.created",
      entityType: "FeeStructure",
      entityId: structure.id,
      metadata: {
        classId: parsed.data.classId || null,
        name: parsed.data.name,
        heads: itemInputs
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/fees");

    return {
      status: "success",
      message: parsed.data.id ? "Fee structure updated." : "Fee structure saved."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to save fee structure."
    };
  }
}

export async function generateFeeInvoiceAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requireAnyPermission([
    RBAC_PERMISSIONS.feesUpdate,
    RBAC_PERMISSIONS.feesCollect
  ]);
  const academicYear = await getCurrentAcademicYear(session.schoolId);

  if (!academicYear) {
    return {
      status: "error",
      message: "Create an academic year before raising invoices."
    };
  }

  const parsed = feeInvoiceSchema.safeParse({
    studentId: getString(formData, "studentId"),
    dueDate: getString(formData, "dueDate"),
    discountAmount: getString(formData, "discountAmount") || "0",
    fineAmount: getString(formData, "fineAmount") || "0",
    notes: getString(formData, "notes")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the invoice form.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  try {
    const result = await generateFeeInvoice({
      schoolId: session.schoolId,
      academicYearId: academicYear.id,
      ...parsed.data
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "fees.updated",
      entityType: "FeeInvoice",
      entityId: result.invoice.id,
      metadata: {
        subtype: "fees.invoice.generated",
        invoiceNumber: result.invoiceNumber,
        studentId: result.student.id,
        structureId: result.structure.id,
        discountAmount: parsed.data.discountAmount,
        fineAmount: parsed.data.fineAmount,
        totalAmount: result.totalAmount
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/fees");

    return {
      status: "success",
      message: `Invoice ${result.invoiceNumber} created successfully.`
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to create invoice."
    };
  }
}

export async function collectFeePaymentAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(RBAC_PERMISSIONS.feesCollect);
  const parsed = feePaymentSchema.safeParse({
    feeInvoiceId: getString(formData, "feeInvoiceId"),
    paymentDate: getString(formData, "paymentDate"),
    amount: getString(formData, "amount"),
    paymentMode: getString(formData, "paymentMode"),
    referenceNo: getString(formData, "referenceNo"),
    remarks: getString(formData, "remarks")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the payment details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  try {
    const result = await collectFeePayment({
      schoolId: session.schoolId,
      ...parsed.data
    });

    await Promise.all([
      recordAuditLog({
        actorUserId: session.userId,
        schoolId: session.schoolId,
        action: "fees.collected",
        entityType: "FeePayment",
        entityId: result.payment.id,
        metadata: {
          invoiceId: result.invoice.id,
          receiptNumber: result.receiptNumber,
          amount: parsed.data.amount,
          paymentMode: parsed.data.paymentMode
        }
      }),
      recordAuditLog({
        actorUserId: session.userId,
        schoolId: session.schoolId,
        action: "fees.updated",
        entityType: "FeeInvoice",
        entityId: result.invoice.id,
        metadata: {
          subtype: "fees.invoice.updated",
          paidAmount: result.nextPaidAmount,
          balanceDue: Math.max(0, result.totalAmount - result.nextPaidAmount),
          status: result.nextStatus
        }
      })
    ]);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/fees");

    return {
      status: "success",
      message: `Payment recorded with receipt ${result.receiptNumber}.`
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to collect payment."
    };
  }
}
