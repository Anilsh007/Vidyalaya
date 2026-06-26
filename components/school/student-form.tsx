"use client";

import { useActionState, useMemo, useState } from "react";

import { saveStudentAction } from "@/app/(dashboard)/dashboard/students/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { initialActionFormState } from "@/lib/forms";

type Option = {
  id: string;
  name: string;
};

type StudentFormValues = {
  id?: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  admissionDate: string;
  admissionNumber: string;
  rollNumber: string;
  status: string;
  classId: string;
  sectionId: string;
  address: string;
  guardianName: string;
  relation: string;
  fatherName: string;
  motherName: string;
  guardianPhonePrimary: string;
  guardianPhoneSecondary: string;
  guardianEmail: string;
  occupation: string;
};

export function StudentForm({
  title,
  description,
  submitLabel,
  values,
  classes,
  sections
}: {
  title: string;
  description: string;
  submitLabel: string;
  values: StudentFormValues;
  classes: Option[];
  sections: Array<Option & { classId: string }>;
}) {
  const [state, formAction] = useActionState(saveStudentAction, initialActionFormState);
  const [selectedClassId, setSelectedClassId] = useState(values.classId);
  const visibleSections = useMemo(
    () =>
      selectedClassId ? sections.filter((section) => section.classId === selectedClassId) : sections,
    [sections, selectedClassId]
  );

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
            <FormField label="First name" htmlFor="firstName">
              <Input id="firstName" name="firstName" defaultValue={values.firstName} />
            </FormField>
            <FieldError error={state.fieldErrors?.firstName} />
          </div>
          <div className="grid gap-2">
            <FormField label="Last name" htmlFor="lastName">
              <Input id="lastName" name="lastName" defaultValue={values.lastName} />
            </FormField>
            <FieldError error={state.fieldErrors?.lastName} />
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
            <FormField label="Date of birth" htmlFor="dateOfBirth">
              <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={values.dateOfBirth} />
            </FormField>
            <FieldError error={state.fieldErrors?.dateOfBirth} />
          </div>
          <div className="grid gap-2">
            <FormField label="Admission date" htmlFor="admissionDate">
              <Input id="admissionDate" name="admissionDate" type="date" defaultValue={values.admissionDate} />
            </FormField>
            <FieldError error={state.fieldErrors?.admissionDate} />
          </div>
          <div className="grid gap-2">
            <FormField label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={values.status}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </FormField>
            <FieldError error={state.fieldErrors?.status} />
          </div>
          <div className="grid gap-2">
            <FormField label="Admission number" htmlFor="admissionNumber">
              <Input id="admissionNumber" name="admissionNumber" defaultValue={values.admissionNumber} />
            </FormField>
            <FieldError error={state.fieldErrors?.admissionNumber} />
          </div>
          <div className="grid gap-2">
            <FormField label="Roll number" htmlFor="rollNumber">
              <Input id="rollNumber" name="rollNumber" defaultValue={values.rollNumber} />
            </FormField>
            <FieldError error={state.fieldErrors?.rollNumber} />
          </div>
          <div className="grid gap-2">
            <FormField label="Class" htmlFor="classId">
              <Select
                id="classId"
                name="classId"
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
              >
                <option value="">Assign later</option>
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
            <FormField label="Section" htmlFor="sectionId">
              <Select id="sectionId" name="sectionId" defaultValue={values.sectionId}>
                <option value="">Assign later</option>
                {visibleSections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FieldError error={state.fieldErrors?.sectionId} />
          </div>
          <div className="grid gap-2 md:col-span-2 xl:col-span-3">
            <FormField label="Address" htmlFor="address" hint="Use comma-separated address parts.">
              <Textarea id="address" name="address" defaultValue={values.address} className="min-h-[120px]" />
            </FormField>
            <FieldError error={state.fieldErrors?.address} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
        <div className="grid gap-2">
          <h2 className="text-xl font-semibold text-slate-950">Parent or guardian details</h2>
          <p className="text-sm leading-6 text-slate-600">
            Keep the primary contact details attached to the student record for admissions and communication.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-2">
            <FormField label="Guardian name" htmlFor="guardianName">
              <Input id="guardianName" name="guardianName" defaultValue={values.guardianName} />
            </FormField>
            <FieldError error={state.fieldErrors?.guardianName} />
          </div>
          <div className="grid gap-2">
            <FormField label="Relation" htmlFor="relation">
              <Input id="relation" name="relation" defaultValue={values.relation} placeholder="Father" />
            </FormField>
            <FieldError error={state.fieldErrors?.relation} />
          </div>
          <div className="grid gap-2">
            <FormField label="Primary phone" htmlFor="guardianPhonePrimary">
              <Input
                id="guardianPhonePrimary"
                name="guardianPhonePrimary"
                defaultValue={values.guardianPhonePrimary}
              />
            </FormField>
            <FieldError error={state.fieldErrors?.guardianPhonePrimary} />
          </div>
          <div className="grid gap-2">
            <FormField label="Secondary phone" htmlFor="guardianPhoneSecondary">
              <Input
                id="guardianPhoneSecondary"
                name="guardianPhoneSecondary"
                defaultValue={values.guardianPhoneSecondary}
              />
            </FormField>
            <FieldError error={state.fieldErrors?.guardianPhoneSecondary} />
          </div>
          <div className="grid gap-2">
            <FormField label="Guardian email" htmlFor="guardianEmail">
              <Input id="guardianEmail" name="guardianEmail" defaultValue={values.guardianEmail} />
            </FormField>
            <FieldError error={state.fieldErrors?.guardianEmail} />
          </div>
          <div className="grid gap-2">
            <FormField label="Occupation" htmlFor="occupation">
              <Input id="occupation" name="occupation" defaultValue={values.occupation} />
            </FormField>
            <FieldError error={state.fieldErrors?.occupation} />
          </div>
          <div className="grid gap-2">
            <FormField label="Father's name" htmlFor="fatherName">
              <Input id="fatherName" name="fatherName" defaultValue={values.fatherName} />
            </FormField>
            <FieldError error={state.fieldErrors?.fatherName} />
          </div>
          <div className="grid gap-2">
            <FormField label="Mother's name" htmlFor="motherName">
              <Input id="motherName" name="motherName" defaultValue={values.motherName} />
            </FormField>
            <FieldError error={state.fieldErrors?.motherName} />
          </div>
        </div>
      </section>

      <FormStateMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving student...">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
