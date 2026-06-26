"use client";

import { useActionState } from "react";

import {
  saveHostelAction,
  saveHostelAllocationAction,
  saveHostelRoomAction
} from "@/app/(dashboard)/dashboard/hostel/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { initialActionFormState } from "@/lib/forms";

type HostelOption = { id: string; code: string; name: string };
type RoomOption = { id: string; hostelId: string; roomNumber: string; capacity: number; occupied: number; monthlyFee?: string | null };
type StudentOption = { id: string; name: string; meta?: string };

export function HostelForm({ defaultValues }: { defaultValues?: { id?: string; name?: string; code?: string; wardenName?: string | null; wardenPhone?: string | null; address?: string | null; isActive?: boolean } }) {
  const [state, formAction] = useActionState(saveHostelAction, initialActionFormState);
  const formId = defaultValues?.id ?? "new";

  return (
    <form action={formAction} className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />
      <div className="grid gap-4 lg:grid-cols-[160px_1fr]">
        <div className="grid gap-2">
          <FormField label="Hostel code" htmlFor={`hostel-code-${formId}`}>
            <Input id={`hostel-code-${formId}`} name="code" defaultValue={defaultValues?.code ?? ""} placeholder="H-01" />
          </FormField>
          <FieldError error={state.fieldErrors?.code} />
        </div>
        <div className="grid gap-2">
          <FormField label="Hostel name" htmlFor={`hostel-name-${formId}`}>
            <Input id={`hostel-name-${formId}`} name="name" defaultValue={defaultValues?.name ?? ""} placeholder="Boys Hostel" />
          </FormField>
          <FieldError error={state.fieldErrors?.name} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <FormField label="Warden" htmlFor={`warden-${formId}`}>
          <Input id={`warden-${formId}`} name="wardenName" defaultValue={defaultValues?.wardenName ?? ""} />
        </FormField>
        <FormField label="Warden phone" htmlFor={`warden-phone-${formId}`}>
          <Input id={`warden-phone-${formId}`} name="wardenPhone" defaultValue={defaultValues?.wardenPhone ?? ""} />
        </FormField>
        <FormField label="Status" htmlFor={`hostel-status-${formId}`}>
          <Select id={`hostel-status-${formId}`} name="isActive" defaultValue={defaultValues?.isActive === false ? "no" : "yes"}>
            <option value="yes">Active</option>
            <option value="no">Inactive</option>
          </Select>
        </FormField>
      </div>
      <FormField label="Address" htmlFor={`hostel-address-${formId}`}>
        <Textarea id={`hostel-address-${formId}`} name="address" className="min-h-[90px]" defaultValue={defaultValues?.address ?? ""} />
      </FormField>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving hostel...">{defaultValues?.id ? "Update hostel" : "Create hostel"}</SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function HostelRoomForm({ hostels }: { hostels: HostelOption[] }) {
  const [state, formAction] = useActionState(saveHostelRoomAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-4">
      <FormField label="Hostel" htmlFor="room-hostel">
        <Select id="room-hostel" name="hostelId">
          <option value="">Select hostel</option>
          {hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.code} - {hostel.name}</option>)}
        </Select>
      </FormField>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-2">
          <FormField label="Room no." htmlFor="room-number"><Input id="room-number" name="roomNumber" /></FormField>
          <FieldError error={state.fieldErrors?.roomNumber} />
        </div>
        <FormField label="Floor" htmlFor="room-floor"><Input id="room-floor" name="floor" /></FormField>
        <FormField label="Room type" htmlFor="room-type"><Input id="room-type" name="roomType" placeholder="Dormitory" /></FormField>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-2">
          <FormField label="Capacity" htmlFor="room-capacity"><Input id="room-capacity" name="capacity" type="number" min="1" /></FormField>
          <FieldError error={state.fieldErrors?.capacity} />
        </div>
        <FormField label="Monthly fee" htmlFor="room-fee"><Input id="room-fee" name="monthlyFee" type="number" min="0" step="0.01" /></FormField>
        <FormField label="Status" htmlFor="room-status"><Select id="room-status" name="isActive" defaultValue="yes"><option value="yes">Active</option><option value="no">Inactive</option></Select></FormField>
      </div>
      <div className="flex justify-end"><SubmitButton pendingLabel="Saving room...">Add room</SubmitButton></div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function HostelAllocationForm({ students, hostels, rooms }: { students: StudentOption[]; hostels: HostelOption[]; rooms: RoomOption[] }) {
  const [state, formAction] = useActionState(saveHostelAllocationAction, initialActionFormState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <FormField label="Student" htmlFor="hostel-student"><Select id="hostel-student" name="studentId"><option value="">Select student</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name} {s.meta ? `- ${s.meta}` : ""}</option>)}</Select></FormField>
          <FieldError error={state.fieldErrors?.studentId} />
        </div>
        <div className="grid gap-2">
          <FormField label="Hostel" htmlFor="allocation-hostel"><Select id="allocation-hostel" name="hostelId"><option value="">Select hostel</option>{hostels.map((h) => <option key={h.id} value={h.id}>{h.code} - {h.name}</option>)}</Select></FormField>
          <FieldError error={state.fieldErrors?.hostelId} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-2">
          <FormField label="Room" htmlFor="allocation-room"><Select id="allocation-room" name="roomId"><option value="">Select room</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.roomNumber} ({r.occupied}/{r.capacity})</option>)}</Select></FormField>
          <FieldError error={state.fieldErrors?.roomId} />
        </div>
        <FormField label="Bed no." htmlFor="bed-number"><Input id="bed-number" name="bedNumber" /></FormField>
        <FormField label="Monthly fee" htmlFor="hostel-fee"><Input id="hostel-fee" name="monthlyFee" type="number" min="0" step="0.01" /></FormField>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <FormField label="Start date" htmlFor="allocation-start"><Input id="allocation-start" name="startDate" type="date" defaultValue={today} /></FormField>
        <FormField label="End date" htmlFor="allocation-end"><Input id="allocation-end" name="endDate" type="date" /></FormField>
        <FormField label="Status" htmlFor="allocation-status"><Select id="allocation-status" name="status" defaultValue="ACTIVE"><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="VACATED">Vacated</option></Select></FormField>
      </div>
      <FormField label="Guardian consent" htmlFor="guardian-consent"><Select id="guardian-consent" name="guardianConsent" defaultValue="yes"><option value="yes">Yes</option><option value="no">No</option></Select></FormField>
      <FormField label="Remarks" htmlFor="hostel-remarks"><Textarea id="hostel-remarks" name="remarks" className="min-h-[90px]" /></FormField>
      <div className="flex justify-end"><SubmitButton pendingLabel="Allocating hostel...">Allocate hostel</SubmitButton></div>
      <FormStateMessage state={state} />
    </form>
  );
}
