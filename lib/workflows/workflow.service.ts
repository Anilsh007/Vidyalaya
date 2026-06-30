import type { ExpenseVoucher, LeaveRequest, PayrollRun } from "@prisma/client";

import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { hasAnyRole, hasPermission } from "@/lib/rbac/guards";
import { createExpenseVoucher, generateExpenseVoucherNumber, updateExpenseVoucherStatus } from "@/lib/services/accounts.service";
import { reviewLeaveRequest, saveLeaveRequest } from "@/lib/services/leaves.service";
import { createPayrollRun, updatePayrollRunStatus } from "@/lib/services/payroll.service";
import { calculateLeaveDays } from "@/lib/validations/leaves";
import { parsePayrollPeriod, payrollPeriodLabel } from "@/lib/validations/payroll";
import { getWorkflowConfig } from "@/lib/workflows/workflow-config";
import { assertWorkflowTransition, normalizeWorkflowStatus, resolveWorkflowNextStatus } from "@/lib/workflows/status";
import { workflowDecisionSchema, workflowLookupSchema } from "@/lib/workflows/workflow.validation";
import {
  WORKFLOW_DECISIONS,
  WORKFLOW_TYPES,
  type CreateApprovalRequestInput,
  type GetWorkflowRequestsInput,
  type WorkflowActor,
  type WorkflowDecisionInput,
  type WorkflowRecord,
  type WorkflowType
} from "@/lib/workflows/types";

function assertWorkflowEnabled(workflowType: WorkflowType) {
  const config = getWorkflowConfig(workflowType);
  if (!config.enabled) {
    throw new Error(`${config.label} workflow is not active yet.`);
  }
  return config;
}

function assertPermission(actor: WorkflowActor, permission?: string) {
  if (permission && !hasPermission(actor, permission)) {
    throw new Error("You do not have permission to perform this workflow action.");
  }
}

function assertRoles(actor: WorkflowActor, roles?: readonly string[]) {
  if (roles?.length && !hasAnyRole(actor, roles)) {
    throw new Error("Your role is not allowed for this workflow action.");
  }
}

export function assertCanRequestWorkflow(actor: WorkflowActor, workflowType: WorkflowType) {
  const config = assertWorkflowEnabled(workflowType);
  assertPermission(actor, config.requiredRequestPermission);
  assertRoles(actor, config.allowedRequesterRoles);
}

export function assertCanApproveWorkflow(actor: WorkflowActor, workflowType: WorkflowType) {
  const config = assertWorkflowEnabled(workflowType);
  assertPermission(actor, config.requiredApprovePermission);
  assertRoles(actor, config.allowedApproverRoles);
}

export function assertCanRejectWorkflow(actor: WorkflowActor, workflowType: WorkflowType) {
  const config = assertWorkflowEnabled(workflowType);
  assertPermission(actor, config.requiredRejectPermission ?? config.requiredApprovePermission);
  assertRoles(actor, config.allowedApproverRoles);
}

function mapLeaveRecord(leave: LeaveRequest): WorkflowRecord {
  return {
    id: leave.id,
    workflowType: WORKFLOW_TYPES.LEAVE_REQUEST,
    moduleKey: "leaves",
    targetType: "LeaveRequest",
    targetId: leave.id,
    title: `${leave.requesterName} - ${leave.leaveType}`,
    status: normalizeWorkflowStatus(WORKFLOW_TYPES.LEAVE_REQUEST, leave.status),
    rawStatus: leave.status,
    requestedAt: leave.createdAt,
    decidedAt: leave.reviewedAt,
    requestedById: leave.studentId ?? leave.staffId ?? null,
    assignedApproverId: leave.reviewedById,
    remarks: leave.reviewRemarks,
    metadata: {
      requesterType: leave.requesterType,
      requesterName: leave.requesterName,
      totalDays: Number(leave.totalDays)
    }
  };
}

