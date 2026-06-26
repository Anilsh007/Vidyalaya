"use client";

import { useActionState } from "react";

import { saveStaffAction } from "@/app/(dashboard)/dashboard/staff/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionFormState } from "@/lib/forms";

type StaffFormValues = {
  id?: string;
  employeeCode: string;
  fullName: string;
  designation: string;
  department: string;
  qualification: string;
  joiningDate: string;
  phone: string;
  email: string;
  gender: string;
  salaryAmount: string;
  isTeachingStaff: string;
};

export function StaffForm({
  title,
  description,
  submitLabel,
  values
}: {
  title: string;
  description: string;
  submitLabel: string;
  values: StaffFormValues;
}) {
  const [state, formAction] = useActionState(saveStaffAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="id" value={values.id ?? ""} />
      <section className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
        <div className="grid gap-2">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-2">
            <FormField label="Employee code" htmlFor="employeeCode">
              <Input id="employeeCode" name="employeeCode" defaultValue={values.employeeCode} />
            </FormField>
            <FieldError error={state.fieldErrors?.employeeCode} />
          </div>
          <div className="grid gap-2">
            <FormField label="Full name" htmlFor="fullName">
              <Input id="fullName" name="fullName" defaultValue={values.fullName} />
            </FormField>
            <FieldError error={state.fieldErrors?.fullName} />
          </div>
          <div className="grid gap-2">
            <FormField label="Designation" htmlFor="designation">
              <Input id="designation" name="designation" defaultValue={values.designation} />
            </FormField>
            <FieldError error={state.fieldErrors?.designation} />
          </div>
          <div className="grid gap-2">
            <FormField label="Department" htmlFor="department">
              <Input id="department" name="department" defaultValue={values.department} />
            </FormField>
            <FieldError error={state.fieldErrors?.department} />
          </div>
          <div className="grid gap-2">
            <FormField label="Qualification" htmlFor="qualification">
              <Input id="qualification" name="qualification" defaultValue={values.qualification} />
            </FormField>
            <FieldError error={state.fieldErrors?.qualification} />
          </div>
          <div className="grid gap-2">
            <FormField label="Joining date" htmlFor="joiningDate">
              <Input id="joiningDate" name="joiningDate" type="date" defaultValue={values.joiningDate} />
            </FormField>
            <FieldError error={state.fieldErrors?.joiningDate} />
          </div>
          <div className="grid gap-2">
            <FormField label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={values.phone} />
            </FormField>
            <FieldError error={state.fieldErrors?.phone} />
          </div>
          <div className="grid gap-2">
            <FormField label="Email" htmlFor="email">
              <Input id="email" name="email" defaultValue={values.email} />
            </FormField>
            <FieldError error={state.fieldErrors?.email} />
          </div>
          <div className="grid gap-2">
            <FormField label="Gender" htmlFor="gender">
              <Select id="gender" name="gender" defaultValue={values.gender}>
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
            </FormField>
            <FieldError error={state.fieldErrors?.gender} />
          </div>
          <div className="grid gap-2">
            <FormField label="Monthly salary" htmlFor="salaryAmount" hint="Optional internal reference for payroll planning.">
              <Input id="salaryAmount" name="salaryAmount" type="number" min="0" step="0.01" defaultValue={values.salaryAmount} />
            </FormField>
            <FieldError error={state.fieldErrors?.salaryAmount} />
          </div>
          <div className="grid gap-2">
            <FormField label="Staff type" htmlFor="isTeachingStaff">
              <Select id="isTeachingStaff" name="isTeachingStaff" defaultValue={values.isTeachingStaff}>
                <option value="yes">Teaching staff</option>
                <option value="no">Non-teaching staff</option>
              </Select>
            </FormField>
            <FieldError error={state.fieldErrors?.isTeachingStaff} />
          </div>
        </div>
      </section>

      <FormStateMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving staff...">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
