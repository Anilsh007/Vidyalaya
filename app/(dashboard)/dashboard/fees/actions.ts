"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  computeInvoiceStatus,
  feeHeadSchema,
  feeInvoiceSchema,
  feePaymentSchema,
  feeStructureSchema,
  fromMoney,
  nextInvoiceNumber,
  nextReceiptNumber,
  toMoney
} from "@/lib/fees";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentAcademicYear } from "@/lib/school";

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
  const session = await requirePermission(PERMISSIONS.manageFees);
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

  const data = parsed.data;
  const existingHead = data.id
    ? await db.feeHead.findFirst({
        where: {
          id: data.id,
          schoolId: session.schoolId
        }
      })
    : null;

  if (data.id && !existingHead) {
    return {
      status: "error",
      message: "Fee head not found."
    };
  }

  const result = data.id
    ? await db.feeHead.update({
        where: { id: data.id },
        data: {
          name: data.name,
          code: data.code.toUpperCase(),
          description: data.description || null,
          isOptional: data.isOptional === "yes"
        }
      })
    : await db.feeHead.create({
        data: {
          schoolId: session.schoolId,
          name: data.name,
          code: data.code.toUpperCase(),
          description: data.description || null,
          isOptional: data.isOptional === "yes"
        }
      });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: data.id ? "fee_head.updated" : "fee_head.created",
    entityType: "FeeHead",
    entityId: result.id,
    metadata: {
      name: data.name,
      code: data.code.toUpperCase()
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/fees");

  return {
    status: "success",
    message: data.id ? "Fee head updated." : "Fee head created."
  };
}