function mapExpenseRecord(voucher: ExpenseVoucher): WorkflowRecord {
  return {
    id: voucher.id,
    workflowType: WORKFLOW_TYPES.EXPENSE_VOUCHER,
    moduleKey: "accounts",
    targetType: "ExpenseVoucher",
    targetId: voucher.id,
    title: voucher.voucherNumber,
    status: normalizeWorkflowStatus(WORKFLOW_TYPES.EXPENSE_VOUCHER, voucher.status),
    rawStatus: voucher.status,
    requestedAt: voucher.createdAt,
    decidedAt: voucher.approvedAt ?? voucher.paidAt,
    requestedById: null,
    assignedApproverId: voucher.approvedById,
    remarks: null,
    metadata: {
      voucherNumber: voucher.voucherNumber,
      paidTo: voucher.paidTo
    }
  };
}

function mapPayrollRunRecord(run: PayrollRun): WorkflowRecord {
  return {
    id: run.id,
    workflowType: WORKFLOW_TYPES.PAYROLL_RUN,
    moduleKey: "payroll",
    targetType: "PayrollRun",
    targetId: run.id,
    title: run.title,
    status: normalizeWorkflowStatus(WORKFLOW_TYPES.PAYROLL_RUN, run.status),
    rawStatus: run.status,
    requestedAt: run.createdAt,
    decidedAt: run.paidAt ?? run.finalizedAt,
    requestedById: run.createdById,
    assignedApproverId: null,
    remarks: run.notes,
    metadata: {
      periodMonth: run.periodMonth,
      periodYear: run.periodYear
    }
  };
}

async function getLeaveWorkflowRecord(actor: WorkflowActor, targetId: string) {
  const leave = await db.leaveRequest.findFirst({
    where: { id: targetId, schoolId: actor.schoolId }
  });
  if (!leave) {
    throw new Error("Leave request not found.");
  }
  return mapLeaveRecord(leave);
}

async function getExpenseWorkflowRecord(actor: WorkflowActor, targetId: string) {
  const voucher = await db.expenseVoucher.findFirst({
    where: { id: targetId, schoolId: actor.schoolId }
  });
  if (!voucher) {
    throw new Error("Expense voucher not found.");
  }
  return mapExpenseRecord(voucher);
}

async function getPayrollWorkflowRecord(actor: WorkflowActor, targetId: string) {
  const run = await db.payrollRun.findFirst({
    where: { id: targetId, schoolId: actor.schoolId }
  });
  if (!run) {
    throw new Error("Payroll run not found.");
  }
  return mapPayrollRunRecord(run);
}

export async function getApprovalRequestById(input: {
  actor: WorkflowActor;
  workflowType: WorkflowType;
  targetId: string;
}) {
  const parsed = workflowLookupSchema.parse({
    workflowType: input.workflowType,
    targetId: input.targetId
  });

  switch (parsed.workflowType) {
    case WORKFLOW_TYPES.LEAVE_REQUEST:
      return getLeaveWorkflowRecord(input.actor, parsed.targetId);
    case WORKFLOW_TYPES.EXPENSE_VOUCHER:
      return getExpenseWorkflowRecord(input.actor, parsed.targetId);
    case WORKFLOW_TYPES.PAYROLL_RUN:
      return getPayrollWorkflowRecord(input.actor, parsed.targetId);
    default:
      throw new Error("This workflow type is not connected yet.");
  }
}

