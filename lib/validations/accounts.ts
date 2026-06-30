import { FeePaymentMode } from "@prisma/client";
import { z } from "zod";

export const expenseCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Category name is required."),
  code: z.string().trim().min(2, "Category code is required."),
  description: z.string().trim().optional(),
  isActive: z.enum(["yes", "no"])
});

export const expenseVoucherSchema = z.object({
  categoryId: z.string().trim().min(1, "Select an expense category."),
  expenseDate: z.string().trim().min(1, "Expense date is required."),
  paidTo: z.string().trim().min(2, "Paid to is required."),
  vendorName: z.string().trim().optional(),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  paymentMode: z.nativeEnum(FeePaymentMode),
  referenceNo: z.string().trim().optional(),
  description: z.string().trim().min(3, "Description is required.")
});

export const expenseVoucherStatusSchema = z.object({
  voucherId: z.string().min(1, "Expense voucher is required."),
  status: z.enum(["APPROVED", "PAID", "CANCELLED"]),
  remarks: z.string().trim().max(500, "Remarks must be 500 characters or fewer.").optional()
});

export async function nextExpenseVoucherNumber(count: number) {
  const year = new Date().getUTCFullYear();
  return `EXP-${year}-${String(count + 1).padStart(5, "0")}`;
}
