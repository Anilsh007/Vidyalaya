"use server";

import { Gender } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentAcademicYear, staffSchema } from "@/lib/school";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function saveStaffAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageStaff);
  const academicYear = await getCurrentAcademicYear(session.schoolId);
  if (!academicYear) {
    return { status: "error", message: "Set an academic year before creating staff records." };
  }

  const parsed = staffSchema.safeParse({
    id: getString(formData, "id") || undefined,
    employeeCode: getString(formData, "employeeCode"),
    fullName: getString(formData, "fullName"),
    designation: getString(formData, "designation"),
    department: getString(formData, "department"),
    qualification: getString(formData, "qualification"),
    joiningDate: getString(formData, "joiningDate"),
    phone: getString(formData, "phone"),
    email: getString(formData, "email"),
    gender: getString(formData, "gender"),
    salaryAmount: getString(formData, "salaryAmount"),
    isTeachingStaff: getString(formData, "isTeachingStaff")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the staff form.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;
  const staffData = {
    academicYearId: academicYear.id,
    employeeCode: data.employeeCode,
    fullName: data.fullName,
    designation: data.designation,
    department: data.department || null,
    qualification: data.qualification || null,
    joiningDate: new Date(`${data.joiningDate}T00:00:00.000Z`),
    phone: data.phone || null,
    email: data.email || null,
    gender: data.gender ? (data.gender as Gender) : null,
    salaryAmount:
      data.salaryAmount === "" || data.salaryAmount === undefined ? null : Number(data.salaryAmount),
    isTeachingStaff: data.isTeachingStaff === "yes"
  };

  try {
    const staff = data.id
      ? await (async () => {
          const existing = await db.staff.findFirst({
            where: { id: data.id, schoolId: session.schoolId },
            select: { id: true }
          });

          if (!existing) {
            throw new Error("Staff record not found.");
          }

          return db.staff.update({
            where: { id: data.id },
            data: staffData
          });
        })()
      : await db.staff.create({
          data: {
            schoolId: session.schoolId,
            ...staffData
          }
        });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: data.id ? "staff.updated" : "staff.created",
      entityType: "Staff",
      entityId: staff.id,
      metadata: {
        fullName: staff.fullName,
        employeeCode: staff.employeeCode,
        designation: staff.designation,
        isTeachingStaff: staff.isTeachingStaff
      }
    });

    revalidatePath("/dashboard/staff");
    revalidatePath(`/dashboard/staff/${staff.id}`);
    redirect(`/dashboard/staff/${staff.id}?saved=1`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save the staff record.";
    return { status: "error", message };
  }
}

export async function archiveStaffAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.manageStaff);
  const staffId = getString(formData, "staffId");
  if (!staffId) {
    return;
  }

  const staff = await db.staff.findFirst({
    where: { id: staffId, schoolId: session.schoolId },
    select: { id: true, fullName: true }
  });

  if (!staff) {
    return;
  }

  await db.staff.update({
    where: { id: staff.id },
    data: {
      isArchived: true,
      archivedAt: new Date()
    }
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "staff.archived",
    entityType: "Staff",
    entityId: staff.id,
    metadata: { fullName: staff.fullName }
  });

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staff.id}`);
}
