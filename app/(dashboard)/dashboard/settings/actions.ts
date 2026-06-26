"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import {
  classSchema,
  getCurrentAcademicYear,
  schoolSettingsSchema,
  sectionSchema,
  subjectSchema,
  upsertSetting
} from "@/lib/school";
import { requirePermission } from "@/lib/auth/access";
import { PERMISSIONS } from "@/lib/permissions";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || undefined;
}

export async function saveSchoolSettingsAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageSchoolSettings);
  const parsed = schoolSettingsSchema.safeParse({
    schoolName: getString(formData, "schoolName"),
    logoUrl: getString(formData, "logoUrl"),
    address: getString(formData, "address"),
    phone: getString(formData, "phone"),
    email: getString(formData, "email"),
    academicYearName: getString(formData, "academicYearName"),
    academicYearStartDate: getString(formData, "academicYearStartDate"),
    academicYearEndDate: getString(formData, "academicYearEndDate"),
    receiptPrefix: getString(formData, "receiptPrefix"),
    reportCardTitle: getString(formData, "reportCardTitle"),
    gradingScale: getString(formData, "gradingScale"),
    showAttendanceOnReportCard: getString(formData, "showAttendanceOnReportCard"),
    principalSignatureLabel: getString(formData, "principalSignatureLabel")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the school setup fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;
  const addressParts = data.address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const currentAcademicYear = await getCurrentAcademicYear(session.schoolId);
  if (!currentAcademicYear) {
    return {
      status: "error",
      message: "No active academic year was found for this school."
    };
  }

  if (new Date(data.academicYearStartDate) > new Date(data.academicYearEndDate)) {
    return {
      status: "error",
      message: "Academic year end date must be after the start date.",
      fieldErrors: {
        academicYearEndDate: ["Academic year end date must be after the start date."]
      }
    };
  }

  await db.$transaction(async (tx) => {
    await tx.school.update({
      where: { id: session.schoolId },
      data: {
        name: data.schoolName,
        phone: data.phone,
        email: data.email,
        addressLine1: addressParts[0] ?? data.address,
        addressLine2: addressParts[1] ?? null,
        city: addressParts[2] ?? null,
        state: addressParts[3] ?? null,
        postalCode: addressParts[4] ?? null,
        country: addressParts[5] ?? "India"
      }
    });

    await tx.academicYear.update({
      where: { id: currentAcademicYear.id },
      data: {
        name: data.academicYearName,
        startDate: new Date(`${data.academicYearStartDate}T00:00:00.000Z`),
        endDate: new Date(`${data.academicYearEndDate}T23:59:59.999Z`)
      }
    });

    await Promise.all([
      upsertSetting(tx, session.schoolId, "branding", "logoUrl", data.logoUrl || ""),
      upsertSetting(tx, session.schoolId, "finance", "receiptPrefix", data.receiptPrefix),
      upsertSetting(tx, session.schoolId, "report_card", "title", data.reportCardTitle),
      upsertSetting(tx, session.schoolId, "report_card", "gradingScale", data.gradingScale),
      upsertSetting(
        tx,
        session.schoolId,
        "report_card",
        "showAttendanceOnReportCard",
        data.showAttendanceOnReportCard === "yes"
      ),
      upsertSetting(
        tx,
        session.schoolId,
        "report_card",
        "principalSignatureLabel",
        data.principalSignatureLabel
      )
    ]);
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "school.settings.updated",
    entityType: "School",
    entityId: session.schoolId,
    metadata: {
      schoolName: data.schoolName,
      academicYearName: data.academicYearName,
      receiptPrefix: data.receiptPrefix
    }
  });

  revalidatePath("/dashboard/settings");

  return {
    status: "success",
    message: "School settings updated successfully."
  };
}

export async function saveClassAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageSchoolSettings);
  const academicYear = await getCurrentAcademicYear(session.schoolId);
  if (!academicYear) {
    return { status: "error", message: "Set an academic year before creating classes." };
  }

  const parsed = classSchema.safeParse({
    id: getOptionalString(formData, "id"),
    name: getString(formData, "name"),
    displayOrder: getString(formData, "displayOrder")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the class details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;
  const saved = data.id
    ? await (async () => {
    const existing = await db.schoolClass.findFirst({
      where: { id: data.id, schoolId: session.schoolId, academicYearId: academicYear.id }
    });

    if (!existing) {
      return { status: "error", message: "Class not found." };
    }

    return db.schoolClass.update({
      where: { id: data.id },
      data: { name: data.name, displayOrder: data.displayOrder }
    });
  })()
    : await db.schoolClass.create({
        data: {
          schoolId: session.schoolId,
          academicYearId: academicYear.id,
          name: data.name,
          displayOrder: data.displayOrder
        }
      });

  if ("status" in saved) {
    return saved;
  }

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: data.id ? "class.updated" : "class.created",
    entityType: "SchoolClass",
    entityId: saved.id,
    metadata: { name: data.name }
  });

  revalidatePath("/dashboard/settings");

  return {
    status: "success",
    message: data.id ? "Class updated." : "Class created."
  };
}

