"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { requireAnyPermission } from "@/lib/rbac/guards";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { getCurrentAcademicYear } from "@/lib/school";
import { archiveStudentRecord, saveStudentRecord } from "@/lib/services/students.service";
import { studentSchema } from "@/lib/validations/students";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || undefined;
}

export async function saveStudentAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const isEditing = Boolean(getOptionalString(formData, "id"));
  const session = await requireAnyPermission(
    isEditing
      ? [RBAC_PERMISSIONS.studentsUpdate]
      : [RBAC_PERMISSIONS.studentsCreate, RBAC_PERMISSIONS.studentsUpdate]
  );
  const academicYear = await getCurrentAcademicYear(session.schoolId);
  if (!academicYear) {
    return {
      status: "error",
      message: "Create an academic year before adding students."
    };
  }

  const parsed = studentSchema.safeParse({
    id: getOptionalString(formData, "id"),
    firstName: getString(formData, "firstName"),
    lastName: getString(formData, "lastName"),
    gender: getString(formData, "gender"),
    dateOfBirth: getString(formData, "dateOfBirth"),
    admissionDate: getString(formData, "admissionDate"),
    admissionNumber: getString(formData, "admissionNumber"),
    rollNumber: getString(formData, "rollNumber"),
    status: getString(formData, "status") || "ACTIVE",
    classId: getOptionalString(formData, "classId"),
    sectionId: getOptionalString(formData, "sectionId"),
    phone: getString(formData, "phone"),
    email: getString(formData, "email"),
    address: getString(formData, "address"),
    guardianName: getString(formData, "guardianName"),
    relation: getString(formData, "relation"),
    fatherName: getString(formData, "fatherName"),
    motherName: getString(formData, "motherName"),
    guardianPhonePrimary: getString(formData, "guardianPhonePrimary"),
    guardianPhoneSecondary: getString(formData, "guardianPhoneSecondary"),
    guardianEmail: getString(formData, "guardianEmail"),
    occupation: getString(formData, "occupation")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the student form.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  try {
    const result = await saveStudentRecord({
      schoolId: session.schoolId,
      academicYearId: academicYear.id,
      ...parsed.data
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: result.created ? "student.created" : "student.updated",
      entityType: "Student",
      entityId: result.studentId,
      metadata: {
        fullName: result.fullName,
        admissionNumber: result.admissionNumber,
        classId: result.classId,
        sectionId: result.sectionId
      }
    });

    revalidatePath("/dashboard/students");
    revalidatePath(`/dashboard/students/${result.studentId}`);
    redirect(`/dashboard/students/${result.studentId}?saved=1`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save the student.";
    return {
      status: "error",
      message
    };
  }
}

export async function archiveStudentAction(formData: FormData) {
  const session = await requirePermission(RBAC_PERMISSIONS.studentsDelete);
  const studentId = getString(formData, "studentId");
  if (!studentId) {
    return;
  }

  const student = await archiveStudentRecord({ schoolId: session.schoolId, studentId });
  if (!student) {
    return;
  }

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "student.archived",
    entityType: "Student",
    entityId: student.id,
    metadata: {
      fullName: student.fullName,
      admissionNumber: student.admissionNumber
    }
  });

  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${student.id}`);
}
