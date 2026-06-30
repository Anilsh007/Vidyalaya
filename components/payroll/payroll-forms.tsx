"use client";

import { useActionState } from "react";

import { createPayrollRunAction, updatePayrollRunStatusAction, updatePayrollSlipStatusAction } from "@/app/(dashboard)/dashboard/payroll/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { initialActionFormState } from "@/lib/forms";

export function PayrollRunForm() {
  const [state, formAction] = useActionState(createPayrollRunAction, initialActionFormState);
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <FormField label="Payroll month" htmlFor="period"><Input id="period" name="period" type="month" defaultValue={currentPeriod} /></FormField>
          <FieldError error={state.fieldErrors?.period} />
        </div>
        <FormField label="Target payment date" htmlFor="paymentDate"><Input id="paymentDate" name="paymentDate" type="date" defaultValue={today} /></FormField>
      </div>
      <FormField label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" className="min-h-[90px]" placeholder="Optional payroll remarks for this month" />
      </FormField>
      <div className="flex justify-end"><SubmitButton pendingLabel="Generating payroll...">Generate payroll</SubmitButton></div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function PayrollSlipStatusForm({ slipId }: { slipId: string }) {
  const [state, formAction] = useActionState(updatePayrollSlipStatusAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="slipId" value={slipId} />
      <div className="grid gap-2">
        <FormField label="Slip status" htmlFor={`slip-status-${slipId}`}>
          <Select id={`slip-status-${slipId}`} name="status" defaultValue="APPROVED">
            <option value="APPROVED">Approve slip</option>
            <option value="PAID">Mark paid</option>
          </Select>
        </FormField>
        <FieldError error={state.fieldErrors?.status} />
      </div>
      <FormField label="Remarks" htmlFor={`slip-remarks-${slipId}`}>
        <Textarea id={`slip-remarks-${slipId}`} name="remarks" className="min-h-[90px]" placeholder="Optional payroll note" />
      </FormField>
      <div className="flex justify-end"><SubmitButton pendingLabel="Updating slip...">Update slip</SubmitButton></div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function PayrollRunStatusForm({ payrollRunId }: { payrollRunId: string }) {
  const [state, formAction] = useActionState(updatePayrollRunStatusAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="payrollRunId" value={payrollRunId} />
      <div className="grid gap-2">
        <FormField label="Run status" htmlFor={`run-status-${payrollRunId}`}>
          <Select id={`run-status-${payrollRunId}`} name="status" defaultValue="FINALIZED">
            <option value="FINALIZED">Approve payroll run</option>
            <option value="PAID">Mark run paid</option>
            <option value="CANCELLED">Reject payroll run</option>
          </Select>
        </FormField>
        <FieldError error={state.fieldErrors?.status} />
      </div>
      <FormField label="Remarks" htmlFor={`run-remarks-${payrollRunId}`}>
        <Textarea id={`run-remarks-${payrollRunId}`} name="remarks" className="min-h-[90px]" placeholder="Optional approval or rejection remarks" />
      </FormField>
      <div className="flex justify-end"><SubmitButton pendingLabel="Updating run...">Update payroll run</SubmitButton></div>
      <FormStateMessage state={state} />
    </form>
  );
}
