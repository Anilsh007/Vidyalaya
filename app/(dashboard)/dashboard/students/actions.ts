"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Gender } from "@prisma/client";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentAcademicYear, studentSchema } from "@/lib/school";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || undefined;
}

function splitAddress(address?: string) {
  const parts = (address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    addressLine1: parts[0] ?? null,
    addressLine2: parts[1] ?? null,
    city: parts[2] ?? null,
    state: parts[3] ?? null,
    postalCode: parts[4] ?? null
  };
}

export async function saveStudentAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageStudents);
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

  const data = parsed.data;
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");
  const studentAddress = splitAddress(data.address);

  try {
    const result = await db.$transaction(async (tx) => {
      const parentData = {
        schoolId: session.schoolId,
        guardianName: data.guardianName,
        relation: data.relation,
        fatherName: data.fatherName || null,
        motherName: data.motherName || null,
        phonePrimary: data.guardianPhonePrimary,
        phoneSecondary: data.guardianPhoneSecondary || null,
        email: data.guardianEmail || null,
        occupation: data.occupation || null,
        ...studentAddress
      };

      let studentId = data.id;
      let parentId: string;

      if (studentId) {
        const existingStudent = await tx.student.findFirst({
          where: { id: studentId, schoolId: session.schoolId }
        });

        if (!existingStudent) {
          throw new Error("Student not found.");
        }

        const existingLink = await tx.studentGuardian.findFirst({
          where: {
            studentId,
            student: {
              schoolId: session.schoolId
            },
            isPrimary: true
          },
          include: { parent: true }
        });

        const student = await tx.student.update({
          where: { id: studentId },
          data: {
            academicYearId: academicYear.id,
            firstName: data.firstName,
            lastName: data.lastName || null,
            fullName,
            gender: data.gender ? (data.gender as Gender) : null,
            dateOfBirth: data.dateOfBirth ? new Date(`${data.dateOfBirth}T00:00:00.000Z`) : null,
            admissionDate: new Date(`${data.admissionDate}T00:00:00.000Z`),
            admissionNumber: data.admissionNumber,
            rollNumber: data.rollNumber || null,
            status: data.status,
            classId: data.classId || null,
            sectionId: data.sectionId || null,
            ...studentAddress
          }
        });

        if (existingLink) {
          await tx.parent.update({
            where: { id: existingLink.parentId },
            data: parentData
          });
          parentId = existingLink.parentId;
        } else {
          const parent = await tx.parent.create({ data: parentData });
          parentId = parent.id;
          await tx.studentGuardian.create({
            data: {
              studentId: student.id,
              parentId,
              isPrimary: true
            }
          });
        }

        return { studentId: student.id, parentId, created: false };
      }

      const parent = await tx.parent.create({ data: parentData });
      parentId = parent.id;

      const student = await tx.student.create({
        data: {
          schoolId: session.schoolId,
          academicYearId: academicYear.id,
          firstName: data.firstName,
          lastName: data.lastName || null,
          fullName,
          gender: data.gender ? (data.gender as Gender) : null,
          dateOfBirth: data.dateOfBirth ? new Date(`${data.dateOfBirth}T00:00:00.000Z`) : null,
          admissionDate: new Date(`${data.admissionDate}T00:00:00.000Z`),
          admissionNumber: data.admissionNumber,
          rollNumber: data.rollNumber || null,
          status: data.status,
          classId: data.classId || null,
          sectionId: data.sectionId || null,
          ...studentAddress
        }
      });

      await tx.studentGuardian.create({
        data: {
          studentId: student.id,
          parentId,
          isPrimary: true
        }
      });

      return { studentId: student.id, parentId, created: true };
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: result.created ? "student.created" : "student.updated",
      entityType: "Student",
      entityId: result.studentId,
      metadata: {
        fullName,
        admissionNumber: data.admissionNumber,
        classId: data.classId || null,
        sectionId: data.sectionId || null
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
  const session = await requirePermission(PERMISSIONS.manageStudents);
  const studentId = getString(formData, "studentId");
  if (!studentId) {
    return;
  }

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId: session.schoolId },
    select: { id: true }
  });

  if (!student) {
    return;
  }

  await db.student.update({
    where: { id: student.id },
    data: { status: "ARCHIVED" }
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "student.archived",
    entityType: "Student",
    entityId: studentId
  });

  revalidatePath("/dashboard/students");
  revalidatePath(`/dashboard/students/${studentId}`);
}
