import { WORKFLOW_DECISIONS, WORKFLOW_TYPES, type WorkflowDecision, type WorkflowDisplayStatus, type WorkflowType } from "@/lib/workflows/types";

const WORKFLOW_TRANSITIONS: Record<WorkflowType, Record<string, readonly string[]>> = {
  [WORKFLOW_TYPES.LEAVE_REQUEST]: {
    PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
    APPROVED: [],
    REJECTED: [],
    CANCELLED: []
  },
  [WORKFLOW_TYPES.EXPENSE_VOUCHER]: {
    DRAFT: ["APPROVED", "CANCELLED"],
    APPROVED: ["PAID"],
    PAID: [],
    CANCELLED: []
  },
  [WORKFLOW_TYPES.PAYROLL_RUN]: {
    DRAFT: ["FINALIZED", "CANCELLED"],
    FINALIZED: ["PAID"],
    PAID: [],
    CANCELLED: []
  },
  [WORKFLOW_TYPES.FEE_CONCESSION]: {},
  [WORKFLOW_TYPES.FEE_REFUND]: {},
  [WORKFLOW_TYPES.RESULT_PUBLISH]: {},
  [WORKFLOW_TYPES.INVENTORY_PURCHASE_REQUEST]: {},
  [WORKFLOW_TYPES.STUDENT_TRANSFER]: {}
};

export function resolveWorkflowNextStatus(workflowType: WorkflowType, decision: WorkflowDecision) {
  switch (workflowType) {
    case WORKFLOW_TYPES.LEAVE_REQUEST:
      if (decision === WORKFLOW_DECISIONS.APPROVE) return "APPROVED";
      if (decision === WORKFLOW_DECISIONS.REJECT) return "REJECTED";
      if (decision === WORKFLOW_DECISIONS.CANCEL) return "CANCELLED";
      break;
    case WORKFLOW_TYPES.EXPENSE_VOUCHER:
      if (decision === WORKFLOW_DECISIONS.APPROVE) return "APPROVED";
      if (decision === WORKFLOW_DECISIONS.REJECT || decision === WORKFLOW_DECISIONS.CANCEL) return "CANCELLED";
      if (decision === WORKFLOW_DECISIONS.COMPLETE) return "PAID";
      break;
    case WORKFLOW_TYPES.PAYROLL_RUN:
      if (decision === WORKFLOW_DECISIONS.APPROVE) return "FINALIZED";
      if (decision === WORKFLOW_DECISIONS.REJECT || decision === WORKFLOW_DECISIONS.CANCEL) return "CANCELLED";
      if (decision === WORKFLOW_DECISIONS.COMPLETE) return "PAID";
      break;
    default:
      break;
  }

  throw new Error("Unsupported workflow decision.");
}

export function canTransitionWorkflow(workflowType: WorkflowType, currentStatus: string, nextStatus: string) {
  return WORKFLOW_TRANSITIONS[workflowType]?.[currentStatus]?.includes(nextStatus) ?? false;
}

export function assertWorkflowTransition(workflowType: WorkflowType, currentStatus: string, nextStatus: string) {
  if (!canTransitionWorkflow(workflowType, currentStatus, nextStatus)) {
    throw new Error(`Cannot move ${workflowType} from ${currentStatus} to ${nextStatus}.`);
  }
}

export function normalizeWorkflowStatus(workflowType: WorkflowType, rawStatus: string): WorkflowDisplayStatus {
  switch (workflowType) {
    case WORKFLOW_TYPES.EXPENSE_VOUCHER:
      if (rawStatus === "PAID") return "COMPLETED";
      if (rawStatus === "CANCELLED") return "REJECTED";
      return rawStatus as WorkflowDisplayStatus;
    case WORKFLOW_TYPES.PAYROLL_RUN:
      if (rawStatus === "FINALIZED") return "APPROVED";
      if (rawStatus === "PAID") return "COMPLETED";
      if (rawStatus === "CANCELLED") return "REJECTED";
      return rawStatus as WorkflowDisplayStatus;
    default:
      return rawStatus as WorkflowDisplayStatus;
  }
}
