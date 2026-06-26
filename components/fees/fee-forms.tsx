"use client";

import { FeePaymentMode } from "@prisma/client";
import { useActionState } from "react";

import {
  collectFeePaymentAction,
  generateFeeInvoiceAction,
  saveFeeHeadAction,
  saveFeeStructureAction
} from "@/app/(dashboard)/dashboard/fees/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { availablePaymentModes } from "@/lib/fees";
import { initialActionFormState } from "@/lib/forms";

type FeeHeadOption = {
  id: string;
  name: string;
  code: string;
};

type ClassOption = {
  id: string;
  name: string;
};

type StudentOption = {
  id: string;
  fullName: string;
  admissionNumber: string;
  className?: string | null;
  sectionName?: string | null;
};

export function FeeHeadForm({
  defaultValues
}: {
  defaultValues?: {
    id?: string;
    name?: string;
    code?: string;
    description?: string | null;
    isOptional?: boolean;
  };
}) {
  const [state, formAction] = useActionState(saveFeeHeadAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />
      <div className="grid gap-4 xl:grid-cols-[1fr_180px_180px_auto] xl:items-end">
        <div className="grid gap-2">
          <FormField label="Fee head" htmlFor={`fee-head-name-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`fee-head-name-${defaultValues?.id ?? "new"}`}
              name="name"
              defaultValue={defaultValues?.name ?? ""}
              placeholder="Tuition Fee"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.name} />
        </div>
        <div className="grid gap-2">
          <FormField label="Code" htmlFor={`fee-head-code-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`fee-head-code-${defaultValues?.id ?? "new"}`}
              name="code"
              defaultValue={defaultValues?.code ?? ""}
              placeholder="TUITION"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.code} />
        </div>
        <div className="grid gap-2">
          <FormField label="Optional" htmlFor={`fee-head-optional-${defaultValues?.id ?? "new"}`}>
            <Select
              id={`fee-head-optional-${defaultValues?.id ?? "new"}`}
              name="isOptional"
              defaultValue={defaultValues?.isOptional ? "yes" : "no"}
            >
              <option value="no">Mandatory</option>
              <option value="yes">Optional</option>
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.isOptional} />
        </div>
        <SubmitButton pendingLabel="Saving...">
          {defaultValues?.id ? "Update head" : "Add head"}
        </SubmitButton>
      </div>
      <div className="grid gap-2">
        <FormField label="Description" htmlFor={`fee-head-description-${defaultValues?.id ?? "new"}`}>
          <Input
            id={`fee-head-description-${defaultValues?.id ?? "new"}`}
            name="description"
            defaultValue={defaultValues?.description ?? ""}
            placeholder="Short internal note"
          />
        </FormField>
        <FieldError error={state.fieldErrors?.description} />
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function FeeStructureForm({
  classes,
  feeHeads
}: {
  classes: ClassOption[];
  feeHeads: FeeHeadOption[];
}) {
  const [state, formAction] = useActionState(saveFeeStructureAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_180px_180px_auto] xl:items-end">
        <div className="grid gap-2">
          <FormField label="Structure name" htmlFor="structureName">
            <Input id="structureName" name="name" placeholder="Class 10 Annual Fees" />
          </FormField>
          <FieldError error={state.fieldErrors?.name} />
        </div>
        <div className="grid gap-2">
          <FormField label="Class" htmlFor="structureClass">
            <Select id="structureClass" name="classId" defaultValue="">
              <option value="">Common structure</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.classId} />
        </div>
        <div className="grid gap-2">
          <FormField label="Effective from" htmlFor="effectiveFrom">
            <Input id="effectiveFrom" name="effectiveFrom" type="date" />
          </FormField>
          <FieldError error={state.fieldErrors?.effectiveFrom} />
        </div>
        <div className="grid gap-2">
          <FormField label="Effective to" htmlFor="effectiveTo">
            <Input id="effectiveTo" name="effectiveTo" type="date" />
          </FormField>
          <FieldError error={state.fieldErrors?.effectiveTo} />
        </div>
        <SubmitButton pendingLabel="Saving structure...">Save structure</SubmitButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {feeHeads.map((head) => (
          <div key={head.id} className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="font-medium text-slate-950">{head.name}</p>
              <p className="text-sm text-slate-500">{head.code}</p>
            </div>
            <FormField label="Amount" htmlFor={`amount_${head.id}`}>
              <Input
                id={`amount_${head.id}`}
                name={`amount_${head.id}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </FormField>
          </div>
        ))}
      </div>

      <FormStateMessage state={state} />
    </form>
  );
}

export function FeeInvoiceForm({
  students
}: {
  students: StudentOption[];
}) {
  const [state, formAction] = useActionState(generateFeeInvoiceAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_180px_160px_160px]">
        <div className="grid gap-2">
          <FormField label="Student" htmlFor="invoiceStudent">
            <Select id="invoiceStudent" name="studentId" defaultValue="">
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName} • {student.admissionNumber}
                  {student.className ? ` • ${student.className}` : ""}
                  {student.sectionName ? `-${student.sectionName}` : ""}
                </option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.studentId} />
        </div>
        <div className="grid gap-2">
          <FormField label="Due date" htmlFor="invoiceDueDate">
            <Input id="invoiceDueDate" name="dueDate" type="date" />
          </FormField>
          <FieldError error={state.fieldErrors?.dueDate} />
        </div>
        <div className="grid gap-2">
          <FormField label="Discount" htmlFor="invoiceDiscount">
            <Input id="invoiceDiscount" name="discountAmount" type="number" min="0" step="0.01" defaultValue="0" />
          </FormField>
          <FieldError error={state.fieldErrors?.discountAmount} />
        </div>
        <div className="grid gap-2">
          <FormField label="Late fee" htmlFor="invoiceFine">
            <Input id="invoiceFine" name="fineAmount" type="number" min="0" step="0.01" defaultValue="0" />
          </FormField>
          <FieldError error={state.fieldErrors?.fineAmount} />
        </div>
      </div>

      <div className="grid gap-2">
        <FormField label="Notes" htmlFor="invoiceNotes">
          <Textarea
            id="invoiceNotes"
            name="notes"
            className="min-h-[110px]"
            placeholder="Optional note, concession context, or future online payment placeholder"
          />
        </FormField>
        <FieldError error={state.fieldErrors?.notes} />
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Generating invoice...">Generate invoice</SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function FeePaymentForm({
  feeInvoiceId,
  maxAmount
}: {
  feeInvoiceId: string;
  maxAmount: number;
}) {
  const [state, formAction] = useActionState(collectFeePaymentAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="feeInvoiceId" value={feeInvoiceId} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[160px_160px_180px_1fr]">
        <div className="grid gap-2">
          <FormField label="Date" htmlFor={`paymentDate-${feeInvoiceId}`}>
            <Input id={`paymentDate-${feeInvoiceId}`} name="paymentDate" type="date" />
          </FormField>
          <FieldError error={state.fieldErrors?.paymentDate} />
        </div>
        <div className="grid gap-2">
          <FormField label="Amount" htmlFor={`paymentAmount-${feeInvoiceId}`}>
            <Input
              id={`paymentAmount-${feeInvoiceId}`}
              name="amount"
              type="number"
              min="0.01"
              max={maxAmount}
              step="0.01"
              placeholder={maxAmount.toFixed(2)}
            />
          </FormField>
          <FieldError error={state.fieldErrors?.amount} />
        </div>
        <div className="grid gap-2">
          <FormField label="Mode" htmlFor={`paymentMode-${feeInvoiceId}`}>
            <Select
              id={`paymentMode-${feeInvoiceId}`}
              name="paymentMode"
              defaultValue={FeePaymentMode.CASH}
            >
              {availablePaymentModes().map((mode) => (
                <option key={mode} value={mode}>
                  {mode.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.paymentMode} />
        </div>
        <div className="grid gap-2">
          <FormField label="Reference / remarks" htmlFor={`paymentRef-${feeInvoiceId}`}>
            <Input
              id={`paymentRef-${feeInvoiceId}`}
              name="referenceNo"
              placeholder="UPI ref, cheque no., or bank note"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.referenceNo} />
        </div>
      </div>
      <div className="grid gap-2">
        <FormField label="Collector notes" htmlFor={`paymentRemarks-${feeInvoiceId}`}>
          <Textarea
            id={`paymentRemarks-${feeInvoiceId}`}
            name="remarks"
            className="min-h-[96px]"
            placeholder="Optional concession note, partial collection note, or online payment placeholder"
          />
        </FormField>
        <FieldError error={state.fieldErrors?.remarks} />
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Recording payment...">Collect payment</SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}
