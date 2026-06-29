"use server";

import { RoleCode, type Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/access";
import { hashPassword } from "@/lib/auth/password";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import { hasRole, requireAnyPermission, requireSuperAdmin } from "@/lib/rbac/guards";
import {
  canAssignSpecificRole,
  departmentForRoleCategory,
  getSpecificRoleDefinition,
  specificRoleSetsDepartmentHead,
  type RoleCategory,
  type SpecificRoleKey,
  roleCodeToUserType,
  shouldShowReportingManager,
  userAccountSchema
} from "@/lib/user-management";
import { getCurrentAcademicYear } from "@/lib/school";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string | null | undefined) {
  return (phone ?? "").replace(/\D+/g, "");
}

async function resolveAutoLinkedIds(
  tx: Prisma.TransactionClient,
  schoolId: string,
  linkedProfileType: string,
  fullName: string,
  email: string,
  phone: string | null,
  studentId?: string,
  staffId?: string,
  parentId?: string
) {
  const normalizedPhone = normalizePhone(phone);

  if (linkedProfileType === "staff" && !staffId) {
    const candidates = await tx.staff.findMany({
      where: { schoolId, userId: null, isArchived: false },
      select: { id: true, fullName: true, email: true, phone: true }
    });

    const exactMatch =
      candidates.find((item) => item.email && normalizeEmail(item.email) === email) ??
      (normalizedPhone
        ? candidates.find((item) => normalizePhone(item.phone) === normalizedPhone)
        : undefined) ??
      candidates.find((item) => item.fullName.trim().toLowerCase() === fullName.trim().toLowerCase());

    if (exactMatch) {
      staffId = exactMatch.id;
    }
  }

  if (linkedProfileType === "parent" && !parentId) {
    const candidates = await tx.parent.findMany({
      where: { schoolId, userId: null, isArchived: false },
      select: { id: true, guardianName: true, email: true, phonePrimary: true }
    });

    const exactMatch =
      candidates.find((item) => item.email && normalizeEmail(item.email) === email) ??
      (normalizedPhone
        ? candidates.find((item) => normalizePhone(item.phonePrimary) === normalizedPhone)
        : undefined) ??
      candidates.find((item) => item.guardianName.trim().toLowerCase() === fullName.trim().toLowerCase());

    if (exactMatch) {
      parentId = exactMatch.id;
    }
  }

  return { studentId, staffId, parentId };
}

async function validateReportingManager(
  tx: Prisma.TransactionClient,
  schoolId: string,
  roleCategory: RoleCategory,
  reportingManagerId?: string
) {
  if (!reportingManagerId) {
    return null;
  }

  const reportingManager = await tx.staff.findFirst({
    where: {
      id: reportingManagerId,
      schoolId,
      isArchived: false,
      isHod: true,
      department: departmentForRoleCategory(roleCategory),
      user: { is: { isActive: true } }
    },
    select: { id: true, fullName: true, employeeCode: true }
  });

  if (!reportingManager) {
    throw new Error("Selected reporting manager is invalid for the chosen department.");
  }

  return reportingManager;
}

async function ensureStaffProfile(
  tx: Prisma.TransactionClient,
  schoolId: string,
  roleCode: RoleCode,
  roleCategory: RoleCategory,
  specificRoleLabel: string,
  specificRoleKey: SpecificRoleKey,
  fullName: string,
  email: string,
  phone: string | null,
  reportingManagerId?: string,
  staffId?: string
) {
  if (staffId) {
    return staffId;
  }

  const academicYear = await getCurrentAcademicYear(schoolId);
  if (!academicYear) {
    throw new Error("Set a current academic year before creating user accounts for staff roles.");
  }

  const nextCount = await tx.staff.count({ where: { schoolId } });
  const employeeCode = buildEmployeeCode(roleCode, nextCount + 1);
  const designation = roleCodeToDesignation(roleCode);

  const createdStaff = await tx.staff.create({
    data: {
      schoolId,
      academicYearId: academicYear.id,
      employeeCode,
      fullName,
      designation: specificRoleLabel || designation,
      department: departmentForRoleCategory(roleCategory),
      reportingManagerId: reportingManagerId || null,
      isHod: specificRoleSetsDepartmentHead(specificRoleKey),
      joiningDate: new Date(),
      phone,
      email,
      isTeachingStaff:
        roleCode === RoleCode.TEACHER || roleCode === RoleCode.PRINCIPAL || roleCategory === "ACADEMICS"
    }
  });

  return createdStaff.id;
}

