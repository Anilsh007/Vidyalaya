import { z } from "zod";

import { WORKFLOW_DECISIONS, WORKFLOW_TYPES } from "@/lib/workflows/types";

export const workflowTypeSchema = z.enum([
  WORKFLOW_TYPES.LEAVE_REQUEST,
  WORKFLOW_TYPES.EXPENSE_VOUCHER,
  WORKFLOW_TYPES.PAYROLL_RUN,
  WORKFLOW_TYPES.FEE_CONCESSION,
  WORKFLOW_TYPES.FEE_REFUND,
  WORKFLOW_TYPES.RESULT_PUBLISH,
  WORKFLOW_TYPES.INVENTORY_PURCHASE_REQUEST,
  WORKFLOW_TYPES.STUDENT_TRANSFER
]);

export const workflowDecisionSchema = z
  .object({
    workflowType: workflowTypeSchema,
    targetId: z.string().trim().min(1, "Workflow target is required."),
    decision: z.enum([
      WORKFLOW_DECISIONS.APPROVE,
      WORKFLOW_DECISIONS.REJECT,
      WORKFLOW_DECISIONS.CANCEL,
      WORKFLOW_DECISIONS.COMPLETE
    ]),
    remarks: z.string().trim().max(500, "Remarks must be 500 characters or fewer.").optional()
  })
  .superRefine((value, ctx) => {
    if (value.decision === WORKFLOW_DECISIONS.REJECT && !value.remarks) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["remarks"],
        message: "Remarks are required when rejecting a workflow request."
      });
    }
  });

export const workflowLookupSchema = z.object({
  workflowType: workflowTypeSchema,
  targetId: z.string().trim().min(1, "Workflow target is required.")
});
