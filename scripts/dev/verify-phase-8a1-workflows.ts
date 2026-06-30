import { db } from "@/lib/db";
import { createUserSession } from "@/lib/auth/session";
import {
  approveRequest,
  completeRequest,
  createApprovalRequest,
  rejectRequest
} from "@/lib/workflows/workflow.service";
import { WORKFLOW_TYPES } from "@/lib/workflows/types";

async function requireActor(email: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, schoolId: true, fullName: true }
  });

  if (!user) {
    throw new Error(`User not found for ${email}`);
  }

  const session = await createUserSession(user.id);
  if (!session) {
    throw new Error(`Active session could not be built for ${email}`);
  }

  return {
    ...session,
    email,
    fullName: user.fullName
  };
}

async function ensureExpenseCategory(schoolId: string) {
  const existing = await db.expenseCategory.findFirst({
    where: { schoolId },
    orderBy: [{ createdAt: "asc" }]
  });

  if (existing) {
    return existing;
  }

  return db.expenseCategory.create({
    data: {
      schoolId,
      name: "QA Workflow Category",
      code: "QA-WF",
      description: "Local Phase 8A-1 verification category",
      isActive: true
    }
  });
}

async function findStaffIdByUserEmail(email: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: { staffProfile: { select: { id: true } } }
  });

  return user?.staffProfile?.id ?? null;
}

async function ensurePayrollStaffSalary(email: string) {
  const user = await db.user.findUnique({
    where: { email },
    select: {
      staffProfile: {
        select: { id: true, salaryAmount: true }
      }
    }
  });

  const staff = user?.staffProfile;
  if (!staff) {
    throw new Error(`Staff profile missing for payroll seed user ${email}`);
  }

  if (staff.salaryAmount !== null) {
    return staff.id;
  }

  await db.staff.update({
    where: { id: staff.id },
    data: { salaryAmount: 25000 }
  });

  return staff.id;
}

async function findLatestUiLeaveRequest(staffId: string) {
  return db.leaveRequest.findFirst({
    where: {
      staffId,
      reason: "Phase 8A leave approval requester test.",
      status: "PENDING"
    },
    orderBy: [{ createdAt: "desc" }]
  });
}

async function findAuditActions(entityId: string) {
  const logs = await db.auditLog.findMany({
    where: { entityId },
    orderBy: [{ createdAt: "asc" }],
    select: { action: true, createdAt: true, metadata: true }
  });

  return logs.map((log) => ({
    action: log.action,
    createdAt: log.createdAt.toISOString(),
    metadata: log.metadata
  }));
}

async function expectUnauthorized(label: string, work: () => Promise<unknown>) {
  try {
    await work();
    return { label, blocked: false, message: "Unexpectedly allowed" };
  } catch (error) {
    return {
      label,
      blocked: true,
      message: error instanceof Error ? error.message : "Blocked with non-Error rejection"
    };
  }
}

