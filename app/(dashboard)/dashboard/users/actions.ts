"use server";

import { RoleCode, type Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/access";
import { hashPassword } from "@/lib/auth/password";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import {
  linkedProfileTypeForRole,
  roleCodeToUserType,
  userAccountSchema
} from "@/lib/user-management";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function setLinkedProfile(
  tx: Prisma.TransactionClient,
  userId: string,
  schoolId: string,
  linkedProfileType: string,
  accountFullName: string,
  accountEmail: string,
  accountPhone: string | null,
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

  if (currentStaff && currentStaff.id !== staffId) {
    await tx.staff.update({ where: { id: currentStaff.id }, data: { userId: null } });
  }

  if (currentParent && currentParent.id !== parentId) {
    await tx.parent.update({ where: { id: currentParent.id }, data: { userId: null } });
  }

  if (linkedProfileType === "staff" && staffId) {
    const staff = await tx.staff.findFirst({
      where: { id: staffId, schoolId },
      select: { id: true, userId: true, fullName: true, phone: true, email: true }
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

export async function saveUserAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  void _prevState;
  const session = await requirePermission(PERMISSIONS.manageUsers);
  const parsed = userAccountSchema.safeParse({
    id: getString(formData, "id") || undefined,
    fullName: getString(formData, "fullName"),
    email: getString(formData, "email"),
    phone: getString(formData, "phone"),
    roleCode: getString(formData, "roleCode"),
    status: getString(formData, "status") === "no" ? "no" : "yes",
    password: getString(formData, "password"),
    linkedProfileType: getString(formData, "linkedProfileType") || "none",
    staffId: getString(formData, "staffId") || undefined,
    parentId: getString(formData, "parentId") || undefined
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
  const roleCode = data.roleCode as RoleCode;
  const linkedProfileType = linkedProfileTypeForRole(roleCode);

  try {
    const user = await db.$transaction(async (tx) => {
      const role = await tx.role.findFirst({
        where: { schoolId: session.schoolId, code: roleCode }
      });

      if (!role) {
        throw new Error("Role was not found for this school.");
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
          where: { id: data.id, schoolId: session.schoolId },
          include: {
            staffProfile: true,
            parentProfile: true
          }
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
          updated.fullName,
          updated.email,
          updated.phone,
          data.staffId,
          data.parentId
        );

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
        created.fullName,
        created.email,
        created.phone,
        data.staffId,
        data.parentId
      );

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
        isActive: data.status === "yes"
      }
    });

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/staff");
    if (data.staffId) {
      revalidatePath(`/dashboard/staff/${data.staffId}`);
    }
    redirect("/dashboard/users?saved=1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save the user account.";
    return { status: "error", message };
  }
}