export async function saveFeeStructureAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageFees);
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

  const feeHeads = await db.feeHead.findMany({
    where: { schoolId: session.schoolId },
    orderBy: { name: "asc" }
  });

  const itemInputs = feeHeads
    .map((head) => ({
      feeHeadId: head.id,
      label: head.name,
      amount: Number(getString(formData, `amount_${head.id}`) || 0)
    }))
    .filter((item) => item.amount > 0);

  if (!itemInputs.length) {
    return {
      status: "error",
      message: "Add at least one fee amount to save the structure."
    };
  }

  const data = parsed.data;

  try {
    const structure = await db.$transaction(async (tx) => {
      if (data.id) {
        const existing = await tx.feeStructure.findFirst({
          where: {
            id: data.id,
            schoolId: session.schoolId
          }
        });

        if (!existing) {
          throw new Error("Fee structure not found.");
        }
      }

      const saved = data.id
        ? await tx.feeStructure.update({
            where: { id: data.id },
            data: {
              classId: data.classId || null,
              name: data.name,
              effectiveFrom: new Date(`${data.effectiveFrom}T00:00:00.000Z`),
              effectiveTo: data.effectiveTo
                ? new Date(`${data.effectiveTo}T23:59:59.999Z`)
                : null
            }
          })
        : await tx.feeStructure.create({
            data: {
              schoolId: session.schoolId,
              classId: data.classId || null,
              name: data.name,
              effectiveFrom: new Date(`${data.effectiveFrom}T00:00:00.000Z`),
              effectiveTo: data.effectiveTo
                ? new Date(`${data.effectiveTo}T23:59:59.999Z`)
                : null
            }
          });

      await tx.feeStructureItem.deleteMany({
        where: { feeStructureId: saved.id }
      });

      await tx.feeStructureItem.createMany({
        data: itemInputs.map((item) => ({
          feeStructureId: saved.id,
          feeHeadId: item.feeHeadId,
          amount: toMoney(item.amount)
        }))
      });

      return saved;
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: data.id ? "fee_structure.updated" : "fee_structure.created",
      entityType: "FeeStructure",
      entityId: structure.id,
      metadata: {
        classId: data.classId || null,
        name: data.name,
        heads: itemInputs.map((item) => ({
          feeHeadId: item.feeHeadId,
          amount: item.amount
        }))
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/fees");

    return {
      status: "success",
      message: data.id ? "Fee structure updated." : "Fee structure saved."
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
  const session = await requirePermission(PERMISSIONS.manageFees);
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

  const student = await db.student.findFirst({
    where: {
      id: parsed.data.studentId,
      schoolId: session.schoolId
    },
    include: {
      class: true,
      section: true
    }
  });

  if (!student) {
    return {
      status: "error",
      message: "Student not found."
    };
  }

  const structure =
    (student.classId
      ? await db.feeStructure.findFirst({
          where: {
            schoolId: session.schoolId,
            classId: student.classId
          },
          include: {
            items: {
              include: { feeHead: true }
            }
          },
          orderBy: [{ effectiveFrom: "desc" }]
        })
      : null) ??
    (await db.feeStructure.findFirst({
    where: {
      schoolId: session.schoolId,
      classId: null
    },
    include: {
      items: {
        include: { feeHead: true }
      }
    },
    orderBy: [{ effectiveFrom: "desc" }]
  }));

  if (!structure || !structure.items.length) {
    return {
      status: "error",
      message: "No fee structure is available for this student's class."
    };
  }

  const baseAmount = structure.items.reduce((sum, item) => sum + fromMoney(item.amount), 0);
  const totalAmount = Math.max(
    0,
    baseAmount + parsed.data.fineAmount - parsed.data.discountAmount
  );
  const dueDate = new Date(`${parsed.data.dueDate}T23:59:59.999Z`);
  const invoiceNumber = await nextInvoiceNumber(session.schoolId);

  const invoice = await db.$transaction(async (tx) => {
    const created = await tx.feeInvoice.create({
      data: {
        schoolId: session.schoolId,
        academicYearId: academicYear.id,
        studentId: student.id,
        invoiceNumber,
        dueDate,
        totalAmount: toMoney(totalAmount),
        discountAmount: toMoney(parsed.data.discountAmount),
        fineAmount: toMoney(parsed.data.fineAmount),
        notes: parsed.data.notes || null,
        status: computeInvoiceStatus(totalAmount, 0, dueDate),
        items: {
          create: structure.items.map((item) => ({
            feeHeadId: item.feeHeadId,
            label: item.feeHead.name,
            amount: item.amount
          }))
        }
      },
      include: {
        items: true
      }
    });

    return created;
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "fee_invoice.created",
    entityType: "FeeInvoice",
    entityId: invoice.id,
    metadata: {
      invoiceNumber,
      studentId: student.id,
      structureId: structure.id,
      discountAmount: parsed.data.discountAmount,
      fineAmount: parsed.data.fineAmount,
      totalAmount
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/fees");

  return {
    status: "success",
    message: `Invoice ${invoiceNumber} created successfully.`
  };
}

export async function collectFeePaymentAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageFees);
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

  const invoice = await db.feeInvoice.findFirst({
    where: {
      id: parsed.data.feeInvoiceId,
      schoolId: session.schoolId
    },
    include: {
      student: {
        include: {
          class: true,
          section: true
        }
      },
      items: true,
      payments: true
    }
  });

  if (!invoice) {
    return {
      status: "error",
      message: "Invoice not found."
    };
  }

  const totalAmount = fromMoney(invoice.totalAmount);
  const paidAmount = fromMoney(invoice.paidAmount);
  const balanceBefore = Math.max(0, totalAmount - paidAmount);

  if (parsed.data.amount > balanceBefore) {
    return {
      status: "error",
      message: "Payment cannot exceed the current balance due."
    };
  }

  const receiptNumber = await nextReceiptNumber(session.schoolId);
  const paymentDate = new Date(`${parsed.data.paymentDate}T00:00:00.000Z`);
  const nextPaidAmount = paidAmount + parsed.data.amount;
  const nextStatus = computeInvoiceStatus(totalAmount, nextPaidAmount, invoice.dueDate);

  const payment = await db.$transaction(async (tx) => {
    const created = await tx.feePayment.create({
      data: {
        schoolId: session.schoolId,
        feeInvoiceId: invoice.id,
        receiptNumber,
        paymentDate,
        amount: toMoney(parsed.data.amount),
        paymentMode: parsed.data.paymentMode,
        referenceNo: parsed.data.referenceNo || null,
        remarks: parsed.data.remarks || null
      }
    });

    await tx.feeInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: toMoney(nextPaidAmount),
        status: nextStatus
      }
    });

    return created;
  });

  await Promise.all([
    recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "fee_payment.collected",
      entityType: "FeePayment",
      entityId: payment.id,
      metadata: {
        invoiceId: invoice.id,
        receiptNumber,
        amount: parsed.data.amount,
        paymentMode: parsed.data.paymentMode
      }
    }),
    recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "fee_invoice.updated",
      entityType: "FeeInvoice",
      entityId: invoice.id,
      metadata: {
        paidAmount: nextPaidAmount,
        balanceDue: Math.max(0, totalAmount - nextPaidAmount),
        status: nextStatus
      }
    })
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/fees");

  return {
    status: "success",
    message: `Payment recorded with receipt ${receiptNumber}.`
  };
}
