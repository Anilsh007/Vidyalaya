"use client";

import { type RoleCode } from "@prisma/client";
import { useActionState, useEffect, useMemo, useState } from "react";

import { saveUserAction } from "@/app/(dashboard)/dashboard/users/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionFormState } from "@/lib/forms";
import { ROLE_CODES, ROLE_LABELS, linkedProfileTypeForRole } from "@/lib/user-management";

type Option = {
  id: string;
  label: string;
  meta?: string;
};

export type UserFormValues = {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  roleCode: string;
  status: string;
  password: string;
  staffId: string;
  parentId: string;
};

export function UserForm({
  title,
  description,
  submitLabel,
  values,
  staffOptions,
  parentOptions
}: {
  title: string;
  description: string;
  submitLabel: string;
  values: UserFormValues;
  staffOptions: Option[];
  parentOptions: Option[];
}) {
  const [state, formAction] = useActionState(saveUserAction, initialActionFormState);
  const [roleCode, setRoleCode] = useState<RoleCode>(values.roleCode as RoleCode);
  const [selectedStaffId, setSelectedStaffId] = useState(values.staffId);
  const [selectedParentId, setSelectedParentId] = useState(values.parentId);
  const linkedProfileType = useMemo(
    () => linkedProfileTypeForRole(roleCode),
    [roleCode]
  );
  const availableLinkedOptions = useMemo(
    () =>
      linkedProfileType === "staff"
        ? staffOptions
        : linkedProfileType === "parent"
          ? parentOptions
          : [],
    [linkedProfileType, parentOptions, staffOptions]
  );
  const activeLinkedOption =
    linkedProfileType === "staff"
      ? availableLinkedOptions.find((option) => option.id === selectedStaffId) ??
        availableLinkedOptions[0]
      : linkedProfileType === "parent"
        ? availableLinkedOptions.find((option) => option.id === selectedParentId) ??
          availableLinkedOptions[0]
        : null;

  useEffect(() => {
    if (linkedProfileType === "staff") {
      setSelectedStaffId(values.staffId || availableLinkedOptions[0]?.id || "");
      setSelectedParentId("");
      return;
    }

    if (linkedProfileType === "parent") {
      setSelectedParentId(values.parentId || availableLinkedOptions[0]?.id || "");
      setSelectedStaffId("");
      return;
    }

    setSelectedStaffId("");
    setSelectedParentId("");
  }, [availableLinkedOptions, linkedProfileType, values.parentId, values.staffId]);

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
            <FormField label="Full name" htmlFor="fullName">
              <Input id="fullName" name="fullName" defaultValue={values.fullName} />
            </FormField>
            <FieldError error={state.fieldErrors?.fullName} />
          </div>
          <div className="grid gap-2">
            <FormField label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={values.email} />
            </FormField>
            <FieldError error={state.fieldErrors?.email} />
          </div>
          <div className="grid gap-2">
            <FormField label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={values.phone} />
            </FormField>
            <FieldError error={state.fieldErrors?.phone} />
          </div>
          <div className="grid gap-2">
            <FormField label="Role" htmlFor="roleCode">
              <Select
                id="roleCode"
                name="roleCode"
                value={roleCode}
                onChange={(event) => setRoleCode(event.target.value as RoleCode)}
              >
                {ROLE_CODES.map((roleCode) => (
                  <option key={roleCode} value={roleCode}>
                    {ROLE_LABELS[roleCode]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FieldError error={state.fieldErrors?.roleCode} />
          </div>
          <input type="hidden" name="linkedProfileType" value={linkedProfileType} />
          <div className="grid gap-2">
            <FormField label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={values.status}>
                <option value="yes">Active</option>
                <option value="no">Inactive</option>
              </Select>
            </FormField>
            <FieldError error={state.fieldErrors?.status} />
          </div>
          <div className="grid gap-2">
            <FormField
              label={values.id ? "Temporary password reset" : "Temporary password"}
              htmlFor="password"
              hint={values.id ? "Leave blank to keep the current password." : "Share this with the user for first sign-in."}
            >
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={values.id ? "new-password" : "new-password"}
                defaultValue=""
              />
            </FormField>
            <FieldError error={state.fieldErrors?.password} />
          </div>
          {linkedProfileType === "staff" || linkedProfileType === "parent" ? (
            <div className="grid gap-2 md:col-span-2 xl:col-span-3">
              <FormField
                label="Linked profile"
                hint={
                  linkedProfileType === "staff"
                    ? "This role automatically links to a staff record."
                    : "This role automatically links to a parent record."
                }
              >
                <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900">
                  {activeLinkedOption
                    ? `${activeLinkedOption.label}${activeLinkedOption.meta ? ` - ${activeLinkedOption.meta}` : ""}`
                    : linkedProfileType === "staff"
                      ? "No available staff record"
                      : "No available parent record"}
                </div>
              </FormField>
              <FieldError error={state.fieldErrors?.staffId ?? state.fieldErrors?.parentId} />
            </div>
          ) : null}
          {linkedProfileType === "staff" ? (
            availableLinkedOptions.length > 1 ? (
              <div className="grid gap-2 md:col-span-2 xl:col-span-3">
                <FormField label="Select staff" htmlFor="staffId" hint="Choose the staff record to connect.">
                  <Select
                    id="staffId"
                    name="staffId"
                    value={selectedStaffId}
                    onChange={(event) => setSelectedStaffId(event.target.value)}
                  >
                    <option value="">Select staff</option>
                    {availableLinkedOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                        {option.meta ? ` - ${option.meta}` : ""}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FieldError error={state.fieldErrors?.staffId} />
              </div>
            ) : (
              <input type="hidden" name="staffId" value={selectedStaffId} />
            )
          ) : null}
          {linkedProfileType === "parent" ? (
            availableLinkedOptions.length > 1 ? (
              <div className="grid gap-2 md:col-span-2 xl:col-span-3">
                <FormField label="Select parent" htmlFor="parentId" hint="Choose the parent record to connect.">
                  <Select
                    id="parentId"
                    name="parentId"
                    value={selectedParentId}
                    onChange={(event) => setSelectedParentId(event.target.value)}
                  >
                    <option value="">Select parent</option>
                    {availableLinkedOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                        {option.meta ? ` - ${option.meta}` : ""}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FieldError error={state.fieldErrors?.parentId} />
              </div>
            ) : (
              <input type="hidden" name="parentId" value={selectedParentId} />
            )
          ) : null}
        </div>
      </section>

      <FormStateMessage state={state} />

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving user...">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
