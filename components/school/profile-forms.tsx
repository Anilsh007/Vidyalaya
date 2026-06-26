"use client";

import { useActionState } from "react";

import { changeMyPasswordAction, updateMyProfileAction } from "@/app/(dashboard)/dashboard/profile/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionFormState } from "@/lib/forms";

export function AccountProfileForm({
  values
}: {
  values: {
    fullName: string;
    email: string;
    phone: string;
  };
}) {
  const [state, formAction] = useActionState(updateMyProfileAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <div className="grid gap-2">
        <h2 className="text-xl font-semibold text-slate-950">Profile details</h2>
        <p className="text-sm leading-6 text-slate-600">
          Keep your name, email, and phone current so the office can reach you and the login stays accurate.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
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
        <div className="grid gap-2 md:col-span-2">
          <FormField label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={values.phone} />
          </FormField>
          <FieldError error={state.fieldErrors?.phone} />
        </div>
      </div>

      <FormStateMessage state={state} />

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Updating profile...">Save profile</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordChangeForm() {
  const [state, formAction] = useActionState(changeMyPasswordAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <div className="grid gap-2">
        <h2 className="text-xl font-semibold text-slate-950">Change password</h2>
        <p className="text-sm leading-6 text-slate-600">
          Use your current password first, then set a new one for future sign-ins.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <FormField label="Current password" htmlFor="currentPassword">
            <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" />
          </FormField>
          <FieldError error={state.fieldErrors?.currentPassword} />
        </div>
        <div className="grid gap-2">
          <FormField label="New password" htmlFor="newPassword">
            <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" />
          </FormField>
          <FieldError error={state.fieldErrors?.newPassword} />
        </div>
        <div className="grid gap-2 md:col-span-2">
          <FormField label="Confirm new password" htmlFor="confirmPassword">
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" />
          </FormField>
          <FieldError error={state.fieldErrors?.confirmPassword} />
        </div>
      </div>

      <FormStateMessage state={state} />

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Updating password...">Update password</SubmitButton>
      </div>
    </form>
  );
}
