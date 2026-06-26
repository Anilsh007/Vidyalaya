import { FeeInvoiceStatus, FeePaymentMode, Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";

export const feeHeadSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Fee head name is required."),
  code: z.string().trim().min(2, "Fee head code is required."),
  description: z.string().trim().optional(),
  isOptional: z.enum(["yes", "no"])
});

export const feeStructureSchema = z.object({
  id: z.string().optional(),
  classId: z.string().trim().optional(),
  name: z.string().trim().min(2, "Structure name is required."),
  effectiveFrom: z.string().trim().min(1, "Effective from date is required."),
  effectiveTo: z.string().trim().optional()
});

export const feeInvoiceSchema = z.object({
  studentId: z.string().trim().min(1, "Select a student."),
  dueDate: z.string().trim().min(1, "Due date is required."),
  discountAmount: z.coerce.number().min(0, "Discount cannot be negative."),
  fineAmount: z.coerce.number().min(0, "Late fee cannot be negative."),
  notes: z.string().trim().optional()
});

export const feePaymentSchema = z.object({
  feeInvoiceId: z.string().trim().min(1),
  paymentDate: z.string().trim().min(1, "Payment date is required."),
  amount: z.coerce.number().positive("Payment amount must be greater than zero."),
  paymentMode: z.nativeEnum(FeePaymentMode),
  referenceNo: z.string().trim().optional(),
  remarks: z.string().trim().optional()
});

export function toMoney(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

export function fromMoney(
  value: Prisma.Decimal | number | string | null | undefined
) {
  if (value == null) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return Number(value.toString());
}

export async function getReceiptPrefix(schoolId: string) {
  const setting = await db.setting.findUnique({
    where: {
      schoolId_category_key: {
        schoolId,
        category: "finance",
        key: "receiptPrefix"
      }
    }
  });

  return typeof setting?.value === "string" && setting.value.trim() ? setting.value : "RCPT";
}

export async function nextReceiptNumber(schoolId: string) {
  const [prefix, count] = await Promise.all([
    getReceiptPrefix(schoolId),
    db.feePayment.count({ where: { schoolId } })
  ]);

  return `${prefix}-${String(count + 1).padStart(5, "0")}`;
}

export async function nextInvoiceNumber(schoolId: string) {
  const count = await db.feeInvoice.count({ where: { schoolId } });
  const year = new Date().getUTCFullYear();
  return `INV-${year}-${String(count + 1).padStart(5, "0")}`;
}

export function computeInvoiceStatus(totalAmount: number, paidAmount: number, dueDate: Date) {
  if (paidAmount >= totalAmount) {
    return FeeInvoiceStatus.PAID;
  }

  if (paidAmount > 0) {
    return FeeInvoiceStatus.PARTIALLY_PAID;
  }

  const now = new Date();
  if (dueDate.getTime() < now.getTime()) {
    return FeeInvoiceStatus.OVERDUE;
  }

  return FeeInvoiceStatus.ISSUED;
}

export function availablePaymentModes() {
  return [
    FeePaymentMode.CASH,
    FeePaymentMode.UPI,
    FeePaymentMode.CARD,
    FeePaymentMode.BANK_TRANSFER,
    FeePaymentMode.CHEQUE,
    FeePaymentMode.OTHER
  ] as const;
}