export async function getApprovalRequests(input: GetWorkflowRequestsInput) {
  const workflowTypes = input.workflowType
    ? [input.workflowType]
    : [WORKFLOW_TYPES.LEAVE_REQUEST, WORKFLOW_TYPES.EXPENSE_VOUCHER, WORKFLOW_TYPES.PAYROLL_RUN];

  const results = await Promise.all(
    workflowTypes.map(async (workflowType) => {
      switch (workflowType) {
        case WORKFLOW_TYPES.LEAVE_REQUEST: {
          const rows = await db.leaveRequest.findMany({
            where: { schoolId: input.actor.schoolId },
            orderBy: [{ createdAt: "desc" }],
            take: 50
          });
          return rows.map(mapLeaveRecord);
        }
        case WORKFLOW_TYPES.EXPENSE_VOUCHER: {
          const rows = await db.expenseVoucher.findMany({
            where: { schoolId: input.actor.schoolId },
            orderBy: [{ createdAt: "desc" }],
            take: 50
          });
          return rows.map(mapExpenseRecord);
        }
        case WORKFLOW_TYPES.PAYROLL_RUN: {
          const rows = await db.payrollRun.findMany({
            where: { schoolId: input.actor.schoolId },
            orderBy: [{ createdAt: "desc" }],
            take: 24
          });
          return rows.map(mapPayrollRunRecord);
        }
        default:
          return [];
      }
    })
  );

  return results.flat().sort((left, right) => right.requestedAt.getTime() - left.requestedAt.getTime());
}

export async function createApprovalRequest(input: CreateApprovalRequestInput) {
  switch (input.workflowType) {
    case WORKFLOW_TYPES.LEAVE_REQUEST: {
      assertCanRequestWorkflow(input.actor, input.workflowType);
      const totalDays = calculateLeaveDays(input.startDate, input.endDate);
      const { leave } = await saveLeaveRequest({
        schoolId: input.actor.schoolId,
        requesterType: input.requesterType,
        studentId: input.studentId,
        staffId: input.staffId,
        leaveType: input.leaveType,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        totalDays
      });

      await recordAuditLog({
        actorUserId: input.actor.userId,
        schoolId: input.actor.schoolId,
        action: "leave.requested",
        entityType: "LeaveRequest",
        entityId: leave.id,
        metadata: {
          requesterType: input.requesterType,
          totalDays
        }
      });

      return getApprovalRequestById({
        actor: input.actor,
        workflowType: input.workflowType,
        targetId: leave.id
      });
    }
    case WORKFLOW_TYPES.EXPENSE_VOUCHER: {
      assertCanRequestWorkflow(input.actor, input.workflowType);
      const voucherNumber = await generateExpenseVoucherNumber(input.actor.schoolId);
      const voucher = await createExpenseVoucher({
        schoolId: input.actor.schoolId,
        categoryId: input.categoryId,
        voucherNumber,
        expenseDate: input.expenseDate,
        paidTo: input.paidTo,
        vendorName: input.vendorName,
        amount: input.amount,
        paymentMode: input.paymentMode,
        referenceNo: input.referenceNo,
        description: input.description
      });

      await recordAuditLog({
        actorUserId: input.actor.userId,
        schoolId: input.actor.schoolId,
        action: "expense.requested",
        entityType: "ExpenseVoucher",
        entityId: voucher.id,
        metadata: {
          voucherNumber,
          amount: input.amount
        }
      });

      return getApprovalRequestById({
        actor: input.actor,
        workflowType: input.workflowType,
        targetId: voucher.id
      });
    }
    case WORKFLOW_TYPES.PAYROLL_RUN: {
      assertCanRequestWorkflow(input.actor, input.workflowType);
      const { periodMonth, periodYear } = parsePayrollPeriod(input.period);
      const title = `${payrollPeriodLabel(periodMonth, periodYear)} Payroll`;
      const { payrollRun, staffCount } = await createPayrollRun({
        schoolId: input.actor.schoolId,
        userId: input.actor.userId,
        title,
        periodMonth,
        periodYear,
        paymentDate: input.paymentDate,
        notes: input.notes
      });

      await recordAuditLog({
        actorUserId: input.actor.userId,
        schoolId: input.actor.schoolId,
        action: "payroll.run.requested",
        entityType: "PayrollRun",
        entityId: payrollRun.id,
        metadata: {
          title,
          slips: staffCount
        }
      });

      return getApprovalRequestById({
        actor: input.actor,
        workflowType: input.workflowType,
        targetId: payrollRun.id
      });
    }
    default:
      throw new Error("This workflow type cannot be requested yet.");
  }
}

