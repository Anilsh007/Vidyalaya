"use client";

import { useActionState } from "react";

import { saveSchoolSettingsAction } from "@/app/(dashboard)/dashboard/settings/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { initialActionFormState } from "@/lib/forms";

type SchoolSettingsValues = {
  schoolName: string;
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  academicYearName: string;
  academicYearStartDate: string;
  academicYearEndDate: string;
  receiptPrefix: string;
  reportCardTitle: string;
  gradingScale: string;
  showAttendanceOnReportCard: string;
  principalSignatureLabel: string;
};

export function SchoolSettingsForm({ values }: { values: SchoolSettingsValues }) {
  const [state, formAction] = useActionState(saveSchoolSettingsAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-5">
          <FormField label="School name" htmlFor="schoolName">
            <Input id="schoolName" name="schoolName" defaultValue={values.schoolName} />
          </FormField>
          <FieldError error={state.fieldErrors?.schoolName} />

          <FormField
            label="Logo field"
            htmlFor="logoUrl"
            hint="Upload-ready placeholder. Save a file path, CDN URL, or leave blank for now."
          >
            <Input
              id="logoUrl"
              name="logoUrl"
              defaultValue={values.logoUrl}
              placeholder="/uploads/school-logo.png"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.logoUrl} />

          <FormField label="Address" htmlFor="address" hint="Use comma-separated address parts.">
            <Textarea id="address" name="address" defaultValue={values.address} className="min-h-[140px]" />
          </FormField>
          <FieldError error={state.fieldErrors?.address} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <FormField label="Phone" htmlFor="phone">
                <Input id="phone" name="phone" defaultValue={values.phone} />
              </FormField>
              <FieldError error={state.fieldErrors?.phone} />
            </div>
            <div className="grid gap-2">
              <FormField label="Email" htmlFor="email">
                <Input id="email" name="email" type="email" defaultValue={values.email} />
              </FormField>
              <FieldError error={state.fieldErrors?.email} />
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <FormField label="Academic year" htmlFor="academicYearName">
                <Input
                  id="academicYearName"
                  name="academicYearName"
                  defaultValue={values.academicYearName}
                  placeholder="2026-2027"
                />
              </FormField>
              <FieldError error={state.fieldErrors?.academicYearName} />
            </div>
            <div className="grid gap-2">
              <FormField label="Receipt prefix" htmlFor="receiptPrefix">
                <Input id="receiptPrefix" name="receiptPrefix" defaultValue={values.receiptPrefix} />
              </FormField>
              <FieldError error={state.fieldErrors?.receiptPrefix} />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <FormField label="Academic year start" htmlFor="academicYearStartDate">
                <Input
                  id="academicYearStartDate"
                  name="academicYearStartDate"
                  type="date"
                  defaultValue={values.academicYearStartDate}
                />
              </FormField>
              <FieldError error={state.fieldErrors?.academicYearStartDate} />
            </div>
            <div className="grid gap-2">
              <FormField label="Academic year end" htmlFor="academicYearEndDate">
                <Input
                  id="academicYearEndDate"
                  name="academicYearEndDate"
                  type="date"
                  defaultValue={values.academicYearEndDate}
                />
              </FormField>
              <FieldError error={state.fieldErrors?.academicYearEndDate} />
            </div>
          </div>

          <FormField label="Report card title" htmlFor="reportCardTitle">
            <Input
              id="reportCardTitle"
              name="reportCardTitle"
              defaultValue={values.reportCardTitle}
            />
          </FormField>
          <FieldError error={state.fieldErrors?.reportCardTitle} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <FormField label="Grading scale" htmlFor="gradingScale">
                <Input id="gradingScale" name="gradingScale" defaultValue={values.gradingScale} />
              </FormField>
              <FieldError error={state.fieldErrors?.gradingScale} />
            </div>
            <div className="grid gap-2">
              <FormField label="Principal signature label" htmlFor="principalSignatureLabel">
                <Input
                  id="principalSignatureLabel"
                  name="principalSignatureLabel"
                  defaultValue={values.principalSignatureLabel}
                />
              </FormField>
              <FieldError error={state.fieldErrors?.principalSignatureLabel} />
            </div>
          </div>

          <div className="grid gap-2">
            <FormField label="Attendance on report card" htmlFor="showAttendanceOnReportCard">
              <Select
                id="showAttendanceOnReportCard"
                name="showAttendanceOnReportCard"
                defaultValue={values.showAttendanceOnReportCard}
              >
                <option value="yes">Show attendance summary</option>
                <option value="no">Hide attendance summary</option>
              </Select>
            </FormField>
            <FieldError error={state.fieldErrors?.showAttendanceOnReportCard} />
          </div>
        </div>
      </div>

      <FormStateMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving settings...">Save school settings</SubmitButton>
      </div>
    </form>
  );
}