export async function deleteClassAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.manageSchoolSettings);
  const id = getString(formData, "id");
  if (!id) {
    return;
  }

  const existing = await db.schoolClass.findFirst({
    where: { id, schoolId: session.schoolId }
  });

  if (!existing) {
    return;
  }

  await db.schoolClass.delete({
    where: { id }
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "class.deleted",
    entityType: "SchoolClass",
    entityId: id
  });

  revalidatePath("/dashboard/settings");
}

export async function saveSectionAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageSchoolSettings);
  const academicYear = await getCurrentAcademicYear(session.schoolId);
  if (!academicYear) {
    return { status: "error", message: "Set an academic year before creating sections." };
  }

  const parsed = sectionSchema.safeParse({
    id: getOptionalString(formData, "id"),
    classId: getString(formData, "classId"),
    name: getString(formData, "name"),
    capacity: getString(formData, "capacity"),
    classTeacherId: getOptionalString(formData, "classTeacherId")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the section details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;
  const section = data.id
    ? await (async () => {
    const existing = await db.section.findFirst({
      where: { id: data.id, schoolId: session.schoolId, academicYearId: academicYear.id }
    });

    if (!existing) {
      return { status: "error", message: "Section not found." };
    }

    return db.section.update({
      where: { id: data.id },
      data: {
        classId: data.classId,
        name: data.name,
        capacity: typeof data.capacity === "number" ? data.capacity : null,
        classTeacherId: data.classTeacherId || null
      }
    });
  })()
    : await db.section.create({
        data: {
          schoolId: session.schoolId,
          academicYearId: academicYear.id,
          classId: data.classId,
          name: data.name,
          capacity: typeof data.capacity === "number" ? data.capacity : null,
          classTeacherId: data.classTeacherId || null
        }
      });

  if ("status" in section) {
    return section;
  }

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: data.id ? "section.updated" : "section.created",
    entityType: "Section",
    entityId: section.id,
    metadata: {
      name: data.name,
      classId: data.classId,
      classTeacherId: data.classTeacherId || null
    }
  });

  revalidatePath("/dashboard/settings");

  return {
    status: "success",
    message: data.id ? "Section updated." : "Section created."
  };
}

export async function deleteSectionAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.manageSchoolSettings);
  const id = getString(formData, "id");
  if (!id) {
    return;
  }

  const existing = await db.section.findFirst({
    where: { id, schoolId: session.schoolId }
  });

  if (!existing) {
    return;
  }

  await db.section.delete({
    where: { id }
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "section.deleted",
    entityType: "Section",
    entityId: id
  });

  revalidatePath("/dashboard/settings");
}

export async function saveSubjectAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageSchoolSettings);
  const academicYear = await getCurrentAcademicYear(session.schoolId);
  if (!academicYear) {
    return { status: "error", message: "Set an academic year before creating subjects." };
  }

  const parsed = subjectSchema.safeParse({
    id: getOptionalString(formData, "id"),
    name: getString(formData, "name"),
    code: getString(formData, "code"),
    classId: getOptionalString(formData, "classId")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the subject details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;
  const subject = data.id
    ? await (async () => {
    const existing = await db.subject.findFirst({
      where: { id: data.id, schoolId: session.schoolId, academicYearId: academicYear.id }
    });

    if (!existing) {
      return { status: "error", message: "Subject not found." };
    }

    return db.subject.update({
      where: { id: data.id },
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        classId: data.classId || null
      }
    });
  })()
    : await db.subject.create({
        data: {
          schoolId: session.schoolId,
          academicYearId: academicYear.id,
          name: data.name,
          code: data.code.toUpperCase(),
          classId: data.classId || null
        }
      });

  if ("status" in subject) {
    return subject;
  }

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: data.id ? "subject.updated" : "subject.created",
    entityType: "Subject",
    entityId: subject.id,
    metadata: {
      name: data.name,
      code: data.code.toUpperCase(),
      classId: data.classId || null
    }
  });

  revalidatePath("/dashboard/settings");

  return {
    status: "success",
    message: data.id ? "Subject updated." : "Subject created."
  };
}

export async function deleteSubjectAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.manageSchoolSettings);
  const id = getString(formData, "id");
  if (!id) {
    return;
  }

  const existing = await db.subject.findFirst({
    where: { id, schoolId: session.schoolId }
  });

  if (!existing) {
    return;
  }

  await db.subject.delete({
    where: { id }
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "subject.deleted",
    entityType: "Subject",
    entityId: id
  });

  revalidatePath("/dashboard/settings");
}
