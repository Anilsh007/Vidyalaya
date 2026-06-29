import { RoleCode } from "@prisma/client";
import { z } from "zod";

import {
  canAssignRole,
  RBAC_ROLE_CODES,
  ROLE_GROUP_BY_CODE,
  ROLE_LABELS,
  getAssignableRoleCodes,
  roleCodeToUserType
} from "@/lib/rbac/roles";

export const ROLE_CATEGORIES = [
  "MANAGEMENT",
  "ACADEMICS",
  "FINANCE",
  "OPERATIONS",
  "SUPPORT_STAFF",
  "PRIMARY_USERS"
] as const;

export type RoleCategory = (typeof ROLE_CATEGORIES)[number];

export type UserSelectOption = {
  id: string;
  label: string;
  meta?: string;
  searchText?: string;
  category?: RoleCategory;
};

export const ROLE_CATEGORY_LABELS: Record<RoleCategory, string> = {
  MANAGEMENT: "Management",
  ACADEMICS: "Academics",
  FINANCE: "Finance",
  OPERATIONS: "Operations",
  SUPPORT_STAFF: "Support Staff",
  PRIMARY_USERS: "Primary Users"
};

export const USER_LINK_TYPES = ["none", "staff", "parent", "student"] as const;
export type UserLinkType = (typeof USER_LINK_TYPES)[number];

export const SPECIFIC_ROLE_KEYS = [
  "SUPER_ADMIN",
  "ADMIN",
  "PRINCIPAL",
  "DIRECTOR",
  "HR",
  "HOD",
  "TEACHER",
  "EXAM_CONTROLLER",
  "ACCOUNTANT",
  "PROCUREMENT_MANAGER",
  "LIBRARIAN",
  "TRANSPORT_MANAGER",
  "HOSTEL_WARDEN",
  "FRONT_DESK",
  "NURSE",
  "SECURITY_GUARD",
  "MAINTENANCE_TECHNICIAN",
  "PEON",
  "STUDENT",
  "PARENT"
] as const;

export type SpecificRoleKey = (typeof SPECIFIC_ROLE_KEYS)[number];

type SpecificRoleDefinition = {
  key: SpecificRoleKey;
  label: string;
  category: RoleCategory;
  roleCode: RoleCode;
  linkedProfileType: UserLinkType;
  designation?: string;
  managementBypass?: boolean;
  marksDepartmentHead?: boolean;
};

