import { RoleCode, UserType } from "@prisma/client";
import { z } from "zod";

export const ROLE_CODES = [
  "SUPER_ADMIN",
  "ADMIN",
  "PRINCIPAL",
  "TEACHER",
  "ACCOUNTANT",
  "STUDENT",
  "PARENT"
] as const satisfies readonly RoleCode[];

export const USER_LINK_TYPES = ["none", "staff", "parent"] as const;

export type UserLinkType = (typeof USER_LINK_TYPES)[number];

export const ROLE_LABELS: Record<RoleCode, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  PRINCIPAL: "Principal",
  TEACHER: "Teacher",
  ACCOUNTANT: "Accountant",
  STUDENT: "Student",
  PARENT: "Parent"
};

const STAFF_ROLE_CODES = new Set<RoleCode>([
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.PRINCIPAL,
  RoleCode.TEACHER,
  RoleCode.ACCOUNTANT
]);

export function roleCodeToUserType(roleCode: RoleCode) {
  if (roleCode === RoleCode.STUDENT) {
    return UserType.STUDENT;
  }

  if (roleCode === RoleCode.PARENT) {
    return UserType.PARENT;
  }

  return UserType.STAFF;
}

export function isStaffRole(roleCode: RoleCode) {
  return STAFF_ROLE_CODES.has(roleCode);
}

export function linkedProfileTypeForRole(roleCode: RoleCode) {
  if (roleCode === RoleCode.PARENT) {
    return "parent";
  }

  if (isStaffRole(roleCode)) {
    return "staff";
  }

  return "none";
}

export const userAccountSchema = z
  .object({
    id: z.string().optional(),
    fullName: z.string().trim().min(2, "Full name is required."),
    email: z.string().trim().email("Enter a valid email address."),
    phone: z.string().trim().optional(),
    roleCode: z.enum(ROLE_CODES),
    status: z.enum(["yes", "no"]).default("yes"),
    password: z.string().trim().optional(),
    linkedProfileType: z.enum(USER_LINK_TYPES),
    staffId: z.string().optional(),
    parentId: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (!value.id && (!value.password || value.password.length < 8)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Temporary password must be at least 8 characters."
      });
    }

    if (value.password && value.password.length > 0 && value.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must be at least 8 characters."
      });
    }

    if (value.linkedProfileType === "staff" && !value.staffId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["staffId"],
        message: "Select a staff profile."
      });
    }

    if (value.linkedProfileType === "parent" && !value.parentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentId"],
        message: "Select a parent profile."
      });
    }
  });

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().optional()
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(8, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Please confirm the new password.")
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match."
  });
