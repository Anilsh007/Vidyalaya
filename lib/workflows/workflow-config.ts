import type { RoleCode } from "@prisma/client";

import { RBAC_PERMISSIONS, type RbacPermissionKey } from "@/lib/rbac/permissions";
import { WORKFLOW_TYPES, type WorkflowType } from "@/lib/workflows/types";

export type WorkflowConfig = {
  key: WorkflowType;
  label: string;
  moduleKey: string;
  targetType: string;
  requiredRequestPermission?: RbacPermissionKey;
  requiredApprovePermission?: RbacPermissionKey;
  requiredRejectPermission?: RbacPermissionKey;
  requiredCompletePermission?: RbacPermissionKey;
  allowedRequesterRoles?: readonly RoleCode[];
  allowedApproverRoles?: readonly RoleCode[];
  auditEventPrefix: string;
  enabled: boolean;
};

export const WORKFLOW_CONFIG: Record<WorkflowType, WorkflowConfig> = {
  [WORKFLOW_TYPES.LEAVE_REQUEST]: {
    key: WORKFLOW_TYPES.LEAVE_REQUEST,
    label: "Leave request",
    moduleKey: "leaves",
    targetType: "LeaveRequest",
    requiredRequestPermission: RBAC_PERMISSIONS.leavesRequest,
    requiredApprovePermission: RBAC_PERMISSIONS.leavesApprove,
    requiredRejectPermission: RBAC_PERMISSIONS.leavesApprove,
    auditEventPrefix: "leave",
    enabled: true
  },
  [WORKFLOW_TYPES.EXPENSE_VOUCHER]: {
    key: WORKFLOW_TYPES.EXPENSE_VOUCHER,
    label: "Expense voucher",
    moduleKey: "accounts",
    targetType: "ExpenseVoucher",
    requiredRequestPermission: RBAC_PERMISSIONS.accountsExpensesManage,
    requiredApprovePermission: RBAC_PERMISSIONS.accountsExpensesApprove,
    requiredRejectPermission: RBAC_PERMISSIONS.accountsExpensesApprove,
    requiredCompletePermission: RBAC_PERMISSIONS.accountsExpensesApprove,
    auditEventPrefix: "expense",
    enabled: true
  },
  [WORKFLOW_TYPES.PAYROLL_RUN]: {
    key: WORKFLOW_TYPES.PAYROLL_RUN,
    label: "Payroll run",
    moduleKey: "payroll",
    targetType: "PayrollRun",
    requiredRequestPermission: RBAC_PERMISSIONS.payrollRun,
    requiredApprovePermission: RBAC_PERMISSIONS.payrollApprove,
    requiredRejectPermission: RBAC_PERMISSIONS.payrollApprove,
    requiredCompletePermission: RBAC_PERMISSIONS.payrollApprove,
    auditEventPrefix: "payroll.run",
    enabled: true
  },
  [WORKFLOW_TYPES.FEE_CONCESSION]: {
    key: WORKFLOW_TYPES.FEE_CONCESSION,
    label: "Fee concession",
    moduleKey: "fees",
    targetType: "FeeConcession",
    requiredRequestPermission: RBAC_PERMISSIONS.feesConcessionRequest,
    requiredApprovePermission: RBAC_PERMISSIONS.feesConcessionApprove,
    requiredRejectPermission: RBAC_PERMISSIONS.feesConcessionApprove,
    auditEventPrefix: "fees.concession",
    enabled: false
  },
  [WORKFLOW_TYPES.FEE_REFUND]: {
    key: WORKFLOW_TYPES.FEE_REFUND,
    label: "Fee refund",
    moduleKey: "fees",
    targetType: "FeeRefund",
    requiredRequestPermission: RBAC_PERMISSIONS.feesRefund,
    requiredApprovePermission: RBAC_PERMISSIONS.feesRefund,
    requiredRejectPermission: RBAC_PERMISSIONS.feesRefund,
    auditEventPrefix: "fees.refund",
    enabled: false
  },
  [WORKFLOW_TYPES.RESULT_PUBLISH]: {
    key: WORKFLOW_TYPES.RESULT_PUBLISH,
    label: "Result publish",
    moduleKey: "exams",
    targetType: "ExamResultPublish",
    requiredApprovePermission: RBAC_PERMISSIONS.examsPublishResult,
    requiredRejectPermission: RBAC_PERMISSIONS.examsPublishResult,
    auditEventPrefix: "exam.result.publish",
    enabled: false
  },
  [WORKFLOW_TYPES.INVENTORY_PURCHASE_REQUEST]: {
    key: WORKFLOW_TYPES.INVENTORY_PURCHASE_REQUEST,
    label: "Inventory purchase request",
    moduleKey: "inventory",
    targetType: "InventoryPurchaseRequest",
    requiredRequestPermission: RBAC_PERMISSIONS.inventoryItemsManage,
    requiredApprovePermission: RBAC_PERMISSIONS.inventoryItemsManage,
    requiredRejectPermission: RBAC_PERMISSIONS.inventoryItemsManage,
    auditEventPrefix: "inventory.purchase",
    enabled: false
  },
  [WORKFLOW_TYPES.STUDENT_TRANSFER]: {
    key: WORKFLOW_TYPES.STUDENT_TRANSFER,
    label: "Student transfer",
    moduleKey: "students",
    targetType: "StudentTransfer",
    requiredRequestPermission: RBAC_PERMISSIONS.studentsTransfer,
    requiredApprovePermission: RBAC_PERMISSIONS.studentsTransfer,
    requiredRejectPermission: RBAC_PERMISSIONS.studentsTransfer,
    auditEventPrefix: "student.transfer",
    enabled: false
  }
};

export function getWorkflowConfig(workflowType: WorkflowType) {
  return WORKFLOW_CONFIG[workflowType];
}
