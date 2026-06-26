"use client";

import { AttendanceStatus } from "@prisma/client";
import { useActionState, useState } from "react";

import { saveAttendanceSheetAction } from "@/app/(dashboard)/dashboard/attendance/actions";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { initialActionFormState } from "@/lib/forms";

type StudentRow = {
  id: string;
  fullName: string;
  admissionNumber: string;
  rollNumber: string | null;
  status: AttendanceStatus;
  remarks: string;
};

const statusChoices: Array<{
  value: AttendanceStatus;
  label: string;
  className: string;
}> = [
  {
    value: AttendanceStatus.PRESENT,
    label: "Present",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800"
  },
  {
    value: AttendanceStatus.ABSENT,
    label: "Absent",
    className: "border-red-200 bg-red-50 text-red-700"
  },
  {
    value: AttendanceStatus.LATE,
    label: "Late",
    className: "border-amber-200 bg-amber-50 text-amber-800"
  },
  {
    value: AttendanceStatus.LEAVE,
    label: "Leave",
    className: "border-slate-200 bg-slate-100 text-slate-800"
  }
];

export function AttendanceSheetForm({
  students,
  classId,
  className,
  sectionId,
  sectionName,
  date
}: {
  students: StudentRow[];
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  date: string;
}) {
  const [state, formAction] = useActionState(saveAttendanceSheetAction, initialActionFormState);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(
    Object.fromEntries(students.map((student) => [student.id, student.status]))
  );

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="date" value={date} />

      <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-panel sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-2">
            <p className="text-sm font-medium text-slate-700">Current sheet</p>
            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1">{className}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">{sectionName}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">{date}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <SubmitButton pendingLabel="Saving attendance...">Bulk save attendance</SubmitButton>
          </div>
        </div>
        <FormStateMessage state={state} />
      </section>

      <section className="grid gap-4">
        {students.map((student) => (
          <div
            key={student.id}
            className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-panel sm:p-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid gap-1">
                <p className="font-medium text-slate-950">{student.fullName}</p>
                <p className="text-sm text-slate-500">
                  Admission {student.admissionNumber}
                  {student.rollNumber ? ` • Roll ${student.rollNumber}` : ""}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {statusChoices.map((choice) => (
                  <label
                    key={choice.value}
                    className={cn(
                      "cursor-pointer rounded-2xl border px-3 py-2 text-center text-sm font-medium transition",
                      statuses[student.id] === choice.value
                        ? choice.className
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <input
                      type="radio"
                      name={`status_${student.id}`}
                      value={choice.value}
                      className="sr-only"
                      defaultChecked={student.status === choice.value}
                      onChange={() =>
                        setStatuses((current) => ({
                          ...current,
                          [student.id]: choice.value
                        }))
                      }
                    />
                    {choice.label}
                  </label>
                ))}
              </div>
            </div>

            <FormField label="Remarks" htmlFor={`remarks_${student.id}`}>
              <Input
                id={`remarks_${student.id}`}
                name={`remarks_${student.id}`}
                defaultValue={student.remarks}
                placeholder="Optional note for absence, leave, or late arrival"
              />
            </FormField>
          </div>
        ))}
      </section>
    </form>
  );
}