async function applyWorkflowDecision(
  input: WorkflowDecisionInput & { decision: "APPROVE" | "REJECT" | "CANCEL" | "COMPLETE" }
) {
  const parsed = workflowDecisionSchema.parse({
    workflowType: input.workflowType,
    targetId: input.targetId,
    decision: input.decision,
    remarks: input.remarks
  });
  const config = assertWorkflowEnabled(parsed.workflowType);
  const existing = await getApprovalRequestById({
    actor: input.actor,
    workflowType: parsed.workflowType,
    targetId: parsed.targetId
  });
  const nextStatus = resolveWorkflowNextStatus(parsed.workflowType, parsed.decision);

  assertWorkflowTransition(parsed.workflowType, existing.rawStatus, nextStatus);

  switch (parsed.decision) {
    case WORKFLOW_DECISIONS.APPROVE:
      assertCanApproveWorkflow(input.actor, parsed.workflowType);
      break;
    case WORKFLOW_DECISIONS.REJECT:
      assertCanRejectWorkflow(input.actor, parsed.workflowType);
      break;
    case WORKFLOW_DECISIONS.CANCEL: {
      const isRequester = existing.requestedById === input.actor.userId;
      const hasOverride = hasPermission(
        input.actor,
        config.requiredRejectPermission ?? config.requiredApprovePermission ?? ""
      );
      if (!isRequester && !hasOverride) {
        throw new Error("You cannot cancel this workflow request.");
      }
      break;
    }
    case WORKFLOW_DECISIONS.COMPLETE:
      assertPermission(input.actor, config.requiredCompletePermission ?? config.requiredApprovePermission);
      break;
    default:
      break;
  }

  switch (parsed.workflowType) {
    case WORKFLOW_TYPES.LEAVE_REQUEST:
      await reviewLeaveRequest({
        schoolId: input.actor.schoolId,
        userId: input.actor.userId,
        leaveId: parsed.targetId,
        status: nextStatus as "APPROVED" | "REJECTED" | "CANCELLED",
        reviewRemarks: parsed.remarks
      });
      break;
    case WORKFLOW_TYPES.EXPENSE_VOUCHER:
      await updateExpenseVoucherStatus({
        schoolId: input.actor.schoolId,
        userId: input.actor.userId,
        voucherId: parsed.targetId,
        status: nextStatus as "APPROVED" | "PAID" | "CANCELLED"
      });
      break;
    case WORKFLOW_TYPES.PAYROLL_RUN:
      await updatePayrollRunStatus({
        schoolId: input.actor.schoolId,
        payrollRunId: parsed.targetId,
        status: nextStatus as "FINALIZED" | "PAID" | "CANCELLED"
      });
      break;
    default:
      throw new Error("This workflow type is not connected yet.");
  }

  await recordAuditLog({
    actorUserId: input.actor.userId,
    schoolId: input.actor.schoolId,
    action: `${config.auditEventPrefix}.${parsed.decision.toLowerCase()}`,
    entityType: config.targetType,
    entityId: parsed.targetId,
    metadata: {
      fromStatus: existing.rawStatus,
      toStatus: nextStatus,
      remarks: parsed.remarks ?? null,
      workflowType: parsed.workflowType
    }
  });

  return getApprovalRequestById({
    actor: input.actor,
    workflowType: parsed.workflowType,
    targetId: parsed.targetId
  });
}

export async function approveRequest(input: WorkflowDecisionInput) {
  return applyWorkflowDecision({ ...input, decision: WORKFLOW_DECISIONS.APPROVE });
}

export async function rejectRequest(input: WorkflowDecisionInput) {
  return applyWorkflowDecision({ ...input, decision: WORKFLOW_DECISIONS.REJECT });
}

export async function cancelRequest(input: WorkflowDecisionInput) {
  return applyWorkflowDecision({ ...input, decision: WORKFLOW_DECISIONS.CANCEL });
}

export async function completeRequest(input: WorkflowDecisionInput) {
  return applyWorkflowDecision({ ...input, decision: WORKFLOW_DECISIONS.COMPLETE });
}
