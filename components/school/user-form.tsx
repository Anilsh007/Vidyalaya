"use client";

import { initialActionFormState } from "@/lib/forms";
import {
  SPECIFIC_ROLE_DEFINITIONS,
  SPECIFIC_ROLES_BY_CATEGORY,
  ROLE_CATEGORIES,
  ROLE_CATEGORY_LABELS,
  type RoleCategory,
  type SpecificRoleKey,
  getSpecificRoleDefinition
} from "@/lib/user-management";
import { saveUserAction } from "@/app/(dashboard)/dashboard/users/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FieldStack, FormActions, FormNotice, FormSection } from "@/components/shared/form-primitives";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { CheckCheck, CopyPlus, IdCard, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useActionState, useEffect, useMemo, useState } from "react";

type Option = {
  id: string;
  label: string;
  meta?: string;
  searchText?: string;
};

export type UserFormValues = {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  roleCategory: RoleCategory;
  specificRoleKey: SpecificRoleKey;
  status: string;
  password: string;
  staffId: string;
  parentId: string;
  studentId: string;
  parentStudentIds: string[];
  forcePasswordReset: string;
};

export type UserHandoverPayload = {
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  username: string;
  roleLabel: string;
  temporaryPassword: string;
  linkedProfileType: string;
  linkedProfileBadgeLabel: string;
  linkedProfileBadgeTone: "success" | "warning";
  linkedProfileSystemId?: string | null;
};

type UserFormProps = {
  title?: string;
  description?: string;
  submitLabel: string;
  values: UserFormValues;
  staffOptions: Option[];
  parentOptions: Option[];
  studentOptions: Option[];
  onHandoverReady?: (payload: UserHandoverPayload) => void;
  onNotify?: (input: { title: string; description?: string; tone: "success" | "error" | "info" }) => void;
};

