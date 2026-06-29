"use client";

import { useActionState } from "react";

import { archiveDocumentAction, saveDocumentAction } from "@/app/(dashboard)/dashboard/documents/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { DOCUMENT_OWNER_TYPES } from "@/lib/constants/client-enums";
import { initialActionFormState } from "@/lib/forms";

type Option = { id: string; name: string; meta?: string };

export function DocumentForm({ students, staff, users }: { students: Option[]; staff: Option[]; users: Option[] }) {
  const [state, formAction] = useActionState(saveDocumentAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <FormField label="Owner type" htmlFor="ownerType">
            <Select id="ownerType" name="ownerType" defaultValue={DOCUMENT_OWNER_TYPES.STUDENT}>
              <option value={DOCUMENT_OWNER_TYPES.SCHOOL}>School</option>
              <option value={DOCUMENT_OWNER_TYPES.STUDENT}>Student</option>
              <option value={DOCUMENT_OWNER_TYPES.STAFF}>Staff</option>
              <option value={DOCUMENT_OWNER_TYPES.USER}>User</option>
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.ownerType} />
        </div>
        <div className="grid gap-2">
          <FormField label="Title" htmlFor="title"><Input id="title" name="title" placeholder="Transfer certificate" /></FormField>
          <FieldError error={state.fieldErrors?.title} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-2">
          <FormField label="Student" htmlFor="studentId">
            <Select id="studentId" name="studentId"><option value="">Select for student document</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}{student.meta ? ` - ${student.meta}` : ""}</option>)}</Select>
          </FormField>
          <FieldError error={state.fieldErrors?.studentId} />
        </div>
        <div className="grid gap-2">
          <FormField label="Staff" htmlFor="staffId">
            <Select id="staffId" name="staffId"><option value="">Select for staff document</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name}{member.meta ? ` - ${member.meta}` : ""}</option>)}</Select>
          </FormField>
          <FieldError error={state.fieldErrors?.staffId} />
        </div>
        <div className="grid gap-2">
          <FormField label="User" htmlFor="userId">
            <Select id="userId" name="userId"><option value="">Select for user document</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}{user.meta ? ` - ${user.meta}` : ""}</option>)}</Select>
          </FormField>
          <FieldError error={state.fieldErrors?.userId} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <FormField label="File name" htmlFor="fileName"><Input id="fileName" name="fileName" placeholder="certificate.pdf" /></FormField>
          <FieldError error={state.fieldErrors?.fileName} />
        </div>
        <div className="grid gap-2">
          <FormField label="File path or URL" htmlFor="filePath"><Input id="filePath" name="filePath" placeholder="/uploads/certificate.pdf" /></FormField>
          <FieldError error={state.fieldErrors?.filePath} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormField label="MIME type" htmlFor="mimeType"><Input id="mimeType" name="mimeType" placeholder="application/pdf" /></FormField>
        <FormField label="File size bytes" htmlFor="fileSizeBytes"><Input id="fileSizeBytes" name="fileSizeBytes" type="number" min="0" /></FormField>
      </div>
      <div className="flex justify-end"><SubmitButton pendingLabel="Saving document...">Add document</SubmitButton></div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function ArchiveDocumentForm({ documentId }: { documentId: string }) {
  const [state, formAction] = useActionState(archiveDocumentAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="documentId" value={documentId} />
      <p className="text-sm leading-6 text-slate-600">Archive this document record. The file reference remains in history for audit purposes.</p>
      <div className="flex justify-end"><SubmitButton pendingLabel="Archiving...">Archive document</SubmitButton></div>
      <FormStateMessage state={state} />
    </form>
  );
}