function buildEmployeeCode(roleCode: RoleCode, sequence: number) {
  const prefixMap: Record<RoleCode, string> = {
    SUPER_ADMIN: "ADM",
    ADMIN: "ADM",
    PRINCIPAL: "PRI",
    DIRECTOR: "DIR",
    HOD: "HOD",
    TEACHER: "TCH",
    EXAM_CONTROLLER: "EXM",
    ACCOUNTANT: "ACC",
    PROCUREMENT_MANAGER: "PRC",
    LIBRARIAN: "LIB",
    TRANSPORT_MANAGER: "TRN",
    HOSTEL_WARDEN: "HST",
    FRONT_DESK: "FRD",
    HR: "HRM",
    NURSE: "NUR",
    SECURITY_GUARD: "SEC",
    MAINTENANCE_TECHNICIAN: "MNT",
    PEON: "PEO",
    STUDENT: "STD",
    PARENT: "PAR"
  };

  return `${prefixMap[roleCode]}-${sequence.toString().padStart(4, "0")}`;
}

function roleCodeToDesignation(roleCode: RoleCode) {
  const designationMap: Record<RoleCode, string> = {
    SUPER_ADMIN: "Administrator",
    ADMIN: "Administrator",
    PRINCIPAL: "Principal",
    DIRECTOR: "Director",
    HOD: "HOD",
    TEACHER: "Teacher",
    EXAM_CONTROLLER: "Exam Controller",
    ACCOUNTANT: "Accountant",
    PROCUREMENT_MANAGER: "Procurement Manager",
    LIBRARIAN: "Librarian",
    TRANSPORT_MANAGER: "Transport Manager",
    HOSTEL_WARDEN: "Hostel Warden",
    FRONT_DESK: "Front Desk",
    HR: "HR",
    NURSE: "Nurse",
    SECURITY_GUARD: "Security Guard",
    MAINTENANCE_TECHNICIAN: "Maintenance Technician",
    PEON: "Peon",
    STUDENT: "Student",
    PARENT: "Parent"
  };

  return designationMap[roleCode];
}