export function UserForm({
  title,
  description,
  submitLabel,
  values,
  staffOptions,
  parentOptions,
  studentOptions,
  onHandoverReady,
  onNotify
}: UserFormProps) {
  const [state, formAction] = useActionState(saveUserAction, initialActionFormState);
  const [roleCategory, setRoleCategory] = useState<RoleCategory>(values.roleCategory);
  const [specificRoleKey, setSpecificRoleKey] = useState<SpecificRoleKey>(values.specificRoleKey);
  const [password, setPassword] = useState(values.password);
  const [forcePasswordReset, setForcePasswordReset] = useState(values.forcePasswordReset === "yes");
  const [staffLookup, setStaffLookup] = useState("");
  const [studentLookup, setStudentLookup] = useState("");
  const [wardLookup, setWardLookup] = useState("");
  const [selectedParentStudentIds, setSelectedParentStudentIds] = useState<string[]>(values.parentStudentIds);

  const roleOptions = useMemo(
    () => SPECIFIC_ROLES_BY_CATEGORY[roleCategory].map((key) => SPECIFIC_ROLE_DEFINITIONS[key]),
    [roleCategory]
  );

  useEffect(() => {
    if (!roleOptions.some((option) => option.key === specificRoleKey)) {
      setSpecificRoleKey(roleOptions[0]?.key ?? "TEACHER");
    }
  }, [roleOptions, specificRoleKey]);

  const selectedRole = getSpecificRoleDefinition(specificRoleKey) ?? SPECIFIC_ROLE_DEFINITIONS.TEACHER;
  const linkedProfileType = selectedRole.linkedProfileType;

  const filteredStaffOptions = useMemo(
    () => filterOptions(staffOptions, staffLookup, "employee code or staff id"),
    [staffLookup, staffOptions]
  );
  const filteredStudentOptions = useMemo(
    () => filterOptions(studentOptions, studentLookup, "admission number"),
    [studentLookup, studentOptions]
  );
  const filteredWardOptions = useMemo(
    () => filterOptions(studentOptions, wardLookup, "admission number"),
    [studentOptions, wardLookup]
  );

  useEffect(() => {
    if (linkedProfileType !== "parent") {
      setSelectedParentStudentIds(values.parentStudentIds);
    }
  }, [linkedProfileType, values.parentStudentIds]);

  useEffect(() => {
    if (state.status !== "success" || !state.meta) {
      return;
    }

    const payload = state.meta.handover as UserHandoverPayload | undefined;
    if (payload) {
      onHandoverReady?.(payload);
    }
  }, [onHandoverReady, state.meta, state.status]);

  function handleGeneratePassword() {
    const generated = generateSecurePassword(14);
    setPassword(generated);
    setForcePasswordReset(true);
    onNotify?.({
      title: "Temporary password generated",
      description: "The generated password is now ready for handover, printing, or WhatsApp sharing.",
      tone: "success"
    });
  }

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="id" value={values.id ?? ""} />
      <input type="hidden" name="linkedProfileType" value={linkedProfileType} />
      <input type="hidden" name="roleCode" value={selectedRole.roleCode} />
      <input type="hidden" name="forcePasswordReset" value={forcePasswordReset ? "yes" : "no"} />
      {selectedParentStudentIds.map((studentId) => (
        <input key={studentId} type="hidden" name="parentStudentIds" value={studentId} />
      ))}

      <FormSection title={title} description={description}>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <FieldStack>
            <FormField label="Full name" htmlFor="fullName">
              <Input id="fullName" name="fullName" defaultValue={values.fullName} />
            </FormField>
            <FieldError error={state.fieldErrors?.fullName} />
          </FieldStack>

          <FieldStack>
            <FormField label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={values.email} />
            </FormField>
            <FieldError error={state.fieldErrors?.email} />
          </FieldStack>

          <FieldStack>
            <FormField label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={values.phone} />
            </FormField>
            <FieldError error={state.fieldErrors?.phone} />
          </FieldStack>

          <FieldStack>
            <FormField label="Role category" htmlFor="roleCategory">
              <Select
                id="roleCategory"
                name="roleCategory"
                value={roleCategory}
                onChange={(event) => setRoleCategory(event.target.value as RoleCategory)}
              >
                {ROLE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {ROLE_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FieldError error={state.fieldErrors?.roleCategory} />
          </FieldStack>

          <FieldStack>
            <FormField label="Specific role" htmlFor="specificRoleKey">
              <Select
                id="specificRoleKey"
                name="specificRoleKey"
                value={specificRoleKey}
                onChange={(event) => setSpecificRoleKey(event.target.value as SpecificRoleKey)}
              >
                {roleOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FieldError error={state.fieldErrors?.specificRoleKey} />
          </FieldStack>

          <FieldStack>
            <FormField label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={values.status}>
                <option value="yes">Active</option>
                <option value="no">Inactive</option>
              </Select>
            </FormField>
            <FieldError error={state.fieldErrors?.status} />
          </FieldStack>

          <FieldStack className="md:col-span-2 xl:col-span-3">
            <FormField
              label={values.id ? "Temporary password reset" : "Temporary password"}
              htmlFor="password"
              hint="Use this credential for the initial handover, then force a reset on first sign-in."
            >
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <div className="grid gap-3">
                  <Input
                    id="password"
                    name="password"
                    type="text"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={forcePasswordReset}
                      onChange={(event) => setForcePasswordReset(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Force password reset on next sign-in</span>
                  </label>
                </div>
                <Button type="button" variant="secondary" className="whitespace-nowrap" onClick={handleGeneratePassword}>
                  <Sparkles className="h-4 w-4" />
                  Generate secure password
                </Button>
              </div>
            </FormField>
            <FieldError error={state.fieldErrors?.password} />
          </FieldStack>
        </div>

        {linkedProfileType === "staff" ? (
          <FieldStack>
            <ProfileLookup
              label="Linked staff profile"
              hint="Search by Staff ID, employee code, or staff name. If no direct selection is made, the system will still attempt an auto-match."
              searchValue={staffLookup}
              onSearchValueChange={setStaffLookup}
              selectedValue={values.staffId}
              fieldName="staffId"
              fieldId="staffId"
              options={filteredStaffOptions}
              emptyLabel="No matching staff profile found."
              icon={<IdCard className="h-4 w-4" />}
            />
            <FieldError error={state.fieldErrors?.staffId} />
          </FieldStack>
        ) : null}

        {linkedProfileType === "student" ? (
          <FieldStack>
            <ProfileLookup
              label="Link student admission profile"
              hint="Search existing admissions by admission number, class, or student name."
              searchValue={studentLookup}
              onSearchValueChange={setStudentLookup}
              selectedValue={values.studentId}
              fieldName="studentId"
              fieldId="studentId"
              options={filteredStudentOptions}
              emptyLabel="No student admission record matches this search."
              icon={<Search className="h-4 w-4" />}
            />
            <FieldError error={state.fieldErrors?.studentId} />
          </FieldStack>
        ) : null}

        {linkedProfileType === "parent" ? (
          <div className="grid gap-5">
            <FieldStack>
              <FormField label="Parent profile" htmlFor="parentId" hint="Select the parent identity that will own this account.">
                <Select id="parentId" name="parentId" defaultValue={values.parentId}>
                  <option value="">Select parent</option>
                  {parentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                      {option.meta ? ` - ${option.meta}` : ""}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FieldError error={state.fieldErrors?.parentId} />
            </FieldStack>

            <MultiSelectLookup
              label="Link ward / student records"
              hint="Attach one or more children to this parent account using admission-number search."
              searchValue={wardLookup}
              onSearchValueChange={setWardLookup}
              selectedValues={selectedParentStudentIds}
              onSelectedValuesChange={setSelectedParentStudentIds}
              options={filteredWardOptions}
            />
            <FieldError error={state.fieldErrors?.parentStudentIds} />
          </div>
        ) : null}

        {linkedProfileType === "none" ? (
          <FormNotice icon={<ShieldCheck className="h-4 w-4" />} tone="indigo">
            <p className="font-medium text-slate-900">Administrative profile coupling is not required.</p>
            <p>
              This account will remain a system-level login. No staff, student, or parent biography record needs to be attached.
            </p>
          </FormNotice>
        ) : null}
      </FormSection>

      <FormStateMessage state={state} />

      <FormActions>
        <SubmitButton pendingLabel="Saving user...">{submitLabel}</SubmitButton>
      </FormActions>
    </form>
  );
}

function ProfileLookup({
  label,
  hint,
  searchValue,
  onSearchValueChange,
  selectedValue,
  fieldName,
  fieldId,
  options,
  emptyLabel,
  icon
}: {
  label: string;
  hint: string;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  selectedValue: string;
  fieldName: string;
  fieldId: string;
  options: Option[];
  emptyLabel: string;
  icon: ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50/50 p-4">
      <FormField label={label} htmlFor={`${fieldId}-search`} hint={hint}>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-3 text-slate-400">{icon}</span>
          <Input
            id={`${fieldId}-search`}
            value={searchValue}
            onChange={(event) => onSearchValueChange(event.target.value)}
            className="pl-9"
            placeholder="Type to search"
          />
        </div>
      </FormField>
      <Select id={fieldId} name={fieldName} defaultValue={selectedValue}>
        <option value="">Select profile</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
            {option.meta ? ` - ${option.meta}` : ""}
          </option>
        ))}
      </Select>
      {!options.length ? <p className="text-sm text-slate-500">{emptyLabel}</p> : null}
    </div>
  );
}

function MultiSelectLookup({
  label,
  hint,
  searchValue,
  onSearchValueChange,
  selectedValues,
  onSelectedValuesChange,
  options
}: {
  label: string;
  hint: string;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  selectedValues: string[];
  onSelectedValuesChange: (value: string[]) => void;
  options: Option[];
}) {
  function toggleSelection(id: string) {
    onSelectedValuesChange(
      selectedValues.includes(id) ? selectedValues.filter((item) => item !== id) : [...selectedValues, id]
    );
  }

  return (
    <div className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50/50 p-4">
      <FormField label={label} htmlFor="parentStudentLookup" hint={hint}>
        <div className="relative">
          <Users className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            id="parentStudentLookup"
            value={searchValue}
            onChange={(event) => onSearchValueChange(event.target.value)}
            className="pl-9"
            placeholder="Search by student name or admission number"
          />
        </div>
      </FormField>
      <div className="grid max-h-64 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
        {options.map((option) => {
          const selected = selectedValues.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleSelection(option.id)}
              className={`flex items-start justify-between rounded-2xl border px-3 py-3 text-left transition ${
                selected
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
              }`}
            >
              <span className="grid gap-1">
                <span className="font-medium">{option.label}</span>
                {option.meta ? <span className="text-xs text-slate-500">{option.meta}</span> : null}
              </span>
              {selected ? <CheckCheck className="mt-0.5 h-4 w-4 shrink-0" /> : null}
            </button>
          );
        })}
        {!options.length ? <p className="px-2 py-3 text-sm text-slate-500">No student record matches the current search.</p> : null}
      </div>
      {selectedValues.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedValues.map((value) => {
            const selected = options.find((option) => option.id === value);
            return (
              <span key={value} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <CopyPlus className="h-3.5 w-3.5" />
                {selected?.label ?? value}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function filterOptions(options: Option[], query: string, fallbackScope: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => {
    const haystack = [option.label, option.meta, option.searchText, fallbackScope].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

function generateSecurePassword(length: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = new Uint32Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}
