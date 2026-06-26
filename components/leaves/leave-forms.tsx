"use client";

import { useActionState } from "react";

import { reviewLeaveRequestAction, saveLeaveRequestAction } from "@/app/(dashboard)/dashboard/leaves/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { initialActionFormState } from "@/lib/forms";

type StudentOption = { id: string; name: string; meta?: string };
type StaffOption = { id: string; name: string; meta?: string };

export function LeaveRequestForm({ students, staff }: { students: StudentOption[]; staff: StaffOption[] }) {
  const [state, formAction] = useActionState(saveLeaveRequestAction, initialActionFormState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <FormField label="Requester type" htmlFor="requesterType">
            <Select id="requesterType" name="requesterType" defaultValue="STUDENT">
              <option value="STUDENT">Student</option>
              <option value="STAFF">Staff</option>
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.requesterType} />
        </div>
        <div className="grid gap-2">
          <FormField label="Leave type" htmlFor="leaveType">
            <Select id="leaveType" name="leaveType" defaultValue="Sick leave">
              <option value="Sick leave">Sick leave</option>
              <option value="Casual leave">Casual leave</option>
              <option value="Medical leave">Medical leave</option>
              <option value="Family leave">Family leave</option>
              <option value="Emergency leave">Emergency leave</option>
              <option value="Other leave">Other leave</option>
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.leaveType} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <FormField label="Student" htmlFor="studentId">
            <Select id="studentId" name="studentId">
              <option value="">Select student when requester is student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}{student.meta ? ` - ${student.meta}` : ""}
                </option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.studentId} />
        </div>
        <div className="grid gap-2">
          <FormField label="Staff" htmlFor="staffId">
            <Select id="staffId" name="staffId">
              <option value="">Select staff when requester is staff</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}{member.meta ? ` - ${member.meta}` : ""}
                </option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.staffId} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <FormField label="Start date" htmlFor="startDate"><Input id="startDate" name="startDate" type="date" defaultValue={today} /></FormField>
          <FieldError error={state.fieldErrors?.startDate} />
        </div>
        <div className="grid gap-2">
          <FormField label="End date" htmlFor="endDate"><Input id="endDate" name="endDate" type="date" defaultValue={today} /></FormField>
          <FieldError error={state.fieldErrors?.endDate} />
        </div>
      </div>

      <div className="grid gap-2">
        <FormField label="Reason" htmlFor="reason">
          <Textarea id="reason" name="reason" className="min-h-[110px]" placeholder="Brief leave reason for approval record" />
        </FormField>
        <FieldError error={state.fieldErrors?.reason} />
      </div>

      <div className="flex justify-end"><SubmitButton pendingLabel="Submitting leave...">Submit leave request</SubmitButton></div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function LeaveReviewForm({ leaveId }: { leaveId: string }) {
  const [state, formAction] = useActionState(reviewLeaveRequestAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="leaveId" value={leaveId} />
      <div className="grid gap-2">
        <FormField label="Decision" htmlFor={`status-${leaveId}`}>
          <Select id={`status-${leaveId}`} name="status" defaultValue="APPROVED">
            <option value="APPROVED">Approve</option>
            <option value="REJECTED">Reject</option>
            <option value="CANCELLED">Cancel</option>
          </Select>
        </FormField>
        <FieldError error={state.fieldErrors?.status} />
      </div>
      <FormField label="Review remarks" htmlFor={`remarks-${leaveId}`}>
        <Textarea id={`remarks-${leaveId}`} name="reviewRemarks" className="min-h-[100px]" placeholder="Optional approval or rejection remarks" />
      </FormField>
      <div className="flex justify-end"><SubmitButton pendingLabel="Saving decision...">Save decision</SubmitButton></div>
      <FormStateMessage state={state} />
    </form>
  );
}
