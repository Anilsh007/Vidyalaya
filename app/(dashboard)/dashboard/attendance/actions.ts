"use server";

import { AttendanceStatus, RoleCode } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { isAttendanceSheetStatus } from "@/lib/attendance";
import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { hasAnyRole, requireAnyPermission } from "@/lib/rbac/guards";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { teacherCanAccessAssignedClass } from "@/lib/rbac/scope";
import { getCurrentAcademicYear } from "@/lib/school";
import { saveAttendanceSheet } from "@/lib/services/attendance.service";
import { attendanceSheetSchema } from "@/lib/validations/attendance";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function saveAttendanceSheetAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requireAnyPermission([
    RBAC_PERMISSIONS.attendanceMark,
    RBAC_PERMISSIONS.attendanceUpdate
  ]);
  const academicYear = await getCurrentAcademicYear(session.schoolId);

  if (!academicYear) {
    return {
      status: "error",
      message: "Create an academic year before marking attendance."
    };
  }

  const parsed = attendanceSheetSchema.safeParse({
    classId: getString(formData, "classId"),
    sectionId: getString(formData, "sectionId"),
    date: getString(formData, "date")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Choose a class, section, and date before saving attendance.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  if (hasAnyRole(session, [RoleCode.TEACHER, RoleCode.HOD, RoleCode.EXAM_CONTROLLER])) {
    const canAccess = await teacherCanAccessAssignedClass(session, parsed.data.classId);
    if (!canAccess) {
      return {
        status: "error",
        message: "You can only mark attendance for your assigned class."
      };
    }
  }

  const entries = Array.from(new Set(
    Array.from(formData.keys())
      .filter((key) => key.startsWith("status_"))
      .map((key) => key.replace("status_", ""))
  ))
    .map((studentId) => {
      const statusValue = getString(formData, `status_${studentId}`) || AttendanceStatus.PRESENT;
      if (!isAttendanceSheetStatus(statusValue)) {
        return null;
      }

      return {
        studentId,
        status: statusValue,
        remarks: getString(formData, `remarks_${studentId}`).trim() || null
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  try {
    const result = await saveAttendanceSheet({
      schoolId: session.schoolId,
      academicYearId: academicYear.id,
      classId: parsed.data.classId,
      sectionId: parsed.data.sectionId,
      date: parsed.data.date,
      entries
    });

    await Promise.all(
      result.auditEntries.map((entry) =>
        recordAuditLog({
          actorUserId: session.userId,
          schoolId: session.schoolId,
          action: entry.action,
          entityType: "Attendance",
          entityId: entry.attendanceId,
          metadata: {
            studentId: entry.studentId,
            date: parsed.data.date,
            classId: parsed.data.classId,
            sectionId: parsed.data.sectionId,
            studentName: entry.fullName,
            status: entry.status,
            remarks: entry.remarks
          }
        })
      )
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/attendance");
    revalidatePath("/dashboard/students");

    return {
      status: "success",
      message: `Attendance saved for ${result.studentsCount} student${result.studentsCount === 1 ? "" : "s"}.`
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to save attendance."
    };
  }
}
