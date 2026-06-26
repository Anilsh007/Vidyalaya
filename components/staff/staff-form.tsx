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
  employeeCode?: string;
  fullName?: string;
  designation?: string;
  department?: string | null;
  qualification?: string | null;
  joiningDate?: string;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  salaryAmount?: string | null;
  isTeachingStaff?: boolean;
};

export function StaffForm({ defaultValues }: { defaultValues?: StaffFormValues }) {
  const [state, formAction] = useActionState(saveStaffAction, initialActionFormState);
  const formId = defaultValues?.id ?? "new";

  return (
    <form action={formAction} className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />

      <div className="grid gap-4 lg:grid-cols-[180px_1fr_220px]">
        <div className="grid gap-2">
          <FormField label="Employee code" htmlFor={`staff-code-${formId}`}>
            <Input
              id={`staff-code-${formId}`}
              name="employeeCode"
              defaultValue={defaultValues?.employeeCode ?? ""}
              placeholder="EMP-001"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.employeeCode} />
        </div>
        <div className="grid gap-2">
          <FormField label="Full name" htmlFor={`staff-name-${formId}`}>
            <Input
              id={`staff-name-${formId}`}
              name="fullName"
              defaultValue={defaultValues?.fullName ?? ""}
              placeholder="Anita Sharma"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.fullName} />
        </div>
        <div className="grid gap-2">
          <FormField label="Staff type" htmlFor={`staff-type-${formId}`}>
            <Select
              id={`staff-type-${formId}`}
              name="isTeachingStaff"
              defaultValue={defaultValues?.isTeachingStaff === false ? "no" : "yes"}
            >
              <option value="yes">Teaching</option>
              <option value="no">Non-teaching</option>
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.isTeachingStaff} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-2">
          <FormField label="Designation" htmlFor={`staff-designation-${formId}`}>
            <Input
              id={`staff-designation-${formId}`}
              name="designation"
              defaultValue={defaultValues?.designation ?? ""}
              placeholder="Mathematics Teacher"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.designation} />
        </div>
        <div className="grid gap-2">
          <FormField label="Department" htmlFor={`staff-department-${formId}`}>
            <Input
              id={`staff-department-${formId}`}
              name="department"
              defaultValue={defaultValues?.department ?? ""}
              placeholder="Academics"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.department} />
        </div>
        <div className="grid gap-2">
          <FormField label="Qualification" htmlFor={`staff-qualification-${formId}`}>
            <Input
              id={`staff-qualification-${formId}`}
              name="qualification"
              defaultValue={defaultValues?.qualification ?? ""}
              placeholder="B.Ed, M.Sc"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.qualification} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="grid gap-2">
          <FormField label="Joining date" htmlFor={`staff-joining-${formId}`}>
            <Input
              id={`staff-joining-${formId}`}
              name="joiningDate"
              type="date"
              defaultValue={defaultValues?.joiningDate ?? new Date().toISOString().slice(0, 10)}
            />
          </FormField>
          <FieldError error={state.fieldErrors?.joiningDate} />
        </div>
        <div className="grid gap-2">
          <FormField label="Gender" htmlFor={`staff-gender-${formId}`}>
            <Select id={`staff-gender-${formId}`} name="gender" defaultValue={defaultValues?.gender ?? ""}>
              <option value="">Not specified</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.gender} />
        </div>
        <div className="grid gap-2">
          <FormField label="Phone" htmlFor={`staff-phone-${formId}`}>
            <Input
              id={`staff-phone-${formId}`}
              name="phone"
              defaultValue={defaultValues?.phone ?? ""}
              placeholder="9876543210"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.phone} />
        </div>
        <div className="grid gap-2">
          <FormField label="Monthly salary" htmlFor={`staff-salary-${formId}`}>
            <Input
              id={`staff-salary-${formId}`}
              name="salaryAmount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={defaultValues?.salaryAmount ?? ""}
              placeholder="35000"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.salaryAmount} />
        </div>
      </div>

      <div className="grid gap-2">
        <FormField label="Email" htmlFor={`staff-email-${formId}`}>
          <Input
            id={`staff-email-${formId}`}
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            placeholder="teacher@school.local"
          />
        </FormField>
        <FieldError error={state.fieldErrors?.email} />
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving staff...">
          {defaultValues?.id ? "Update staff" : "Create staff"}
        </SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}