async function setLinkedProfile(
  tx: Prisma.TransactionClient,
  userId: string,
  schoolId: string,
  linkedProfileType: string,
  roleCategory: RoleCategory,
  specificRoleLabel: string,
  specificRoleKey: SpecificRoleKey,
  accountFullName: string,
  accountEmail: string,
  accountPhone: string | null,
  studentId?: string,
  reportingManagerId?: string,
  staffId?: string,
  parentId?: string
) {
  const currentStaff = await tx.staff.findFirst({
    where: { userId, schoolId },
    select: { id: true }
  });
  const currentParent = await tx.parent.findFirst({
    where: { userId, schoolId },
    select: { id: true }
  });
  const currentStudent = await tx.student.findFirst({
    where: { userId, schoolId, isArchived: false },
    select: { id: true }
  });

  if (currentStaff && currentStaff.id !== staffId) {
    await tx.staff.update({ where: { id: currentStaff.id }, data: { userId: null } });
  }

  if (currentParent && currentParent.id !== parentId) {
    await tx.parent.update({ where: { id: currentParent.id }, data: { userId: null } });
  }
  if (currentStudent && currentStudent.id !== studentId) {
    await tx.student.update({ where: { id: currentStudent.id }, data: { userId: null } });
  }

  if (linkedProfileType === "student" && studentId) {
    const student = await tx.student.findFirst({
      where: { id: studentId, schoolId, isArchived: false },
      select: { id: true, userId: true, fullName: true, admissionNumber: true }
    });

    if (!student) {
      throw new Error("Selected student profile was not found.");
    }

    if (student.userId && student.userId !== userId) {
      throw new Error("Selected student profile is already linked to another login.");
    }

    await tx.student.update({
      where: { id: student.id },
      data: { userId }
    });
  }

  if (linkedProfileType === "staff" && staffId) {
    const staff = await tx.staff.findFirst({
      where: { id: staffId, schoolId },
      select: { id: true, userId: true, fullName: true, designation: true, phone: true, email: true }
    });

    if (!staff) {
      throw new Error("Selected staff profile was not found.");
    }

    if (staff.userId && staff.userId !== userId) {
      throw new Error("Selected staff profile is already linked to another login.");
    }

    await tx.staff.update({
      where: { id: staff.id },
      data: {
        userId,
        fullName: accountFullName,
        designation: specificRoleLabel || staff.designation,
        department: departmentForRoleCategory(roleCategory),
        reportingManagerId: reportingManagerId || null,
        isHod: specificRoleSetsDepartmentHead(specificRoleKey),
        phone: accountPhone ?? staff.phone,
        email: accountEmail
      }
    });
  }

  if (linkedProfileType === "parent" && parentId) {
    const parent = await tx.parent.findFirst({
      where: { id: parentId, schoolId },
      select: { id: true, userId: true, guardianName: true, phonePrimary: true, email: true }
    });

    if (!parent) {
      throw new Error("Selected parent profile was not found.");
    }

    if (parent.userId && parent.userId !== userId) {
      throw new Error("Selected parent profile is already linked to another login.");
    }

    await tx.parent.update({
      where: { id: parent.id },
      data: {
        userId,
        guardianName: accountFullName,
        phonePrimary: accountPhone ?? parent.phonePrimary,
        email: accountEmail
      }
    });
  }
}

async function syncParentStudents(
  tx: Prisma.TransactionClient,
  schoolId: string,
  parentId: string,
  selectedStudentIds: string[]
) {
  const students = await tx.student.findMany({
    where: {
      schoolId,
      id: { in: selectedStudentIds },
      isArchived: false
    },
    select: { id: true }
  });

  if (students.length !== selectedStudentIds.length) {
    throw new Error("One or more selected students could not be found.");
  }

  const currentLinks = await tx.studentGuardian.findMany({
    where: { parentId },
    select: { id: true, studentId: true, isPrimary: true }
  });

  const selectedSet = new Set(selectedStudentIds);

  for (const link of currentLinks) {
    if (!selectedSet.has(link.studentId)) {
      await tx.studentGuardian.delete({ where: { id: link.id } });
    }
  }

  for (const [index, studentId] of selectedStudentIds.entries()) {
    const existing = currentLinks.find((link) => link.studentId === studentId);
    if (!existing) {
      await tx.studentGuardian.create({
        data: {
          parentId,
          studentId,
          isPrimary: index === 0
        }
      });
      continue;
    }

    await tx.studentGuardian.update({
      where: { id: existing.id },
      data: { isPrimary: index === 0 }
    });
  }
}

