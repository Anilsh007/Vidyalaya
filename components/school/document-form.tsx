"use client";

import { useActionState, useState } from "react";

import { saveDocumentAction } from "@/app/(dashboard)/dashboard/documents/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { DOCUMENT_OWNER_OPTIONS } from "@/lib/documents";
import { initialActionFormState } from "@/lib/forms";

type Option = {
  id: string;
  label: string;
};

type DocumentFormValues = {
  id?: string;
  ownerType: string;
  studentId: string;
  staffId: string;
  userId: string;
  title: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: string;
};

export function DocumentForm({
  title,
  description,
  submitLabel,
  values,
  students,
  staff,
  users
}: {
  title: string;
  description: string;
  submitLabel: string;
  values: DocumentFormValues;
  students: Option[];
  staff: Option[];
  users: Option[];
}) {
  const [state, formAction] = useActionState(saveDocumentAction, initialActionFormState);
  const [ownerType, setOwnerType] = useState(values.ownerType);

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
            <FormField label="Owner type" htmlFor="ownerType">
              <Select
                id="ownerType"
                name="ownerType"
                value={ownerType}
                onChange={(event) => setOwnerType(event.target.value)}
              >
                {DOCUMENT_OWNER_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FieldError error={state.fieldErrors?.ownerType} />
          </div>

          {ownerType === "STUDENT" ? (
            <div className="grid gap-2 md:col-span-2">
              <FormField label="Student" htmlFor="studentId">
                <Select id="studentId" name="studentId" defaultValue={values.studentId}>
                  <option value="">Select student</option>
                  {students.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FieldError error={state.fieldErrors?.studentId} />
            </div>
          ) : null}

          {ownerType === "STAFF" ? (
            <div className="grid gap-2 md:col-span-2">
              <FormField label="Staff" htmlFor="staffId">
                <Select id="staffId" name="staffId" defaultValue={values.staffId}>
                  <option value="">Select staff</option>
                  {staff.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FieldError error={state.fieldErrors?.staffId} />
            </div>
          ) : null}

          {ownerType === "USER" ? (
            <div className="grid gap-2 md:col-span-2">
              <FormField label="User account" htmlFor="userId">
                <Select id="userId" name="userId" defaultValue={values.userId}>
                  <option value="">Select user</option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FieldError error={state.fieldErrors?.userId} />
            </div>
          ) : null}

          <div className="grid gap-2 xl:col-span-2">
            <FormField label="Document title" htmlFor="title">
              <Input id="title" name="title" defaultValue={values.title} placeholder="Transfer certificate" />
            </FormField>
            <FieldError error={state.fieldErrors?.title} />
          </div>
          <div className="grid gap-2">
            <FormField label="File name" htmlFor="fileName">
              <Input id="fileName" name="fileName" defaultValue={values.fileName} placeholder="tc-2026.pdf" />
            </FormField>
            <FieldError error={state.fieldErrors?.fileName} />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <FormField label="File reference" htmlFor="filePath" hint="Use a local path, LAN share, or storage reference used by the school office.">
              <Input id="filePath" name="filePath" defaultValue={values.filePath} placeholder="/uploads/students/tc-2026.pdf" />
            </FormField>
            <FieldError error={state.fieldErrors?.filePath} />
          </div>
          <div className="grid gap-2">
            <FormField label="MIME type" htmlFor="mimeType">
              <Input id="mimeType" name="mimeType" defaultValue={values.mimeType} placeholder="application/pdf" />
            </FormField>
            <FieldError error={state.fieldErrors?.mimeType} />
          </div>
          <div className="grid gap-2">
            <FormField label="File size bytes" htmlFor="fileSizeBytes">
              <Input id="fileSizeBytes" name="fileSizeBytes" type="number" min="1" step="1" defaultValue={values.fileSizeBytes} />
            </FormField>
            <FieldError error={state.fieldErrors?.fileSizeBytes} />
          </div>
        </div>
      </section>

      <FormStateMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving document...">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
