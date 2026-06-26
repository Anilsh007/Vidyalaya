"use client";

import { useActionState } from "react";

import {
  saveExamAction,
  saveGradeConfigAction,
  saveMarksSheetAction
} from "@/app/(dashboard)/dashboard/exams/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { initialActionFormState } from "@/lib/forms";

type ClassOption = {
  id: string;
  name: string;
};

type SubjectOption = {
  id: string;
  name: string;
  code: string;
  classId?: string | null;
};

type StudentMarkRow = {
  id: string;
  fullName: string;
  rollNumber?: string | null;
  admissionNumber: string;
  marks: number;
  remarks: string;
};

export function ExamForm({
  classes,
  subjects,
  defaultValues
}: {
  classes: ClassOption[];
  subjects: SubjectOption[];
  defaultValues?: {
    id?: string;
    name?: string;
    classId?: string | null;
    examTerm?: string | null;
    examType?: string | null;
    startDate?: string;
    endDate?: string;
    subjectConfig?: Record<string, { maxMarks: number; passMarks: number }>;
  };
}) {
  const [state, formAction] = useActionState(saveExamAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_180px_180px_180px_180px]">
        <div className="grid gap-2">
          <FormField label="Exam name" htmlFor={`exam-name-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`exam-name-${defaultValues?.id ?? "new"}`}
              name="name"
              defaultValue={defaultValues?.name ?? ""}
              placeholder="Mid Term Examination"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.name} />
        </div>
        <div className="grid gap-2">
          <FormField label="Class" htmlFor={`exam-class-${defaultValues?.id ?? "new"}`}>
            <Select
              id={`exam-class-${defaultValues?.id ?? "new"}`}
              name="classId"
              defaultValue={defaultValues?.classId ?? ""}
            >
              <option value="">All / common</option>
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
          <FormField label="Exam term" htmlFor={`exam-term-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`exam-term-${defaultValues?.id ?? "new"}`}
              name="examTerm"
              defaultValue={defaultValues?.examTerm ?? ""}
              placeholder="Term 1"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.examTerm} />
        </div>
        <div className="grid gap-2">
          <FormField label="Exam type" htmlFor={`exam-type-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`exam-type-${defaultValues?.id ?? "new"}`}
              name="examType"
              defaultValue={defaultValues?.examType ?? ""}
              placeholder="Written"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.examType} />
        </div>
        <div className="grid gap-2">
          <FormField label="Start date" htmlFor={`exam-start-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`exam-start-${defaultValues?.id ?? "new"}`}
              name="startDate"
              type="date"
              defaultValue={defaultValues?.startDate ?? ""}
            />
          </FormField>
          <FieldError error={state.fieldErrors?.startDate} />
        </div>
        <div className="grid gap-2">
          <FormField label="End date" htmlFor={`exam-end-${defaultValues?.id ?? "new"}`}>
            <Input
              id={`exam-end-${defaultValues?.id ?? "new"}`}
              name="endDate"
              type="date"
              defaultValue={defaultValues?.endDate ?? ""}
            />
          </FormField>
          <FieldError error={state.fieldErrors?.endDate} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjects.map((subject) => (
          <div key={subject.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <input type="hidden" name="subjectCode" value={subject.id} />
            <div>
              <p className="font-medium text-slate-950">{subject.name}</p>
              <p className="text-sm text-slate-500">{subject.code}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Max marks" htmlFor={`max-${subject.id}`}>
                <Input
                  id={`max-${subject.id}`}
                  name="maxMarks"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={defaultValues?.subjectConfig?.[subject.id]?.maxMarks ?? ""}
                  placeholder="100"
                />
              </FormField>
              <FormField label="Pass marks" htmlFor={`pass-${subject.id}`}>
                <Input
                  id={`pass-${subject.id}`}
                  name="passMarks"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={defaultValues?.subjectConfig?.[subject.id]?.passMarks ?? ""}
                  placeholder="35"
                />
              </FormField>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving exam...">
          {defaultValues?.id ? "Update exam" : "Create exam"}
        </SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function GradeConfigForm({ defaultText }: { defaultText: string }) {
  const [state, formAction] = useActionState(saveGradeConfigAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <div className="grid gap-2">
        <FormField
          label="Grading rules"
          htmlFor="gradeConfig"
          hint="Use one rule per line in the format min:grade:PASS or FAIL"
        >
          <Textarea
            id="gradeConfig"
            name="gradeConfig"
            className="min-h-[180px]"
            defaultValue={defaultText}
          />
        </FormField>
        <FieldError error={state.fieldErrors?.gradeConfig} />
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving grading...">Save grading</SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function MarksEntryForm({
  examId,
  sectionId,
  examSubjectId,
  subjectName,
  maxMarks,
  students,
  teacherRemarks,
  principalRemarks
}: {
  examId: string;
  sectionId: string;
  examSubjectId: string;
  subjectName: string;
  maxMarks: number;
  students: StudentMarkRow[];
  teacherRemarks?: string | null;
  principalRemarks?: string | null;
}) {
  const [state, formAction] = useActionState(saveMarksSheetAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="examSubjectId" value={examSubjectId} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Marks entry subject</p>
          <p className="text-lg font-semibold text-slate-950">
            {subjectName} • Maximum {maxMarks}
          </p>
        </div>
        <SubmitButton pendingLabel="Saving marks...">Save marks sheet</SubmitButton>
      </div>

      <div className="grid gap-4">
        {students.map((student) => (
          <div key={student.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-950">{student.fullName}</p>
                <p className="text-sm text-slate-500">
                  {student.rollNumber ? `Roll ${student.rollNumber} • ` : ""}
                  {student.admissionNumber}
                </p>
              </div>
              <div className="w-full max-w-[180px]">
                <FormField label="Marks" htmlFor={`marks-${student.id}`}>
                  <Input
                    id={`marks-${student.id}`}
                    name={`marks_${student.id}`}
                    type="number"
                    min="0"
                    max={maxMarks}
                    step="0.01"
                    defaultValue={student.marks}
                  />
                </FormField>
              </div>
            </div>

            <FormField label="Subject remarks" htmlFor={`remarks-${student.id}`}>
              <Input
                id={`remarks-${student.id}`}
                name={`remarks_${student.id}`}
                defaultValue={student.remarks}
                placeholder="Optional remark for this subject"
              />
            </FormField>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormField label="Teacher remarks" htmlFor="teacherRemarks">
          <Textarea
            id="teacherRemarks"
            name="teacherRemarks"
            className="min-h-[120px]"
            defaultValue={teacherRemarks ?? ""}
            placeholder="Overall teacher remark for this result sheet"
          />
        </FormField>
        <FormField label="Principal remarks" htmlFor="principalRemarks">
          <Textarea
            id="principalRemarks"
            name="principalRemarks"
            className="min-h-[120px]"
            defaultValue={principalRemarks ?? ""}
            placeholder="Principal remark for the report card"
          />
        </FormField>
      </div>

      <FormStateMessage state={state} />
    </form>
  );
}