async function nextPayrollPeriods(schoolId: string, count: number) {
  const existing = await db.payrollRun.findMany({
    where: { schoolId },
    select: { periodMonth: true, periodYear: true }
  });
  const used = new Set(existing.map((run) => `${run.periodYear}-${String(run.periodMonth).padStart(2, "0")}`));
  const periods: string[] = [];

  let year = 2030;
  let month = 1;
  while (periods.length < count) {
    const period = `${year}-${String(month).padStart(2, "0")}`;
    if (!used.has(period)) {
      periods.push(period);
      used.add(period);
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return periods;
}

async function main() {
  const admin = await requireActor("admin@school.local");
  const teacher = await requireActor("qa.leave.teacher@school.local");
  const accountant = await requireActor("qa.workflow.accountant@school.local");
  const peon = await requireActor("qa.unauth.peon@school.local");

  const teacherStaffId = await findStaffIdByUserEmail(teacher.email);
  if (!teacherStaffId) {
    throw new Error("QA leave teacher is not linked to a staff profile.");
  }
  await ensurePayrollStaffSalary(accountant.email);
  const [payrollPeriodApproved, payrollPeriodRejected, payrollPeriodUnauthorized] = await nextPayrollPeriods(
    accountant.schoolId,
    3
  );

  const uiLeave =
    (await findLatestUiLeaveRequest(teacherStaffId)) ??
    (await createApprovalRequest({
      actor: teacher,
      workflowType: WORKFLOW_TYPES.LEAVE_REQUEST,
      requesterType: "STAFF",
      staffId: teacherStaffId,
      leaveType: "Casual leave",
      startDate: "2026-07-02",
      endDate: "2026-07-02",
      reason: "Phase 8A leave approval requester test."
    }));

  const approvedLeave = await approveRequest({
    actor: admin,
    workflowType: WORKFLOW_TYPES.LEAVE_REQUEST,
    targetId: uiLeave.id,
    remarks: "Approved during Phase 8A-1 verification."
  });

  const rejectedLeave = await createApprovalRequest({
    actor: teacher,
    workflowType: WORKFLOW_TYPES.LEAVE_REQUEST,
    requesterType: "STAFF",
    staffId: teacherStaffId,
    leaveType: "Medical leave",
    startDate: "2026-07-05",
    endDate: "2026-07-06",
    reason: "Phase 8A leave rejection verification."
  }).then((request) =>
    rejectRequest({
      actor: admin,
      workflowType: WORKFLOW_TYPES.LEAVE_REQUEST,
      targetId: request.id,
      remarks: "Rejected during Phase 8A-1 verification."
    })
  );

  const pendingUnauthorizedLeave = await createApprovalRequest({
    actor: teacher,
    workflowType: WORKFLOW_TYPES.LEAVE_REQUEST,
    requesterType: "STAFF",
    staffId: teacherStaffId,
    leaveType: "Other leave",
    startDate: "2026-07-07",
    endDate: "2026-07-07",
    reason: "Phase 8A unauthorized leave approval verification."
  });
  const unauthorizedLeave = await expectUnauthorized("leave-approve", () =>
    approveRequest({
      actor: peon,
      workflowType: WORKFLOW_TYPES.LEAVE_REQUEST,
      targetId: pendingUnauthorizedLeave.id,
      remarks: "Unauthorized attempt"
    })
  );
  await rejectRequest({
    actor: admin,
    workflowType: WORKFLOW_TYPES.LEAVE_REQUEST,
    targetId: pendingUnauthorizedLeave.id,
    remarks: "Cleanup after unauthorized verification."
  });

  const category = await ensureExpenseCategory(accountant.schoolId);
  const approvedExpense = await createApprovalRequest({
    actor: accountant,
    workflowType: WORKFLOW_TYPES.EXPENSE_VOUCHER,
    categoryId: category.id,
    expenseDate: "2026-07-03",
    paidTo: "QA Stationery Vendor",
    vendorName: "QA Stationery Vendor",
    amount: 1500,
    paymentMode: "CASH",
    referenceNo: "QA-EXP-001",
    description: "Phase 8A approval verification voucher"
  }).then((request) =>
    approveRequest({
      actor: admin,
      workflowType: WORKFLOW_TYPES.EXPENSE_VOUCHER,
      targetId: request.id,
      remarks: "Approved during Phase 8A-1 verification."
    })
  );

  const cancelledExpense = await createApprovalRequest({
    actor: accountant,
    workflowType: WORKFLOW_TYPES.EXPENSE_VOUCHER,
    categoryId: category.id,
    expenseDate: "2026-07-04",
    paidTo: "QA Transport Vendor",
    vendorName: "QA Transport Vendor",
    amount: 2100,
    paymentMode: "UPI",
    referenceNo: "QA-EXP-002",
    description: "Phase 8A cancellation mapping verification voucher"
  }).then((request) =>
    rejectRequest({
      actor: admin,
      workflowType: WORKFLOW_TYPES.EXPENSE_VOUCHER,
      targetId: request.id,
      remarks: "Rejected during Phase 8A-1 verification."
    })
  );

  const pendingUnauthorizedExpense = await createApprovalRequest({
    actor: accountant,
    workflowType: WORKFLOW_TYPES.EXPENSE_VOUCHER,
    categoryId: category.id,
    expenseDate: "2026-07-05",
    paidTo: "QA Unauthorized Expense Vendor",
    vendorName: "QA Unauthorized Expense Vendor",
    amount: 999,
    paymentMode: "CARD",
    referenceNo: "QA-EXP-003",
    description: "Phase 8A unauthorized expense approval verification"
  });
  const unauthorizedExpense = await expectUnauthorized("expense-approve", () =>
    approveRequest({
      actor: peon,
      workflowType: WORKFLOW_TYPES.EXPENSE_VOUCHER,
      targetId: pendingUnauthorizedExpense.id,
      remarks: "Unauthorized attempt"
    })
  );
  await rejectRequest({
    actor: admin,
    workflowType: WORKFLOW_TYPES.EXPENSE_VOUCHER,
    targetId: pendingUnauthorizedExpense.id,
    remarks: "Cleanup after unauthorized verification."
  });

  const payrollApproved = await createApprovalRequest({
    actor: accountant,
    workflowType: WORKFLOW_TYPES.PAYROLL_RUN,
    period: payrollPeriodApproved,
    paymentDate: "2030-01-28",
    notes: "Phase 8A-1 approved payroll run"
  }).then((request) =>
    approveRequest({
      actor: admin,
      workflowType: WORKFLOW_TYPES.PAYROLL_RUN,
      targetId: request.id,
      remarks: "Approved during Phase 8A-1 verification."
    })
  );

  const payrollCompleted = await completeRequest({
    actor: admin,
    workflowType: WORKFLOW_TYPES.PAYROLL_RUN,
    targetId: payrollApproved.id,
    remarks: "Completed during Phase 8A-1 verification."
  });

  const payrollRejected = await createApprovalRequest({
    actor: accountant,
    workflowType: WORKFLOW_TYPES.PAYROLL_RUN,
    period: payrollPeriodRejected,
    paymentDate: "2030-02-28",
    notes: "Phase 8A-1 rejected payroll run"
  }).then((request) =>
    rejectRequest({
      actor: admin,
      workflowType: WORKFLOW_TYPES.PAYROLL_RUN,
      targetId: request.id,
      remarks: "Rejected during Phase 8A-1 verification."
    })
  );

  const pendingUnauthorizedPayroll = await createApprovalRequest({
    actor: accountant,
    workflowType: WORKFLOW_TYPES.PAYROLL_RUN,
    period: payrollPeriodUnauthorized,
    paymentDate: "2030-03-28",
    notes: "Phase 8A unauthorized payroll approval verification"
  });
  const unauthorizedPayroll = await expectUnauthorized("payroll-approve", () =>
    approveRequest({
      actor: peon,
      workflowType: WORKFLOW_TYPES.PAYROLL_RUN,
      targetId: pendingUnauthorizedPayroll.id,
      remarks: "Unauthorized attempt"
    })
  );
  await rejectRequest({
    actor: admin,
    workflowType: WORKFLOW_TYPES.PAYROLL_RUN,
    targetId: pendingUnauthorizedPayroll.id,
    remarks: "Cleanup after unauthorized verification."
  });

  const summary = {
    personas: {
      admin: admin.email,
      teacher: teacher.email,
      accountant: accountant.email,
      unauthorized: peon.email
    },
    leave: {
      approved: {
        id: approvedLeave.id,
        status: approvedLeave.status,
        remarks: approvedLeave.remarks,
        audits: await findAuditActions(approvedLeave.id)
      },
      rejected: {
        id: rejectedLeave.id,
        status: rejectedLeave.status,
        remarks: rejectedLeave.remarks,
        audits: await findAuditActions(rejectedLeave.id)
      },
      unauthorized: unauthorizedLeave
    },
    expense: {
      approved: {
        id: approvedExpense.id,
        status: approvedExpense.status,
        rawStatus: approvedExpense.rawStatus,
        audits: await findAuditActions(approvedExpense.id)
      },
      rejectedMappedToCancelled: {
        id: cancelledExpense.id,
        status: cancelledExpense.status,
        rawStatus: cancelledExpense.rawStatus,
        audits: await findAuditActions(cancelledExpense.id)
      },
      unauthorized: unauthorizedExpense
    },
    payroll: {
      approved: {
        id: payrollApproved.id,
        status: payrollApproved.status,
        rawStatus: payrollApproved.rawStatus,
        audits: await findAuditActions(payrollApproved.id)
      },
      completed: {
        id: payrollCompleted.id,
        status: payrollCompleted.status,
        rawStatus: payrollCompleted.rawStatus,
        audits: await findAuditActions(payrollCompleted.id)
      },
      rejected: {
        id: payrollRejected.id,
        status: payrollRejected.status,
        rawStatus: payrollRejected.rawStatus,
        audits: await findAuditActions(payrollRejected.id)
      },
      unauthorized: unauthorizedPayroll
    }
  };

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
