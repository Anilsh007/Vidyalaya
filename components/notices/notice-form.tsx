"use client";

import { useActionState } from "react";

import { saveNoticeAction } from "@/app/(dashboard)/dashboard/notices/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { NOTICE_AUDIENCE_TYPES, type ClientNoticeAudienceType } from "@/lib/constants/client-enums";
import { initialActionFormState } from "@/lib/forms";

type Option = { id: string; name: string };

export function NoticeForm({
  roles,
  classes,
  sections,
  defaultValues
}: {
  roles: string[];
  classes: Option[];
  sections: Array<Option & { classId: string }>;
  defaultValues?: {
    id?: string;
    title?: string;
    body?: string;
    audienceType?: ClientNoticeAudienceType;
    roleCode?: string | null;
    classId?: string | null;
    sectionId?: string | null;
    noticeType?: string;
    expiresAt?: string;
  };
}) {
  const [state, formAction] = useActionState(saveNoticeAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />
      <div className="grid gap-4 xl:grid-cols-[1fr_180px_180px_180px]">
        <div className="grid gap-2">
          <FormField label="Title" htmlFor={`notice-title-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`notice-title-${defaultValues?.id ?? "new"}`}
              name="title"
              defaultValue={defaultValues?.title ?? ""}
              placeholder="Parent-teacher meeting"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.title} />
        </div>
        <div className="grid gap-2">
          <FormField label="Audience" htmlFor={`notice-audience-${defaultValues?.id ?? "new"}`}>
            <Select
              id={`notice-audience-${defaultValues?.id ?? "new"}`}
              name="audienceType"
              defaultValue={defaultValues?.audienceType ?? NOTICE_AUDIENCE_TYPES.ALL}
            >
              <option value={NOTICE_AUDIENCE_TYPES.ALL}>All</option>
              <option value={NOTICE_AUDIENCE_TYPES.ROLE}>Role</option>
              <option value={NOTICE_AUDIENCE_TYPES.CLASS}>Class</option>
              <option value={NOTICE_AUDIENCE_TYPES.SECTION}>Section</option>
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.audienceType} />
        </div>
        <div className="grid gap-2">
          <FormField label="Notice type" htmlFor={`notice-type-${defaultValues?.id ?? "new"}`}>
            <Select
              id={`notice-type-${defaultValues?.id ?? "new"}`}
              name="noticeType"
              defaultValue={defaultValues?.noticeType ?? "NORMAL"}
            >
              <option value="NORMAL">Normal</option>
              <option value="IMPORTANT">Important</option>
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.noticeType} />
        </div>
        <div className="grid gap-2">
          <FormField label="Expires on" htmlFor={`notice-expiry-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`notice-expiry-${defaultValues?.id ?? "new"}`}
              name="expiresAt"
              type="date"
              defaultValue={defaultValues?.expiresAt ?? ""}
            />
          </FormField>
          <FieldError error={state.fieldErrors?.expiresAt} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-2">
          <FormField label="Role target" htmlFor={`notice-role-${defaultValues?.id ?? "new"}`}>
            <Select
              id={`notice-role-${defaultValues?.id ?? "new"}`}
              name="roleCode"
              defaultValue={defaultValues?.roleCode ?? ""}
            >
              <option value="">No role target</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.roleCode} />
        </div>
        <div className="grid gap-2">
          <FormField label="Class target" htmlFor={`notice-class-${defaultValues?.id ?? "new"}`}>
            <Select
              id={`notice-class-${defaultValues?.id ?? "new"}`}
              name="classId"
              defaultValue={defaultValues?.classId ?? ""}
            >
              <option value="">No class target</option>
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
          <FormField label="Section target" htmlFor={`notice-section-${defaultValues?.id ?? "new"}`}>
            <Select
              id={`notice-section-${defaultValues?.id ?? "new"}`}
              name="sectionId"
              defaultValue={defaultValues?.sectionId ?? ""}
            >
              <option value="">No section target</option>
              {sections.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.sectionId} />
        </div>
      </div>

      <div className="grid gap-2">
        <FormField label="Notice body" htmlFor={`notice-body-${defaultValues?.id ?? "new"}`}>
          <Textarea
            id={`notice-body-${defaultValues?.id ?? "new"}`}
            name="body"
            className="min-h-[150px]"
            defaultValue={defaultValues?.body ?? ""}
            placeholder="Write the message staff, parents, or class groups should see."
          />
        </FormField>
        <FieldError error={state.fieldErrors?.body} />
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving notice...">
          {defaultValues?.id ? "Update notice" : "Create notice"}
        </SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}
