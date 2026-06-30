import type { SessionLike } from "@/lib/rbac/types";

export const WORKFLOW_TYPES = {
  LEAVE_REQUEST: "LEAVE_REQUEST",
  EXPENSE_VOUCHER: "EXPENSE_VOUCHER",
  PAYROLL_RUN: "PAYROLL_RUN",
  FEE_CONCESSION: "FEE_CONCESSION",
  FEE_REFUND: "FEE_REFUND",
  RESULT_PUBLISH: "RESULT_PUBLISH",
  INVENTORY_PURCHASE_REQUEST: "INVENTORY_PURCHASE_REQUEST",
  STUDENT_TRANSFER: "STUDENT_TRANSFER"
} as const;

export type WorkflowType = (typeof WORKFLOW_TYPES)[keyof typeof WORKFLOW_TYPES];

export const WORKFLOW_DECISIONS = {
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  CANCEL: "CANCEL",
  COMPLETE: "COMPLETE"
} as const;

export type WorkflowDecision = (typeof WORKFLOW_DECISIONS)[keyof typeof WORKFLOW_DECISIONS];

export type WorkflowDisplayStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export type WorkflowActor = SessionLike;

export type WorkflowRecord = {
  id: string;
  workflowType: WorkflowType;
  moduleKey: string;
  targetType: string;
  targetId: string;
  title: string;
  status: WorkflowDisplayStatus;
  rawStatus: string;
  requestedAt: Date;
  decidedAt?: Date | null;
  requestedById?: string | null;
  assignedApproverId?: string | null;
  remarks?: string | null;
  metadata?: Record<string, unknown>;
};

export type CreateLeaveWorkflowInput = {
  workflowType: typeof WORKFLOW_TYPES.LEAVE_REQUEST;
  actor: WorkflowActor;
  requesterType: "STUDENT" | "STAFF";
  studentId?: string;
  staffId?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
};

export type CreateExpenseWorkflowInput = {
  workflowType: typeof WORKFLOW_TYPES.EXPENSE_VOUCHER;
  actor: WorkflowActor;
  categoryId: string;
  expenseDate: string;
  paidTo: string;
  vendorName?: string;
  amount: number;
  paymentMode: string;
  referenceNo?: string;
  description: string;
};

export type CreatePayrollWorkflowInput = {
  workflowType: typeof WORKFLOW_TYPES.PAYROLL_RUN;
  actor: WorkflowActor;
  period: string;
  paymentDate?: string;
  notes?: string;
};

export type CreateApprovalRequestInput =
  | CreateLeaveWorkflowInput
  | CreateExpenseWorkflowInput
  | CreatePayrollWorkflowInput;

export type WorkflowDecisionInput = {
  actor: WorkflowActor;
  workflowType: WorkflowType;
  targetId: string;
  remarks?: string;
};

export type GetWorkflowRequestsInput = {
  actor: WorkflowActor;
  workflowType?: WorkflowType;
};
