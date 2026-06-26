"use server";

import { revalidatePath } from "next/cache";
import { HostelAllocationStatus, Prisma } from "@prisma/client";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { hostelAllocationSchema, hostelRoomSchema, hostelSchema } from "@/lib/hostel";
import { PERMISSIONS } from "@/lib/permissions";

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
    const hostel = data.id
      ? await (async () => {
          const existing = await db.hostel.findFirst({ where: { id: data.id, schoolId: session.schoolId }, select: { id: true } });
          if (!existing) throw new Error("Hostel not found.");
          return db.hostel.update({
            where: { id: existing.id },
            data: {
              name: data.name,
              code: data.code,
              wardenName: data.wardenName || null,
              wardenPhone: data.wardenPhone || null,
              address: data.address || null,
              isActive: data.isActive === "yes",
              isArchived: false,
              archivedAt: null
            }
          });
        })()
      : await db.hostel.create({
          data: {
            schoolId: session.schoolId,
            name: data.name,
            code: data.code,
            wardenName: data.wardenName || null,
            wardenPhone: data.wardenPhone || null,
            address: data.address || null,
            isActive: data.isActive === "yes"
          }
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
  const roomData = {
    hostelId: data.hostelId,
    roomNumber: data.roomNumber,
    floor: data.floor || null,
    roomType: data.roomType || null,
    capacity: data.capacity,
    monthlyFee: data.monthlyFee === undefined || data.monthlyFee === "" ? null : new Prisma.Decimal(data.monthlyFee),
    isActive: data.isActive === "yes",
    isArchived: false,
    archivedAt: null
  };

  try {
    const hostel = await db.hostel.findFirst({ where: { id: data.hostelId, schoolId: session.schoolId }, select: { id: true } });
    if (!hostel) throw new Error("Hostel not found.");

    const room = data.id
      ? await db.hostelRoom.update({ where: { id: data.id }, data: roomData })
      : await db.hostelRoom.create({ data: { schoolId: session.schoolId, ...roomData } });

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
    const room = await db.hostelRoom.findFirst({
      where: { id: data.roomId, schoolId: session.schoolId, hostelId: data.hostelId, isArchived: false },
      include: { allocations: { where: { status: "ACTIVE" } } }
    });
    if (!room) throw new Error("Room not found.");
    if (!data.id && room.allocations.length >= room.capacity) throw new Error("Selected room is already full.");

    const allocationData = {
      studentId: data.studentId,
      hostelId: data.hostelId,
      roomId: data.roomId,
      bedNumber: data.bedNumber || null,
      startDate: toDate(data.startDate)!,
      endDate: toDate(data.endDate, true),
      status: data.status as HostelAllocationStatus,
      monthlyFee: data.monthlyFee === undefined || data.monthlyFee === "" ? null : new Prisma.Decimal(data.monthlyFee),
      guardianConsent: data.guardianConsent === "yes",
      remarks: data.remarks || null
    };

    const allocation = data.id
      ? await db.hostelAllocation.update({ where: { id: data.id }, data: allocationData })
      : await db.hostelAllocation.create({ data: { schoolId: session.schoolId, ...allocationData } });

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
  await db.hostel.updateMany({ where: { id, schoolId: session.schoolId }, data: { isArchived: true, isActive: false, archivedAt: new Date() } });
  revalidatePath("/dashboard/hostel");
}

export async function archiveHostelRoomAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.manageHostel);
  const id = getString(formData, "roomId");
  if (!id) return;
  await db.hostelRoom.updateMany({ where: { id, schoolId: session.schoolId }, data: { isArchived: true, isActive: false, archivedAt: new Date() } });
  revalidatePath("/dashboard/hostel");
}