export const SPECIFIC_ROLE_DEFINITIONS: Record<SpecificRoleKey, SpecificRoleDefinition> = {
  SUPER_ADMIN: {
    key: "SUPER_ADMIN",
    label: "Super Admin",
    category: "MANAGEMENT",
    roleCode: RoleCode.SUPER_ADMIN,
    linkedProfileType: "none",
    managementBypass: true
  },
  ADMIN: {
    key: "ADMIN",
    label: "Admin",
    category: "MANAGEMENT",
    roleCode: RoleCode.ADMIN,
    linkedProfileType: "none",
    managementBypass: true
  },
  PRINCIPAL: {
    key: "PRINCIPAL",
    label: "Principal",
    category: "MANAGEMENT",
    roleCode: RoleCode.PRINCIPAL,
    linkedProfileType: "staff",
    designation: "Principal",
    marksDepartmentHead: true
  },
  DIRECTOR: {
    key: "DIRECTOR",
    label: "Director",
    category: "MANAGEMENT",
    roleCode: RoleCode.DIRECTOR,
    linkedProfileType: "staff",
    designation: "Director",
    marksDepartmentHead: true
  },
  HR: {
    key: "HR",
    label: "HR",
    category: "MANAGEMENT",
    roleCode: RoleCode.HR,
    linkedProfileType: "staff",
    designation: "HR Manager"
  },
  HOD: {
    key: "HOD",
    label: "HOD",
    category: "ACADEMICS",
    roleCode: RoleCode.HOD,
    linkedProfileType: "staff",
    designation: "HOD",
    marksDepartmentHead: true
  },
  TEACHER: {
    key: "TEACHER",
    label: "Teacher",
    category: "ACADEMICS",
    roleCode: RoleCode.TEACHER,
    linkedProfileType: "staff",
    designation: "Teacher"
  },
  EXAM_CONTROLLER: {
    key: "EXAM_CONTROLLER",
    label: "Exam Controller",
    category: "ACADEMICS",
    roleCode: RoleCode.EXAM_CONTROLLER,
    linkedProfileType: "staff",
    designation: "Exam Controller"
  },
  ACCOUNTANT: {
    key: "ACCOUNTANT",
    label: "Accountant",
    category: "FINANCE",
    roleCode: RoleCode.ACCOUNTANT,
    linkedProfileType: "staff",
    designation: "Accountant"
  },
  PROCUREMENT_MANAGER: {
    key: "PROCUREMENT_MANAGER",
    label: "Procurement Manager",
    category: "FINANCE",
    roleCode: RoleCode.PROCUREMENT_MANAGER,
    linkedProfileType: "staff",
    designation: "Procurement Manager",
    marksDepartmentHead: true
  },
  LIBRARIAN: {
    key: "LIBRARIAN",
    label: "Librarian",
    category: "OPERATIONS",
    roleCode: RoleCode.LIBRARIAN,
    linkedProfileType: "staff",
    designation: "Librarian"
  },
  TRANSPORT_MANAGER: {
    key: "TRANSPORT_MANAGER",
    label: "Transport Manager",
    category: "OPERATIONS",
    roleCode: RoleCode.TRANSPORT_MANAGER,
    linkedProfileType: "staff",
    designation: "Transport Manager",
    marksDepartmentHead: true
  },
  HOSTEL_WARDEN: {
    key: "HOSTEL_WARDEN",
    label: "Hostel Warden",
    category: "OPERATIONS",
    roleCode: RoleCode.HOSTEL_WARDEN,
    linkedProfileType: "staff",
    designation: "Hostel Warden",
    marksDepartmentHead: true
  },
  FRONT_DESK: {
    key: "FRONT_DESK",
    label: "Front Desk",
    category: "OPERATIONS",
    roleCode: RoleCode.FRONT_DESK,
    linkedProfileType: "staff",
    designation: "Front Desk"
  },
  NURSE: {
    key: "NURSE",
    label: "Nurse",
    category: "SUPPORT_STAFF",
    roleCode: RoleCode.NURSE,
    linkedProfileType: "staff",
    designation: "Nurse"
  },
  SECURITY_GUARD: {
    key: "SECURITY_GUARD",
    label: "Security Guard",
    category: "SUPPORT_STAFF",
    roleCode: RoleCode.SECURITY_GUARD,
    linkedProfileType: "staff",
    designation: "Security Guard"
  },
  MAINTENANCE_TECHNICIAN: {
    key: "MAINTENANCE_TECHNICIAN",
    label: "Maintenance Technician",
    category: "SUPPORT_STAFF",
    roleCode: RoleCode.MAINTENANCE_TECHNICIAN,
    linkedProfileType: "staff",
    designation: "Maintenance Technician"
  },
  PEON: {
    key: "PEON",
    label: "Peon",
    category: "SUPPORT_STAFF",
    roleCode: RoleCode.PEON,
    linkedProfileType: "staff",
    designation: "Peon"
  },
  STUDENT: {
    key: "STUDENT",
    label: "Student",
    category: "PRIMARY_USERS",
    roleCode: RoleCode.STUDENT,
    linkedProfileType: "student"
  },
  PARENT: {
    key: "PARENT",
    label: "Parent",
    category: "PRIMARY_USERS",
    roleCode: RoleCode.PARENT,
    linkedProfileType: "parent"
  }
};

export const SPECIFIC_ROLES_BY_CATEGORY: Record<RoleCategory, SpecificRoleKey[]> = {
  MANAGEMENT: ["SUPER_ADMIN", "ADMIN", "DIRECTOR", "PRINCIPAL", "HR"],
  ACADEMICS: ["HOD", "TEACHER", "EXAM_CONTROLLER"],
  FINANCE: ["ACCOUNTANT", "PROCUREMENT_MANAGER"],
  OPERATIONS: ["LIBRARIAN", "TRANSPORT_MANAGER", "HOSTEL_WARDEN", "FRONT_DESK"],
  SUPPORT_STAFF: ["NURSE", "SECURITY_GUARD", "MAINTENANCE_TECHNICIAN", "PEON"],
  PRIMARY_USERS: ["STUDENT", "PARENT"]
};

export const ROLE_CODES = RBAC_ROLE_CODES;

export { ROLE_LABELS, roleCodeToUserType };

export function departmentForRoleCategory(roleCategory: RoleCategory) {
  const mapping: Record<RoleCategory, string> = {
    MANAGEMENT: "Management",
    ACADEMICS: "Academics",
    FINANCE: "Finance",
    OPERATIONS: "Operations",
    SUPPORT_STAFF: "Support Staff",
    PRIMARY_USERS: "Primary Users"
  };

  return mapping[roleCategory];
}

export function shouldShowReportingManager(roleCategory: RoleCategory) {
  return roleCategory !== "PRIMARY_USERS" && roleCategory !== "MANAGEMENT";
}

export function specificRoleSetsDepartmentHead(roleKey: SpecificRoleKey) {
  return SPECIFIC_ROLE_DEFINITIONS[roleKey].marksDepartmentHead ?? false;
}

export function linkedProfileTypeForRole(roleCode: RoleCode) {
  const definition = Object.values(SPECIFIC_ROLE_DEFINITIONS).find((item) => item.roleCode === roleCode);
  return definition?.linkedProfileType ?? "none";
}

export function getSpecificRoleDefinition(roleKey: string | null | undefined) {
  if (!roleKey || !SPECIFIC_ROLE_KEYS.includes(roleKey as SpecificRoleKey)) {
    return null;
  }

  return SPECIFIC_ROLE_DEFINITIONS[roleKey as SpecificRoleKey];
}

