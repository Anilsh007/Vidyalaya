"use client";

import { useActionState } from "react";

import { createExpenseVoucherAction, saveExpenseCategoryAction, updateExpenseVoucherStatusAction } from "@/app/(dashboard)/dashboard/accounts/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { FEE_PAYMENT_MODES } from "@/lib/constants/client-enums";
import { initialActionFormState } from "@/lib/forms";

type CategoryOption = { id: string; code: string; name: string };
type CategoryDefaults = { id?: string; name?: string; code?: string; description?: string | null; isActive?: boolean };

export function ExpenseCategoryForm({ defaultValues }: { defaultValues?: CategoryDefaults }) {
  const [state, formAction] = useActionState(saveExpenseCategoryAction, initialActionFormState);
  const formId = defaultValues?.id ?? "new";

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />
      <div className="grid gap-4 lg:grid-cols-[160px_1fr]">
        <div className="grid gap-2">
          <FormField label="Code" htmlFor={`expense-code-${formId}`}><Input id={`expense-code-${formId}`} name="code" defaultValue={defaultValues?.code ?? ""} placeholder="UTIL" /></FormField>
          <FieldError error={state.fieldErrors?.code} />
        </div>
        <div className="grid gap-2">
          <FormField label="Category name" htmlFor={`expense-name-${formId}`}><Input id={`expense-name-${formId}`} name="name" defaultValue={defaultValues?.name ?? ""} placeholder="Utilities" /></FormField>
          <FieldError error={state.fieldErrors?.name} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_160px]">
        <FormField label="Description" htmlFor={`expense-description-${formId}`}><Input id={`expense-description-${formId}`} name="description" defaultValue={defaultValues?.description ?? ""} /></FormField>
        <FormField label="Status" htmlFor={`expense-active-${formId}`}>
          <Select id={`expense-active-${formId}`} name="isActive" defaultValue={defaultValues?.isActive === false ? "no" : "yes"}>
            <option value="yes">Active</option>
            <option value="no">Inactive</option>
          </Select>
        </FormField>
      </div>
      <div className="flex justify-end"><SubmitButton pendingLabel="Saving category...">{defaultValues?.id ? "Update category" : "Add category"}</SubmitButton></div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function ExpenseVoucherForm({ categories }: { categories: CategoryOption[] }) {
  const [state, formAction] = useActionState(createExpenseVoucherAction, initialActionFormState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <FormField label="Category" htmlFor="categoryId">
            <Select id="categoryId" name="categoryId">
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.code} - {category.name}</option>)}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.categoryId} />
        </div>
        <div className="grid gap-2">
          <FormField label="Expense date" htmlFor="expenseDate"><Input id="expenseDate" name="expenseDate" type="date" defaultValue={today} /></FormField>
          <FieldError error={state.fieldErrors?.expenseDate} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <FormField label="Paid to" htmlFor="paidTo"><Input id="paidTo" name="paidTo" placeholder="Vendor, staff, or supplier" /></FormField>
          <FieldError error={state.fieldErrors?.paidTo} />
        </div>
        <FormField label="Vendor name" htmlFor="vendorName"><Input id="vendorName" name="vendorName" /></FormField>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-2">
          <FormField label="Amount" htmlFor="amount"><Input id="amount" name="amount" type="number" min="0" step="0.01" /></FormField>
          <FieldError error={state.fieldErrors?.amount} />
        </div>
        <FormField label="Payment mode" htmlFor="paymentMode">
          <Select id="paymentMode" name="paymentMode" defaultValue={FEE_PAYMENT_MODES.CASH}>
            <option value={FEE_PAYMENT_MODES.CASH}>Cash</option>
            <option value={FEE_PAYMENT_MODES.UPI}>UPI</option>
            <option value={FEE_PAYMENT_MODES.BANK_TRANSFER}>Bank transfer</option>
            <option value={FEE_PAYMENT_MODES.CHEQUE}>Cheque</option>
            <option value={FEE_PAYMENT_MODES.CARD}>Card</option>
            <option value={FEE_PAYMENT_MODES.OTHER}>Other</option>
          </Select>
        </FormField>
        <FormField label="Reference no." htmlFor="referenceNo"><Input id="referenceNo" name="referenceNo" /></FormField>
      </div>
      <div className="grid gap-2">
        <FormField label="Description" htmlFor="description"><Textarea id="description" name="description" className="min-h-[100px]" placeholder="Expense purpose or bill details" /></FormField>
        <FieldError error={state.fieldErrors?.description} />
      </div>
      <div className="flex justify-end"><SubmitButton pendingLabel="Creating voucher...">Create voucher</SubmitButton></div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function ExpenseVoucherStatusForm({ voucherId }: { voucherId: string }) {
  const [state, formAction] = useActionState(updateExpenseVoucherStatusAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="voucherId" value={voucherId} />
      <div className="grid gap-2">
        <FormField label="Voucher status" htmlFor={`voucher-status-${voucherId}`}>
          <Select id={`voucher-status-${voucherId}`} name="status" defaultValue="APPROVED">
            <option value="APPROVED">Approve</option>
            <option value="PAID">Mark paid</option>
            <option value="CANCELLED">Cancel</option>
          </Select>
        </FormField>
        <FieldError error={state.fieldErrors?.status} />
      </div>
      <div className="flex justify-end"><SubmitButton pendingLabel="Updating voucher...">Update voucher</SubmitButton></div>
      <FormStateMessage state={state} />
    </form>
  );
}
