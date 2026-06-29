import { z } from "zod";

export const payrollRunSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Select payroll month."),
  paymentDate: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

export const payrollSlipStatusSchema = z.object({
  slipId: z.string().min(1, "Payroll slip is required."),
  status: z.enum(["APPROVED", "PAID"]),
  remarks: z.string().trim().optional()
});

export const payrollRunStatusSchema = z.object({
  payrollRunId: z.string().min(1, "Payroll run is required."),
  status: z.enum(["FINALIZED", "PAID", "CANCELLED"])
});

export function parsePayrollPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  return { periodYear: year, periodMonth: month };
}

export function payrollPeriodLabel(month: number, year: number) {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}
