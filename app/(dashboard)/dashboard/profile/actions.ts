"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { getRequiredSession } from "@/lib/auth/session";
import { passwordChangeSchema, profileUpdateSchema } from "@/lib/user-management";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function updateMyProfileAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  void _prevState;
  const session = await getRequiredSession();
  const parsed = profileUpdateSchema.safeParse({
    fullName: getString(formData, "fullName"),
    email: getString(formData, "email"),
    phone: getString(formData, "phone")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review your profile details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: {
      staffProfile: true,
      parentProfile: true
    }
  });

  if (!user) {
    return { status: "error", message: "User account was not found." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const emailConflict = await db.user.findFirst({
    where: { email, NOT: { id: user.id } },
    select: { id: true }
  });

  if (emailConflict) {
    return {
      status: "error",
      message: "That email address is already in use."
    };
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      fullName: parsed.data.fullName,
      email,
      phone: parsed.data.phone || null
    }
  });

  if (user.staffProfile) {
    await db.staff.update({
      where: { id: user.staffProfile.id },
      data: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone || user.staffProfile.phone,
        email
      }
    });
  }

  if (user.parentProfile) {
    await db.parent.update({
      where: { id: user.parentProfile.id },
      data: {
        guardianName: parsed.data.fullName,
        phonePrimary: parsed.data.phone || user.parentProfile.phonePrimary,
        email
      }
    });
  }

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "profile.updated",
    entityType: "User",
    entityId: updated.id,
    metadata: {
      fullName: updated.fullName,
      email: updated.email
    }
  });

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/staff");
  if (user.staffProfile) {
    revalidatePath(`/dashboard/staff/${user.staffProfile.id}`);
  }
  redirect("/dashboard/profile?saved=1");
}

export async function changeMyPasswordAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  void _prevState;
  const session = await getRequiredSession();
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: getString(formData, "currentPassword"),
    newPassword: getString(formData, "newPassword"),
    confirmPassword: getString(formData, "confirmPassword")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the password form.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const user = await db.user.findUnique({
    where: { id: session.userId }
  });

  if (!user || !verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
    return {
      status: "error",
      message: "Current password is not correct."
    };
  }

  const passwordHash = hashPassword(parsed.data.newPassword);

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "profile.password_changed",
    entityType: "User",
    entityId: user.id
  });

  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile?saved=1");
}
