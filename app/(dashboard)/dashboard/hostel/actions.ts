"use server";

import { revalidatePath } from "next/cache";
import { HostelAllocationStatus } from "@prisma/client";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import {
  archiveHostel,
  archiveHostelRoom,
  saveHostel,
  saveHostelAllocation,
  saveHostelRoom
} from "@/lib/services/hostel.service";
import { hostelAllocationSchema, hostelRoomSchema, hostelSchema } from "@/lib/validations/hostel";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || undefined;
}

export async function saveHostelAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageHostel);
  const parsed = hostelSchema.safeParse({
    id: getOptionalString(formData, "id"),
    name: getString(formData, "name"),
    code: getString(formData, "code"),
    wardenName: getString(formData, "wardenName"),
    wardenPhone: getString(formData, "wardenPhone"),
    address: getString(formData, "address"),
    isActive: getString(formData, "isActive") || "yes"
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review hostel details.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    const hostel = await saveHostel({
      schoolId: session.schoolId,
      id: data.id,
      name: data.name,
      code: data.code,
      wardenName: data.wardenName,
      wardenPhone: data.wardenPhone,
      address: data.address,
      isActive: data.isActive
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: data.id ? "hostel.updated" : "hostel.created",
      entityType: "Hostel",
      entityId: hostel.id,
      metadata: { code: hostel.code, name: hostel.name }
    });

    revalidatePath("/dashboard/hostel");
    return { status: "success", message: data.id ? "Hostel updated." : "Hostel created." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to save hostel." };
  }
}

export async function saveHostelRoomAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageHostel);
  const parsed = hostelRoomSchema.safeParse({
    id: getOptionalString(formData, "id"),
    hostelId: getString(formData, "hostelId"),
    roomNumber: getString(formData, "roomNumber"),
    floor: getString(formData, "floor"),
    roomType: getString(formData, "roomType"),
    capacity: getString(formData, "capacity"),
    monthlyFee: getString(formData, "monthlyFee"),
    isActive: getString(formData, "isActive") || "yes"
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review room details.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  try {
    const room = await saveHostelRoom({
      schoolId: session.schoolId,
      id: data.id,
      hostelId: data.hostelId,
      roomNumber: data.roomNumber,
      floor: data.floor,
      roomType: data.roomType,
      capacity: data.capacity,
      monthlyFee: data.monthlyFee,
      isActive: data.isActive
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: data.id ? "hostel.room.updated" : "hostel.room.created",
      entityType: "HostelRoom",
      entityId: room.id,
      metadata: { hostelId: data.hostelId, roomNumber: data.roomNumber }
    });

    revalidatePath("/dashboard/hostel");
    return { status: "success", message: data.id ? "Room updated." : "Room created." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to save room." };
  }
}

export async function saveHostelAllocationAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageHostel);
  const parsed = hostelAllocationSchema.safeParse({
    id: getOptionalString(formData, "id"),
    studentId: getString(formData, "studentId"),
    hostelId: getString(formData, "hostelId"),
    roomId: getString(formData, "roomId"),
    bedNumber: getString(formData, "bedNumber"),
    startDate: getString(formData, "startDate"),
    endDate: getString(formData, "endDate"),
    status: getString(formData, "status") || "ACTIVE",
    monthlyFee: getString(formData, "monthlyFee"),
    guardianConsent: getString(formData, "guardianConsent") || "no",
    remarks: getString(formData, "remarks")
  });

  if (!parsed.success) {
    return { status: "error", message: "Please review hostel allocation.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    const allocation = await saveHostelAllocation({
      schoolId: session.schoolId,
      id: data.id,
      studentId: data.studentId,
      hostelId: data.hostelId,
      roomId: data.roomId,
      bedNumber: data.bedNumber,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status as HostelAllocationStatus,
      monthlyFee: data.monthlyFee,
      guardianConsent: data.guardianConsent,
      remarks: data.remarks
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: data.id ? "hostel.allocation.updated" : "hostel.allocation.created",
      entityType: "HostelAllocation",
      entityId: allocation.id,
      metadata: { studentId: data.studentId, hostelId: data.hostelId, roomId: data.roomId }
    });

    revalidatePath("/dashboard/hostel");
    return { status: "success", message: data.id ? "Allocation updated." : "Student allocated to hostel." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to save allocation." };
  }
}

export async function archiveHostelAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.manageHostel);
  const id = getString(formData, "hostelId");
  if (!id) return;
  await archiveHostel({ schoolId: session.schoolId, hostelId: id });
  revalidatePath("/dashboard/hostel");
}

export async function archiveHostelRoomAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.manageHostel);
  const id = getString(formData, "roomId");
  if (!id) return;
  await archiveHostelRoom({ schoolId: session.schoolId, roomId: id });
  revalidatePath("/dashboard/hostel");
}
