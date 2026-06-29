import { PayrollRunStatus, PayrollSlipStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type CreatePayrollRunInput = {
  schoolId: string;
  userId: string;
  title: string;
  periodMonth: number;
  periodYear: number;
  paymentDate?: string;
  notes?: string;
};

type PayrollSlipStatusInput = {
  schoolId: string;
  slipId: string;
  status: "APPROVED" | "PAID";
  remarks?: string;
};

type PayrollRunStatusInput = {
  schoolId: string;
  payrollRunId: string;
  status: "FINALIZED" | "PAID" | "CANCELLED";
};

function getOptionalDate(value?: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export async function getPayrollPageData({ schoolId }: { schoolId: string }) {
  const [staffWithSalary, payrollRuns, payrollSlips] = await Promise.all([
    db.staff.findMany({
      where: { schoolId, isArchived: false, salaryAmount: { not: null } },
      orderBy: [{ fullName: "asc" }]
    }),
    db.payrollRun.findMany({
      where: { schoolId },
      include: { slips: true },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      take: 12
    }),
    db.payrollSlip.findMany({
      where: { schoolId },
      include: { payrollRun: true, staff: true },
      orderBy: [{ createdAt: "desc" }],
      take: 60
    })
  ]);

  const monthlyPayroll = staffWithSalary.reduce((sum, member) => sum + Number(member.salaryAmount ?? 0), 0);
  const draftSlips = payrollSlips.filter((slip) => slip.status === "DRAFT");
  const paidThisCycle = payrollSlips
    .filter((slip) => slip.status === "PAID")
    .reduce((sum, slip) => sum + Number(slip.netPay), 0);
  const latestRun = payrollRuns[0];

  return { staffWithSalary, payrollRuns, payrollSlips, monthlyPayroll, draftSlips, paidThisCycle, latestRun };
}

export async function createPayrollRun(input: CreatePayrollRunInput) {
  const staff = await db.staff.findMany({
    where: { schoolId: input.schoolId, isArchived: false, salaryAmount: { not: null } },
    orderBy: [{ fullName: "asc" }]
  });

  if (!staff.length) {
    throw new Error("No active staff with salary reference found.");
  }

  const payrollRun = await db.payrollRun.create({
    data: {
      schoolId: input.schoolId,
      title: input.title,
      periodMonth: input.periodMonth,
      periodYear: input.periodYear,
      paymentDate: getOptionalDate(input.paymentDate),
      notes: input.notes || null,
      createdById: input.userId,
      slips: {
        create: staff.map((member) => {
          const grossPay = new Prisma.Decimal(member.salaryAmount ?? 0);
          return {
            schoolId: input.schoolId,
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

  return { payrollRun, staffCount: staff.length };
}

export async function updatePayrollSlipStatus(input: PayrollSlipStatusInput) {
  const existing = await db.payrollSlip.findFirst({
    where: { id: input.slipId, schoolId: input.schoolId },
    select: { id: true }
  });
  if (!existing) throw new Error("Payroll slip not found.");

  return db.payrollSlip.update({
    where: { id: existing.id },
    data: {
      status: input.status as PayrollSlipStatus,
      paymentDate: input.status === "PAID" ? new Date() : null,
      remarks: input.remarks || null
    }
  });
}

export async function updatePayrollRunStatus(input: PayrollRunStatusInput) {
  const existing = await db.payrollRun.findFirst({
    where: { id: input.payrollRunId, schoolId: input.schoolId },
    select: { id: true }
  });
  if (!existing) throw new Error("Payroll run not found.");

  return db.payrollRun.update({
    where: { id: existing.id },
    data: {
      status: input.status as PayrollRunStatus,
      finalizedAt: input.status === "FINALIZED" ? new Date() : undefined,
      paidAt: input.status === "PAID" ? new Date() : undefined
    }
  });
}