export function getSpecificRoleOptions(category: RoleCategory, allowedRoleKeys?: readonly SpecificRoleKey[]) {
  return SPECIFIC_ROLES_BY_CATEGORY[category]
    .filter((key) => !allowedRoleKeys || allowedRoleKeys.includes(key))
    .map((key) => SPECIFIC_ROLE_DEFINITIONS[key]);
}

export function getSpecificRoleLabel(roleKey: string | null | undefined, fallbackRoleCode?: RoleCode | null) {
  const definition = getSpecificRoleDefinition(roleKey);
  if (definition) {
    return definition.label;
  }

  if (fallbackRoleCode) {
    return ROLE_LABELS[fallbackRoleCode];
  }

  return "Unknown role";
}

export function getRoleCategoryFromRoleCode(roleCode: RoleCode) {
  const roleGroup = ROLE_GROUP_BY_CODE[roleCode];
  switch (roleGroup) {
    case "management":
      return "MANAGEMENT";
    case "academics":
      return "ACADEMICS";
    case "finance":
      return "FINANCE";
    case "operations":
      return "OPERATIONS";
    case "support":
      return "SUPPORT_STAFF";
    default:
      return "PRIMARY_USERS";
  }
}

export function inferSpecificRoleKey(
  roleCode: RoleCode,
  designation?: string | null,
  userName?: string | null
): SpecificRoleKey {
  const normalizedDesignation = (designation ?? "").trim().toLowerCase();
  const normalizedName = (userName ?? "").trim().toLowerCase();

  const exactDesignationMatch = Object.values(SPECIFIC_ROLE_DEFINITIONS).find(
    (definition) =>
      definition.designation && definition.designation.trim().toLowerCase() === normalizedDesignation
  );
  if (exactDesignationMatch) {
    return exactDesignationMatch.key;
  }

  const exactLabelMatch = Object.values(SPECIFIC_ROLE_DEFINITIONS).find(
    (definition) => definition.label.trim().toLowerCase() === normalizedDesignation
  );
  if (exactLabelMatch) {
    return exactLabelMatch.key;
  }

  const directCodeMatch = Object.values(SPECIFIC_ROLE_DEFINITIONS).find(
    (definition) => definition.roleCode === roleCode
  );
  if (directCodeMatch) {
    return directCodeMatch.key;
  }

  if (normalizedName.includes("director")) {
    return "DIRECTOR";
  }

  switch (roleCode) {
    case RoleCode.PARENT:
      return "PARENT";
    case RoleCode.STUDENT:
      return "STUDENT";
    case RoleCode.ACCOUNTANT:
      return "ACCOUNTANT";
    case RoleCode.TEACHER:
      return "TEACHER";
    case RoleCode.PRINCIPAL:
      return "PRINCIPAL";
    case RoleCode.SUPER_ADMIN:
      return "SUPER_ADMIN";
    default:
      return "ADMIN";
  }
}

export function getAssignableSpecificRoleKeys(sessionRoles: string[]) {
  const allowedRoleCodes = getAssignableRoleCodes(sessionRoles);
  return SPECIFIC_ROLE_KEYS.filter((roleKey) =>
    allowedRoleCodes.includes(SPECIFIC_ROLE_DEFINITIONS[roleKey].roleCode)
  );
}

export function canAssignSpecificRole(sessionRoles: string[], targetRoleKey: SpecificRoleKey) {
  return canAssignRole(sessionRoles, SPECIFIC_ROLE_DEFINITIONS[targetRoleKey].roleCode);
}

export const userAccountSchema = z
  .object({
    id: z.string().optional(),
    fullName: z.string().trim().min(2, "Full name is required."),
    email: z.string().trim().email("Enter a valid email address."),
    phone: z.string().trim().optional(),
    roleCategory: z.enum(ROLE_CATEGORIES),
    specificRoleKey: z.enum(SPECIFIC_ROLE_KEYS),
    roleCode: z.enum(ROLE_CODES).optional(),
    status: z.enum(["yes", "no"]).default("yes"),
    password: z.string().trim().optional(),
    forcePasswordReset: z.enum(["yes", "no"]).default("no"),
    linkedProfileType: z.enum(USER_LINK_TYPES),
    reportingManagerId: z.string().optional(),
    staffId: z.string().optional(),
    parentId: z.string().optional(),
    studentId: z.string().optional(),
    parentStudentIds: z.array(z.string()).default([])
  })
  .superRefine((value, ctx) => {
    const selectedRole = SPECIFIC_ROLE_DEFINITIONS[value.specificRoleKey];

    if (selectedRole.category !== value.roleCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["specificRoleKey"],
        message: "Select a role that belongs to the chosen category."
      });
    }

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

    if (selectedRole.linkedProfileType === "parent" && !value.parentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentId"],
        message: "Select a parent profile."
      });
    }

    if (selectedRole.linkedProfileType === "parent" && value.parentStudentIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentStudentIds"],
        message: "Link at least one ward for the parent account."
      });
    }

    if (selectedRole.linkedProfileType === "student" && !value.studentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["studentId"],
        message: "Select a student admission record."
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
