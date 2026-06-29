"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { requireAnyPermission } from "@/lib/rbac/guards";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { getCurrentAcademicYear } from "@/lib/school";
import { archiveStaffRecord, saveStaffRecord } from "@/lib/services/staff.service";
import { staffSchema } from "@/lib/validations/staff";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function saveStaffAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const isEditing = Boolean(getString(formData, "id"));
  const session = await requireAnyPermission(
    isEditing
      ? [RBAC_PERMISSIONS.staffUpdate]
      : [RBAC_PERMISSIONS.staffCreate, RBAC_PERMISSIONS.staffUpdate]
  );
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

  try {
    const staff = await saveStaffRecord({
      schoolId: session.schoolId,
      academicYearId: academicYear.id,
      ...parsed.data
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: parsed.data.id ? "staff.updated" : "staff.created",
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
  const session = await requirePermission(RBAC_PERMISSIONS.staffDelete);
  const staffId = getString(formData, "staffId");
  if (!staffId) {
    return;
  }

  const staff = await archiveStaffRecord({ schoolId: session.schoolId, staffId });
  if (!staff) {
    return;
  }

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "staff.archived",
    entityType: "Staff",
    entityId: staff.id,
    metadata: { fullName: staff.fullName, employeeCode: staff.employeeCode }
  });

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staff.id}`);
}