export async function saveUserAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  void _prevState;
  const isEditing = Boolean(getString(formData, "id"));
  const session = await requireAnyPermission(
    isEditing
      ? [RBAC_PERMISSIONS.usersUpdate, RBAC_PERMISSIONS.usersRolesManage]
      : [RBAC_PERMISSIONS.usersCreate, RBAC_PERMISSIONS.usersRolesManage]
  );
  const parsed = userAccountSchema.safeParse({
    id: getString(formData, "id") || undefined,
    fullName: getString(formData, "fullName"),
    email: getString(formData, "email"),
    phone: getString(formData, "phone"),
    roleCategory: getString(formData, "roleCategory"),
    specificRoleKey: getString(formData, "specificRoleKey"),
    roleCode: getString(formData, "roleCode") || undefined,
    reportingManagerId: getString(formData, "reportingManagerId") || undefined,
    status: getString(formData, "status") === "no" ? "no" : "yes",
    password: getString(formData, "password"),
    forcePasswordReset: getString(formData, "forcePasswordReset") === "yes" ? "yes" : "no",
    linkedProfileType: getString(formData, "linkedProfileType") || "none",
    staffId: getString(formData, "staffId") || undefined,
    parentId: getString(formData, "parentId") || undefined,
    studentId: getString(formData, "studentId") || undefined,
    parentStudentIds: formData.getAll("parentStudentIds").map((value) => String(value)).filter(Boolean)
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the user form.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;
  const email = normalizeEmail(data.email);
  const specificRole = getSpecificRoleDefinition(data.specificRoleKey);
  if (!specificRole) {
    return { status: "error", message: "Selected role configuration is invalid." };
  }

  if (!canAssignSpecificRole(session.roles, data.specificRoleKey)) {
    return {
      status: "error",
      message: `You are not allowed to assign the ${ROLE_LABELS[specificRole.roleCode]} role.`
    };
  }

  const roleCode = specificRole.roleCode as RoleCode;
  const linkedProfileType = specificRole.linkedProfileType;
  const specificRoleLabel = specificRole.label;
  let studentMatchLabel: string | null = null;
  let linkedProfileBadgeLabel: string | null = null;
  let linkedProfileBadgeTone: "success" | "warning" = "warning";
  let linkedProfileSystemId: string | null = null;
  let reportingManagerName: string | null = null;

  try {
    const user = await db.$transaction(async (tx) => {
      const role = await tx.role.findFirst({
        where: { schoolId: session.schoolId, code: roleCode }
      });

      if (!role) {
        throw new Error("Role was not found for this school.");
      }

      const reportingManager = shouldShowReportingManager(data.roleCategory)
        ? await validateReportingManager(tx, session.schoolId, data.roleCategory, data.reportingManagerId)
        : null;
      reportingManagerName = reportingManager?.fullName ?? null;

      if (linkedProfileType === "student" && data.studentId) {
        const studentMatch = await tx.student.findFirst({
          where: {
            id: data.studentId,
            schoolId: session.schoolId,
            isArchived: false
          },
          include: {
            class: { select: { name: true } },
            section: { select: { name: true } }
          }
        });

        if (!studentMatch) {
          throw new Error("Selected student admission record was not found.");
        }

        studentMatchLabel = `${studentMatch.fullName} (${studentMatch.admissionNumber})`;
        linkedProfileBadgeLabel = "Verified Sync";
        linkedProfileBadgeTone = "success";
        linkedProfileSystemId = `ADM-NO ${studentMatch.admissionNumber}`;
      }

      const resolvedLinks = await resolveAutoLinkedIds(
        tx,
        session.schoolId,
        linkedProfileType,
        data.fullName,
        email,
        data.phone || null,
        data.studentId,
        data.staffId,
        data.parentId
      );

      if (linkedProfileType === "staff") {
        resolvedLinks.staffId = await ensureStaffProfile(
          tx,
          session.schoolId,
          roleCode,
          data.roleCategory,
          specificRoleLabel,
          data.specificRoleKey,
          data.fullName,
          email,
          data.phone || null,
          reportingManager?.id,
          resolvedLinks.staffId
        );
      }

      const emailConflict = await tx.user.findFirst({
        where: data.id ? { email, NOT: { id: data.id } } : { email },
        select: { id: true }
      });

      if (emailConflict) {
        throw new Error("That email address is already in use.");
      }

      if (data.id) {
        const existing = await tx.user.findFirst({
          where: { id: data.id, schoolId: session.schoolId }
        });

        if (!existing) {
          throw new Error("User account not found.");
        }

        const updated = await tx.user.update({
          where: { id: existing.id },
          data: {
            fullName: data.fullName,
            email,
            phone: data.phone || null,
            isActive: data.status === "yes",
            userType: roleCodeToUserType(roleCode)
          }
        });

        await tx.userRole.deleteMany({ where: { userId: updated.id } });
        await tx.userRole.create({
          data: {
            userId: updated.id,
            roleId: role.id
          }
        });

        if (data.password) {
          await tx.user.update({
            where: { id: updated.id },
            data: { passwordHash: hashPassword(data.password) }
          });
        }

      await setLinkedProfile(
        tx,
        updated.id,
        session.schoolId,
          linkedProfileType,
          data.roleCategory,
          specificRoleLabel,
          data.specificRoleKey,
        updated.fullName,
        updated.email,
        updated.phone,
        resolvedLinks.studentId,
        reportingManager?.id,
          resolvedLinks.staffId,
          resolvedLinks.parentId
        );

        if (linkedProfileType === "parent" && resolvedLinks.parentId && data.parentStudentIds.length > 0) {
          await syncParentStudents(tx, session.schoolId, resolvedLinks.parentId, data.parentStudentIds);
          linkedProfileBadgeLabel = "Verified Sync";
          linkedProfileBadgeTone = "success";
        }

        if (linkedProfileType === "staff" && resolvedLinks.staffId) {
          const staff = await tx.staff.findUnique({
            where: { id: resolvedLinks.staffId },
            select: { employeeCode: true }
          });
          linkedProfileSystemId = staff?.employeeCode ? `STF-ID ${staff.employeeCode}` : null;
          linkedProfileBadgeLabel = "Verified Sync";
          linkedProfileBadgeTone = "success";
        }

        if (linkedProfileType === "parent" && resolvedLinks.parentId) {
          const parent = await tx.parent.findUnique({
            where: { id: resolvedLinks.parentId },
            include: {
              students: {
                include: {
                  student: { select: { admissionNumber: true } }
                },
                orderBy: [{ isPrimary: "desc" }]
              }
            }
          });
          linkedProfileSystemId = parent?.students[0]?.student.admissionNumber
            ? `ADM-NO ${parent.students[0].student.admissionNumber}`
            : null;
        }

        return updated;
      }

      if (!data.password) {
        throw new Error("Temporary password is required.");
      }

      const created = await tx.user.create({
        data: {
          schoolId: session.schoolId,
          fullName: data.fullName,
          email,
          phone: data.phone || null,
          passwordHash: hashPassword(data.password),
          userType: roleCodeToUserType(roleCode),
          isActive: data.status === "yes"
        }
      });

      await tx.userRole.create({
        data: {
          userId: created.id,
          roleId: role.id
        }
      });

      await setLinkedProfile(
        tx,
        created.id,
        session.schoolId,
        linkedProfileType,
        data.roleCategory,
        specificRoleLabel,
        data.specificRoleKey,
        created.fullName,
        created.email,
        created.phone,
        resolvedLinks.studentId,
        reportingManager?.id,
        resolvedLinks.staffId,
        resolvedLinks.parentId
      );

      if (linkedProfileType === "parent" && resolvedLinks.parentId && data.parentStudentIds.length > 0) {
        await syncParentStudents(tx, session.schoolId, resolvedLinks.parentId, data.parentStudentIds);
        linkedProfileBadgeLabel = "Verified Sync";
        linkedProfileBadgeTone = "success";
      }

      if (linkedProfileType === "staff" && resolvedLinks.staffId) {
        const staff = await tx.staff.findUnique({
          where: { id: resolvedLinks.staffId },
          select: { employeeCode: true }
        });
        linkedProfileSystemId = staff?.employeeCode ? `STF-ID ${staff.employeeCode}` : null;
        linkedProfileBadgeLabel = "Verified Sync";
        linkedProfileBadgeTone = "success";
      }

      if (linkedProfileType === "parent" && resolvedLinks.parentId) {
        const parent = await tx.parent.findUnique({
          where: { id: resolvedLinks.parentId },
          include: {
            students: {
              include: {
                student: { select: { admissionNumber: true } }
              },
              orderBy: [{ isPrimary: "desc" }]
            }
          }
        });
        linkedProfileSystemId = parent?.students[0]?.student.admissionNumber
          ? `ADM-NO ${parent.students[0].student.admissionNumber}`
          : null;
      }

      return created;
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: data.id ? "user.updated" : "user.created",
      entityType: "User",
      entityId: user.id,
      metadata: {
        fullName: user.fullName,
        email: user.email,
        roleCode,
        specificRoleKey: data.specificRoleKey,
        specificRoleLabel,
        roleCategory: data.roleCategory,
        isActive: data.status === "yes",
        forcePasswordReset: data.forcePasswordReset === "yes",
        studentId: data.studentId ?? null,
        studentMatchLabel,
        parentStudentIds: data.parentStudentIds,
        reportingManagerId: data.reportingManagerId ?? null,
        reportingManagerName
      }
    });

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/staff");
    if (data.staffId) {
      revalidatePath(`/dashboard/staff/${data.staffId}`);
    }

    return {
      status: "success",
      message: data.id ? "User account updated successfully." : "User account created successfully.",
      meta: {
        handover: {
          userId: user.id,
          fullName: user.fullName,
          phone: data.phone || "",
          email: user.email,
          roleCode,
          specificRoleKey: data.specificRoleKey,
          roleLabel: specificRoleLabel,
          username: data.phone || user.email,
          temporaryPassword: data.password || "",
          linkedProfileType,
          linkedProfileBadgeLabel:
            linkedProfileBadgeLabel ??
            (linkedProfileType === "none" ? "Verified Sync" : "Connection Pending - Click to pair"),
          linkedProfileBadgeTone: linkedProfileType === "none" ? "success" : linkedProfileBadgeTone,
          linkedProfileSystemId: linkedProfileSystemId ?? studentMatchLabel,
          reportingManagerName,
          reportingManagerSynced: Boolean(reportingManagerName)
        }
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save the user account.";
    return { status: "error", message };
  }
}

export async function deleteUserAction(userId: string): Promise<ActionFormState> {
  const session = await requirePermission(RBAC_PERMISSIONS.usersDelete);
  if (!hasRole(session, RoleCode.SUPER_ADMIN)) {
    await requireSuperAdmin();
  }

  if (!userId) {
    return {
      status: "error",
      message: "User account not found."
    };
  }

  if (userId === session.userId) {
    return {
      status: "error",
      message: "You cannot delete your own active login."
    };
  }

  try {
    const target = await db.user.findFirst({
      where: { id: userId, schoolId: session.schoolId },
      include: {
        roles: { include: { role: true } },
        staffProfile: true,
        parentProfile: true,
        studentProfile: true
      }
    });

    if (!target) {
      return {
        status: "error",
        message: "User account not found."
      };
    }

    await db.$transaction(async (tx) => {
      if (target.staffProfile?.id) {
        await tx.staff.update({
          where: { id: target.staffProfile.id },
          data: { userId: null }
        });
      }

      if (target.parentProfile?.id) {
        await tx.parent.update({
          where: { id: target.parentProfile.id },
          data: { userId: null }
        });
      }

      if (target.studentProfile?.id) {
        await tx.student.update({
          where: { id: target.studentProfile.id },
          data: { userId: null }
        });
      }

      await tx.userRole.deleteMany({
        where: { userId: target.id }
      });

      await tx.user.delete({
        where: { id: target.id }
      });
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "user.deleted",
      entityType: "User",
      entityId: target.id,
      metadata: {
        fullName: target.fullName,
        email: target.email,
        roleCodes: target.roles.map((entry) => entry.role.code),
        staffProfileId: target.staffProfile?.id ?? null,
        parentProfileId: target.parentProfile?.id ?? null,
        studentProfileId: target.studentProfile?.id ?? null
      }
    });

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/staff");

    return {
      status: "success",
      message: "User account deleted successfully."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to delete the user account."
    };
  }
}
