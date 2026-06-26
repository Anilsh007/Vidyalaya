"use server";

import { revalidatePath } from "next/cache";
import { Prisma, TransportAssignmentStatus } from "@prisma/client";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import {
  transportAssignmentSchema,
  transportRouteSchema,
  transportStopSchema,
  transportVehicleSchema
} from "@/lib/transport";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || undefined;
}

function toDate(value?: string | null, endOfDay = false) {
  if (!value) return null;
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
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
    const vehicle = data.id
      ? await (async () => {
          const existing = await db.transportVehicle.findFirst({
            where: { id: data.id, schoolId: session.schoolId },
            select: { id: true }
          });
          if (!existing) throw new Error("Vehicle not found.");
          return db.transportVehicle.update({
            where: { id: existing.id },
            data: {
              vehicleNumber: data.vehicleNumber,
              vehicleType: data.vehicleType,
              capacity: data.capacity,
              driverName: data.driverName || null,
              driverPhone: data.driverPhone || null,
              helperName: data.helperName || null,
              insuranceValidUntil: toDate(data.insuranceValidUntil),
              fitnessValidUntil: toDate(data.fitnessValidUntil),
              isActive: data.isActive === "yes",
              isArchived: false,
              archivedAt: null
            }
          });
        })()
      : await db.transportVehicle.create({
          data: {
            schoolId: session.schoolId,
            vehicleNumber: data.vehicleNumber,
            vehicleType: data.vehicleType,
            capacity: data.capacity,
            driverName: data.driverName || null,
            driverPhone: data.driverPhone || null,
            helperName: data.helperName || null,
            insuranceValidUntil: toDate(data.insuranceValidUntil),
            fitnessValidUntil: toDate(data.fitnessValidUntil),
            isActive: data.isActive === "yes"
          }
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
  const routeData = {
    vehicleId: data.vehicleId || null,
    name: data.name,
    code: data.code,
    startPoint: data.startPoint || null,
    endPoint: data.endPoint || null,
    monthlyFee:
      data.monthlyFee === undefined || data.monthlyFee === ""
        ? null
        : new Prisma.Decimal(data.monthlyFee),
    isActive: data.isActive === "yes",
    isArchived: false,
    archivedAt: null
  };

  try {
    const route = data.id
      ? await (async () => {
          const existing = await db.transportRoute.findFirst({
            where: { id: data.id, schoolId: session.schoolId },
            select: { id: true }
          });
          if (!existing) throw new Error("Route not found.");
          return db.transportRoute.update({ where: { id: existing.id }, data: routeData });
        })()
      : await db.transportRoute.create({ data: { schoolId: session.schoolId, ...routeData } });

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
    const route = await db.transportRoute.findFirst({
      where: { id: data.routeId, schoolId: session.schoolId },
      select: { id: true }
    });
    if (!route) throw new Error("Route not found.");

    const stop = data.id
      ? await db.transportStop.update({
          where: { id: data.id },
          data: {
            routeId: data.routeId,
            name: data.name,
            pickupTime: data.pickupTime || null,
            dropTime: data.dropTime || null,
            stopOrder: data.stopOrder
          }
        })
      : await db.transportStop.create({
          data: {
            schoolId: session.schoolId,
            routeId: data.routeId,
            name: data.name,
            pickupTime: data.pickupTime || null,
            dropTime: data.dropTime || null,
            stopOrder: data.stopOrder
          }
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
  const assignmentData = {
    studentId: data.studentId,
    routeId: data.routeId,
    stopId: data.stopId || null,
    startDate: toDate(data.startDate)!,
    endDate: toDate(data.endDate, true),
    status: data.status as TransportAssignmentStatus,
    monthlyFee:
      data.monthlyFee === undefined || data.monthlyFee === ""
        ? null
        : new Prisma.Decimal(data.monthlyFee),
    remarks: data.remarks || null
  };

  try {
    const student = await db.student.findFirst({
      where: { id: data.studentId, schoolId: session.schoolId },
      select: { id: true }
    });
    if (!student) throw new Error("Student not found.");

    const assignment = data.id
      ? await (async () => {
          const existing = await db.transportAssignment.findFirst({
            where: { id: data.id, schoolId: session.schoolId },
            select: { id: true }
          });
          if (!existing) throw new Error("Transport assignment not found.");
          return db.transportAssignment.update({ where: { id: existing.id }, data: assignmentData });
        })()
      : await db.transportAssignment.create({
          data: { schoolId: session.schoolId, ...assignmentData }
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
  await db.transportVehicle.updateMany({
    where: { id, schoolId: session.schoolId },
    data: { isArchived: true, isActive: false, archivedAt: new Date() }
  });
  revalidatePath("/dashboard/transport");
}

export async function archiveTransportRouteAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.manageTransport);
  const id = getString(formData, "routeId");
  if (!id) return;
  await db.transportRoute.updateMany({
    where: { id, schoolId: session.schoolId },
    data: { isArchived: true, isActive: false, archivedAt: new Date() }
  });
  revalidatePath("/dashboard/transport");
}
