"use server";

import { revalidatePath } from "next/cache";
import { TransportAssignmentStatus } from "@prisma/client";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import {
  archiveTransportRoute,
  archiveTransportVehicle,
  saveTransportAssignment,
  saveTransportRoute,
  saveTransportStop,
  saveTransportVehicle
} from "@/lib/services/transport.service";
import {
  transportAssignmentSchema,
  transportRouteSchema,
  transportStopSchema,
  transportVehicleSchema
} from "@/lib/validations/transport";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || undefined;
}

export async function saveTransportVehicleAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageTransport);
  const parsed = transportVehicleSchema.safeParse({
    id: getOptionalString(formData, "id"),
    vehicleNumber: getString(formData, "vehicleNumber"),
    vehicleType: getString(formData, "vehicleType"),
    capacity: getString(formData, "capacity"),
    driverName: getString(formData, "driverName"),
    driverPhone: getString(formData, "driverPhone"),
    helperName: getString(formData, "helperName"),
    insuranceValidUntil: getString(formData, "insuranceValidUntil"),
    fitnessValidUntil: getString(formData, "fitnessValidUntil"),
    isActive: getString(formData, "isActive") || "yes"
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the vehicle details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;

  try {
    const vehicle = await saveTransportVehicle({
      schoolId: session.schoolId,
      id: data.id,
      vehicleNumber: data.vehicleNumber,
      vehicleType: data.vehicleType,
      capacity: data.capacity,
      driverName: data.driverName,
      driverPhone: data.driverPhone,
      helperName: data.helperName,
      insuranceValidUntil: data.insuranceValidUntil,
      fitnessValidUntil: data.fitnessValidUntil,
      isActive: data.isActive
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: data.id ? "transport.vehicle.updated" : "transport.vehicle.created",
      entityType: "TransportVehicle",
      entityId: vehicle.id,
      metadata: { vehicleNumber: vehicle.vehicleNumber }
    });

    revalidatePath("/dashboard/transport");
    return { status: "success", message: data.id ? "Vehicle updated." : "Vehicle created." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to save vehicle." };
  }
}

export async function saveTransportRouteAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageTransport);
  const parsed = transportRouteSchema.safeParse({
    id: getOptionalString(formData, "id"),
    vehicleId: getOptionalString(formData, "vehicleId"),
    name: getString(formData, "name"),
    code: getString(formData, "code"),
    startPoint: getString(formData, "startPoint"),
    endPoint: getString(formData, "endPoint"),
    monthlyFee: getString(formData, "monthlyFee"),
    isActive: getString(formData, "isActive") || "yes"
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the route details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;

  try {
    const route = await saveTransportRoute({
      schoolId: session.schoolId,
      id: data.id,
      vehicleId: data.vehicleId,
      name: data.name,
      code: data.code,
      startPoint: data.startPoint,
      endPoint: data.endPoint,
      monthlyFee: data.monthlyFee,
      isActive: data.isActive
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: data.id ? "transport.route.updated" : "transport.route.created",
      entityType: "TransportRoute",
      entityId: route.id,
      metadata: { code: route.code, name: route.name }
    });

    revalidatePath("/dashboard/transport");
    return { status: "success", message: data.id ? "Route updated." : "Route created." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to save route." };
  }
}

export async function saveTransportStopAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageTransport);
  const parsed = transportStopSchema.safeParse({
    id: getOptionalString(formData, "id"),
    routeId: getString(formData, "routeId"),
    name: getString(formData, "name"),
    pickupTime: getString(formData, "pickupTime"),
    dropTime: getString(formData, "dropTime"),
    stopOrder: getString(formData, "stopOrder") || "0"
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the stop details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;

  try {
    const stop = await saveTransportStop({
      schoolId: session.schoolId,
      id: data.id,
      routeId: data.routeId,
      name: data.name,
      pickupTime: data.pickupTime,
      dropTime: data.dropTime,
      stopOrder: data.stopOrder
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: data.id ? "transport.stop.updated" : "transport.stop.created",
      entityType: "TransportStop",
      entityId: stop.id,
      metadata: { routeId: data.routeId, name: data.name }
    });

    revalidatePath("/dashboard/transport");
    return { status: "success", message: data.id ? "Stop updated." : "Stop created." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to save stop." };
  }
}

export async function saveTransportAssignmentAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageTransport);
  const parsed = transportAssignmentSchema.safeParse({
    id: getOptionalString(formData, "id"),
    studentId: getString(formData, "studentId"),
    routeId: getString(formData, "routeId"),
    stopId: getOptionalString(formData, "stopId"),
    startDate: getString(formData, "startDate"),
    endDate: getString(formData, "endDate"),
    status: getString(formData, "status") || "ACTIVE",
    monthlyFee: getString(formData, "monthlyFee"),
    remarks: getString(formData, "remarks")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the transport assignment.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;

  try {
    const assignment = await saveTransportAssignment({
      schoolId: session.schoolId,
      id: data.id,
      studentId: data.studentId,
      routeId: data.routeId,
      stopId: data.stopId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status as TransportAssignmentStatus,
      monthlyFee: data.monthlyFee,
      remarks: data.remarks
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: data.id ? "transport.assignment.updated" : "transport.assignment.created",
      entityType: "TransportAssignment",
      entityId: assignment.id,
      metadata: { studentId: data.studentId, routeId: data.routeId }
    });

    revalidatePath("/dashboard/transport");
    return { status: "success", message: data.id ? "Assignment updated." : "Student assigned to transport." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to save transport assignment." };
  }
}

export async function archiveTransportVehicleAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.manageTransport);
  const id = getString(formData, "vehicleId");
  if (!id) return;
  await archiveTransportVehicle({ schoolId: session.schoolId, vehicleId: id });
  revalidatePath("/dashboard/transport");
}

export async function archiveTransportRouteAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.manageTransport);
  const id = getString(formData, "routeId");
  if (!id) return;
  await archiveTransportRoute({ schoolId: session.schoolId, routeId: id });
  revalidatePath("/dashboard/transport");
}
