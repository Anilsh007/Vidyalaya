"use client";

import { useActionState } from "react";

import {
  saveClassAction,
  saveSectionAction,
  saveSubjectAction
} from "@/app/(dashboard)/dashboard/settings/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialActionFormState } from "@/lib/forms";

type ClassOption = {
  id: string;
  name: string;
};

type TeacherOption = {
  id: string;
  fullName: string;
};

export function ClassForm({
  defaultValues
}: {
  defaultValues?: {
    id?: string;
    name?: string;
    displayOrder?: number;
  };
}) {
  const [state, formAction] = useActionState(saveClassAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-[1fr_160px_auto] sm:items-end">
        <div className="grid gap-2">
          <FormField label="Class name" htmlFor={`class-name-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`class-name-${defaultValues?.id ?? "new"}`}
              name="name"
              defaultValue={defaultValues?.name ?? ""}
              placeholder="Class 8"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.name} />
        </div>
        <div className="grid gap-2">
          <FormField label="Display order" htmlFor={`class-order-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`class-order-${defaultValues?.id ?? "new"}`}
              name="displayOrder"
              type="number"
              defaultValue={defaultValues?.displayOrder ?? 0}
            />
          </FormField>
          <FieldError error={state.fieldErrors?.displayOrder} />
        </div>
        <SubmitButton pendingLabel="Saving...">
          {defaultValues?.id ? "Update class" : "Add class"}
        </SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function SectionForm({
  classes,
  teachers,
  defaultValues
}: {
  classes: ClassOption[];
  teachers: TeacherOption[];
  defaultValues?: {
    id?: string;
    classId?: string;
    name?: string;
    capacity?: number | null;
    classTeacherId?: string | null;
  };
}) {
  const [state, formAction] = useActionState(saveSectionAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />
      <div className="grid gap-4 xl:grid-cols-[1fr_140px_160px_1fr_auto] xl:items-end">
        <div className="grid gap-2">
          <FormField label="Class" htmlFor={`section-class-${defaultValues?.id ?? "new"}`}>
            <Select
              id={`section-class-${defaultValues?.id ?? "new"}`}
              name="classId"
              defaultValue={defaultValues?.classId ?? ""}
            >
              <option value="">Select class</option>
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
          <FormField label="Section" htmlFor={`section-name-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`section-name-${defaultValues?.id ?? "new"}`}
              name="name"
              defaultValue={defaultValues?.name ?? ""}
              placeholder="A"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.name} />
        </div>
        <div className="grid gap-2">
          <FormField label="Capacity" htmlFor={`section-capacity-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`section-capacity-${defaultValues?.id ?? "new"}`}
              name="capacity"
              type="number"
              defaultValue={defaultValues?.capacity ?? ""}
            />
          </FormField>
          <FieldError error={state.fieldErrors?.capacity} />
        </div>
        <div className="grid gap-2">
          <FormField label="Class teacher" htmlFor={`section-teacher-${defaultValues?.id ?? "new"}`}>
            <Select
              id={`section-teacher-${defaultValues?.id ?? "new"}`}
              name="classTeacherId"
              defaultValue={defaultValues?.classTeacherId ?? ""}
            >
              <option value="">Assign later</option>
              {teachers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.fullName}
                </option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.classTeacherId} />
        </div>
        <SubmitButton pendingLabel="Saving...">
          {defaultValues?.id ? "Update section" : "Add section"}
        </SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function SubjectForm({
  classes,
  defaultValues
}: {
  classes: ClassOption[];
  defaultValues?: {
    id?: string;
    name?: string;
    code?: string;
    classId?: string | null;
  };
}) {
  const [state, formAction] = useActionState(saveSubjectAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />
      <div className="grid gap-4 xl:grid-cols-[1fr_180px_1fr_auto] xl:items-end">
        <div className="grid gap-2">
          <FormField label="Subject name" htmlFor={`subject-name-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`subject-name-${defaultValues?.id ?? "new"}`}
              name="name"
              defaultValue={defaultValues?.name ?? ""}
              placeholder="Science"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.name} />
        </div>
        <div className="grid gap-2">
          <FormField label="Code" htmlFor={`subject-code-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`subject-code-${defaultValues?.id ?? "new"}`}
              name="code"
              defaultValue={defaultValues?.code ?? ""}
              placeholder="SCI-08"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.code} />
        </div>
        <div className="grid gap-2">
          <FormField label="Assigned class" htmlFor={`subject-class-${defaultValues?.id ?? "new"}`}>
            <Select
              id={`subject-class-${defaultValues?.id ?? "new"}`}
              name="classId"
              defaultValue={defaultValues?.classId ?? ""}
            >
              <option value="">Common subject</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.classId} />
        </div>
        <SubmitButton pendingLabel="Saving...">
          {defaultValues?.id ? "Update subject" : "Add subject"}
        </SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}
