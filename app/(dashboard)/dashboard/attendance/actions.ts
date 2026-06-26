"use server";

import { AttendanceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { attendanceSheetSchema, isAttendanceSheetStatus, toDayBounds } from "@/lib/attendance";
import { db } from "@/lib/db";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentAcademicYear } from "@/lib/school";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function saveAttendanceSheetAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageAttendance);
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

  const data = parsed.data;
  const students = await db.student.findMany({
    where: {
      schoolId: session.schoolId,
      classId: data.classId,
      sectionId: data.sectionId,
      status: { not: "ARCHIVED" }
    },
    orderBy: [{ rollNumber: "asc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true
    }
  });

  if (!students.length) {
    return {
      status: "error",
      message: "No active students are assigned to this section."
    };
  }

  const bounds = toDayBounds(data.date);
  const auditEntries: Array<{
    attendanceId: string;
    studentId: string;
    fullName: string;
    action: string;
    status: AttendanceStatus;
    remarks: string | null;
  }> = [];

  await db.$transaction(async (tx) => {
    for (const student of students) {
      const statusValue = getString(formData, `status_${student.id}`) || AttendanceStatus.PRESENT;
      if (!isAttendanceSheetStatus(statusValue)) {
        continue;
      }

      const remarks = getString(formData, `remarks_${student.id}`).trim() || null;
      const existing = await tx.attendance.findFirst({
        where: {
          schoolId: session.schoolId,
          academicYearId: academicYear.id,
          studentId: student.id,
          date: {
            gte: bounds.start,
            lte: bounds.end
          }
        }
      });

      if (existing) {
        const updated = await tx.attendance.update({
          where: { id: existing.id },
          data: {
            status: statusValue,
            remarks
          }
        });

        auditEntries.push({
          attendanceId: updated.id,
          studentId: student.id,
          fullName: student.fullName,
          action: "attendance.updated",
          status: updated.status,
          remarks
        });
      } else {
        const created = await tx.attendance.create({
          data: {
            schoolId: session.schoolId,
            academicYearId: academicYear.id,
            studentId: student.id,
            date: bounds.start,
            status: statusValue,
            remarks
          }
        });

        auditEntries.push({
          attendanceId: created.id,
          studentId: student.id,
          fullName: student.fullName,
          action: "attendance.created",
          status: created.status,
          remarks
        });
      }
    }
  });

  await Promise.all(
    auditEntries.map((entry) =>
      recordAuditLog({
        actorUserId: session.userId,
        schoolId: session.schoolId,
        action: entry.action,
        entityType: "Attendance",
        entityId: entry.attendanceId,
        metadata: {
          studentId: entry.studentId,
          date: data.date,
          classId: data.classId,
          sectionId: data.sectionId,
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
    message: `Attendance saved for ${students.length} student${students.length === 1 ? "" : "s"}.`
  };
}
