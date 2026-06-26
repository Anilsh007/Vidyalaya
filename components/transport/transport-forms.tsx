"use client";

import { useActionState } from "react";

import {
  saveTransportAssignmentAction,
  saveTransportRouteAction,
  saveTransportStopAction,
  saveTransportVehicleAction
} from "@/app/(dashboard)/dashboard/transport/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { initialActionFormState } from "@/lib/forms";

type VehicleOption = { id: string; vehicleNumber: string; vehicleType: string; capacity: number };
type RouteOption = { id: string; name: string; code: string; monthlyFee?: string | null };
type StopOption = { id: string; routeId: string; name: string };
type StudentOption = { id: string; name: string; meta?: string };

export function TransportVehicleForm({
  defaultValues
}: {
  defaultValues?: {
    id?: string;
    vehicleNumber?: string;
    vehicleType?: string;
    capacity?: number;
    driverName?: string | null;
    driverPhone?: string | null;
    helperName?: string | null;
    insuranceValidUntil?: string;
    fitnessValidUntil?: string;
    isActive?: boolean;
  };
}) {
  const [state, formAction] = useActionState(saveTransportVehicleAction, initialActionFormState);
  const formId = defaultValues?.id ?? "new";

  return (
    <form action={formAction} className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />
      <div className="grid gap-4 lg:grid-cols-[180px_1fr_160px]">
        <div className="grid gap-2">
          <FormField label="Vehicle no." htmlFor={`vehicle-number-${formId}`}>
            <Input id={`vehicle-number-${formId}`} name="vehicleNumber" defaultValue={defaultValues?.vehicleNumber ?? ""} placeholder="UP-32 AB 1234" />
          </FormField>
          <FieldError error={state.fieldErrors?.vehicleNumber} />
        </div>
        <div className="grid gap-2">
          <FormField label="Vehicle type" htmlFor={`vehicle-type-${formId}`}>
            <Input id={`vehicle-type-${formId}`} name="vehicleType" defaultValue={defaultValues?.vehicleType ?? "Bus"} />
          </FormField>
          <FieldError error={state.fieldErrors?.vehicleType} />
        </div>
        <div className="grid gap-2">
          <FormField label="Capacity" htmlFor={`vehicle-capacity-${formId}`}>
            <Input id={`vehicle-capacity-${formId}`} name="capacity" type="number" min="1" defaultValue={defaultValues?.capacity ?? 40} />
          </FormField>
          <FieldError error={state.fieldErrors?.capacity} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FormField label="Driver" htmlFor={`driver-${formId}`}>
          <Input id={`driver-${formId}`} name="driverName" defaultValue={defaultValues?.driverName ?? ""} />
        </FormField>
        <FormField label="Driver phone" htmlFor={`driver-phone-${formId}`}>
          <Input id={`driver-phone-${formId}`} name="driverPhone" defaultValue={defaultValues?.driverPhone ?? ""} />
        </FormField>
        <FormField label="Helper" htmlFor={`helper-${formId}`}>
          <Input id={`helper-${formId}`} name="helperName" defaultValue={defaultValues?.helperName ?? ""} />
        </FormField>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FormField label="Insurance valid until" htmlFor={`insurance-${formId}`}>
          <Input id={`insurance-${formId}`} name="insuranceValidUntil" type="date" defaultValue={defaultValues?.insuranceValidUntil ?? ""} />
        </FormField>
        <FormField label="Fitness valid until" htmlFor={`fitness-${formId}`}>
          <Input id={`fitness-${formId}`} name="fitnessValidUntil" type="date" defaultValue={defaultValues?.fitnessValidUntil ?? ""} />
        </FormField>
        <FormField label="Status" htmlFor={`vehicle-status-${formId}`}>
          <Select id={`vehicle-status-${formId}`} name="isActive" defaultValue={defaultValues?.isActive === false ? "no" : "yes"}>
            <option value="yes">Active</option>
            <option value="no">Inactive</option>
          </Select>
        </FormField>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving vehicle...">{defaultValues?.id ? "Update vehicle" : "Create vehicle"}</SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function TransportRouteForm({ vehicles, defaultValues }: { vehicles: VehicleOption[]; defaultValues?: { id?: string; vehicleId?: string | null; name?: string; code?: string; startPoint?: string | null; endPoint?: string | null; monthlyFee?: string | null; isActive?: boolean } }) {
  const [state, formAction] = useActionState(saveTransportRouteAction, initialActionFormState);
  const formId = defaultValues?.id ?? "new";

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />
      <div className="grid gap-4 lg:grid-cols-[160px_1fr]">
        <div className="grid gap-2">
          <FormField label="Route code" htmlFor={`route-code-${formId}`}>
            <Input id={`route-code-${formId}`} name="code" defaultValue={defaultValues?.code ?? ""} placeholder="R-01" />
          </FormField>
          <FieldError error={state.fieldErrors?.code} />
        </div>
        <div className="grid gap-2">
          <FormField label="Route name" htmlFor={`route-name-${formId}`}>
            <Input id={`route-name-${formId}`} name="name" defaultValue={defaultValues?.name ?? ""} placeholder="North City Route" />
          </FormField>
          <FieldError error={state.fieldErrors?.name} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <FormField label="Vehicle" htmlFor={`route-vehicle-${formId}`}>
          <Select id={`route-vehicle-${formId}`} name="vehicleId" defaultValue={defaultValues?.vehicleId ?? ""}>
            <option value="">No vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicleNumber} - {vehicle.vehicleType}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Start point" htmlFor={`route-start-${formId}`}>
          <Input id={`route-start-${formId}`} name="startPoint" defaultValue={defaultValues?.startPoint ?? ""} />
        </FormField>
        <FormField label="End point" htmlFor={`route-end-${formId}`}>
          <Input id={`route-end-${formId}`} name="endPoint" defaultValue={defaultValues?.endPoint ?? ""} />
        </FormField>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <FormField label="Monthly fee" htmlFor={`route-fee-${formId}`}>
          <Input id={`route-fee-${formId}`} name="monthlyFee" type="number" min="0" step="0.01" defaultValue={defaultValues?.monthlyFee ?? ""} />
        </FormField>
        <FormField label="Status" htmlFor={`route-status-${formId}`}>
          <Select id={`route-status-${formId}`} name="isActive" defaultValue={defaultValues?.isActive === false ? "no" : "yes"}>
            <option value="yes">Active</option>
            <option value="no">Inactive</option>
          </Select>
        </FormField>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving route...">{defaultValues?.id ? "Update route" : "Create route"}</SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function TransportStopForm({ routes }: { routes: RouteOption[] }) {
  const [state, formAction] = useActionState(saveTransportStopAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-4">
      <FormField label="Route" htmlFor="stop-route">
        <Select id="stop-route" name="routeId">
          <option value="">Select route</option>
          {routes.map((route) => (
            <option key={route.id} value={route.id}>{route.code} - {route.name}</option>
          ))}
        </Select>
      </FormField>
      <div className="grid gap-4 lg:grid-cols-[1fr_110px]">
        <div className="grid gap-2">
          <FormField label="Stop name" htmlFor="stop-name">
            <Input id="stop-name" name="name" placeholder="Main Market" />
          </FormField>
          <FieldError error={state.fieldErrors?.name} />
        </div>
        <FormField label="Order" htmlFor="stop-order">
          <Input id="stop-order" name="stopOrder" type="number" min="0" defaultValue="0" />
        </FormField>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <FormField label="Pickup time" htmlFor="pickup-time">
          <Input id="pickup-time" name="pickupTime" placeholder="07:15 AM" />
        </FormField>
        <FormField label="Drop time" htmlFor="drop-time">
          <Input id="drop-time" name="dropTime" placeholder="02:45 PM" />
        </FormField>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving stop...">Add stop</SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function TransportAssignmentForm({ students, routes, stops }: { students: StudentOption[]; routes: RouteOption[]; stops: StopOption[] }) {
  const [state, formAction] = useActionState(saveTransportAssignmentAction, initialActionFormState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <FormField label="Student" htmlFor="transport-student">
            <Select id="transport-student" name="studentId">
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.name} {student.meta ? `- ${student.meta}` : ""}</option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.studentId} />
        </div>
        <div className="grid gap-2">
          <FormField label="Route" htmlFor="assignment-route">
            <Select id="assignment-route" name="routeId">
              <option value="">Select route</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>{route.code} - {route.name}</option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.routeId} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <FormField label="Stop" htmlFor="assignment-stop">
          <Select id="assignment-stop" name="stopId">
            <option value="">No stop selected</option>
            {stops.map((stop) => (
              <option key={stop.id} value={stop.id}>{stop.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Start date" htmlFor="assignment-start">
          <Input id="assignment-start" name="startDate" type="date" defaultValue={today} />
        </FormField>
        <FormField label="End date" htmlFor="assignment-end">
          <Input id="assignment-end" name="endDate" type="date" />
        </FormField>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <FormField label="Status" htmlFor="assignment-status">
          <Select id="assignment-status" name="status" defaultValue="ACTIVE">
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="ENDED">Ended</option>
          </Select>
        </FormField>
        <FormField label="Monthly fee" htmlFor="assignment-fee">
          <Input id="assignment-fee" name="monthlyFee" type="number" min="0" step="0.01" />
        </FormField>
      </div>
      <FormField label="Remarks" htmlFor="assignment-remarks">
        <Textarea id="assignment-remarks" name="remarks" className="min-h-[90px]" />
      </FormField>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Assigning transport...">Assign transport</SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}
