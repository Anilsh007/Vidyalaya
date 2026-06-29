import { RoleCode, UserType } from "@prisma/client";

import type { RoleGroupKey } from "@/lib/rbac/types";

export const RBAC_ROLE_CODES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.PRINCIPAL,
  RoleCode.DIRECTOR,
  RoleCode.HOD,
  RoleCode.TEACHER,
  RoleCode.EXAM_CONTROLLER,
  RoleCode.ACCOUNTANT,
  RoleCode.PROCUREMENT_MANAGER,
  RoleCode.LIBRARIAN,
  RoleCode.TRANSPORT_MANAGER,
  RoleCode.HOSTEL_WARDEN,
  RoleCode.FRONT_DESK,
  RoleCode.HR,
  RoleCode.NURSE,
  RoleCode.SECURITY_GUARD,
  RoleCode.MAINTENANCE_TECHNICIAN,
  RoleCode.PEON,
  RoleCode.STUDENT,
  RoleCode.PARENT
] as const satisfies readonly RoleCode[];

export const ROLE_LABELS: Record<RoleCode, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
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

export const STAFF_ROLE_CODES = RBAC_ROLE_CODES.filter(
  (roleCode) => roleCode !== RoleCode.STUDENT && roleCode !== RoleCode.PARENT
);

export const STAFF_ROLE_CODE_SET = new Set<RoleCode>(STAFF_ROLE_CODES);

export const ROLE_GROUPS: Record<RoleGroupKey, readonly RoleCode[]> = {
  management: [RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.PRINCIPAL, RoleCode.HR],
  academics: [RoleCode.HOD, RoleCode.TEACHER, RoleCode.EXAM_CONTROLLER],
  finance: [RoleCode.ACCOUNTANT, RoleCode.PROCUREMENT_MANAGER],
  operations: [RoleCode.LIBRARIAN, RoleCode.TRANSPORT_MANAGER, RoleCode.HOSTEL_WARDEN, RoleCode.FRONT_DESK],
  support: [RoleCode.NURSE, RoleCode.SECURITY_GUARD, RoleCode.MAINTENANCE_TECHNICIAN, RoleCode.PEON],
  primary_users: [RoleCode.STUDENT, RoleCode.PARENT]
};

export const ROLE_GROUP_BY_CODE: Record<RoleCode, RoleGroupKey> = {
  SUPER_ADMIN: "management",
  ADMIN: "management",
  PRINCIPAL: "management",
  DIRECTOR: "management",
  HOD: "academics",
  TEACHER: "academics",
  EXAM_CONTROLLER: "academics",
  ACCOUNTANT: "finance",
  PROCUREMENT_MANAGER: "finance",
  LIBRARIAN: "operations",
  TRANSPORT_MANAGER: "operations",
  HOSTEL_WARDEN: "operations",
  FRONT_DESK: "operations",
  HR: "management",
  NURSE: "support",
  SECURITY_GUARD: "support",
  MAINTENANCE_TECHNICIAN: "support",
  PEON: "support",
  STUDENT: "primary_users",
  PARENT: "primary_users"
};

const ASSIGNABLE_ROLE_MATRIX: Record<RoleCode, readonly RoleCode[]> = {
  SUPER_ADMIN: RBAC_ROLE_CODES,
  ADMIN: RBAC_ROLE_CODES.filter((roleCode) => roleCode !== RoleCode.SUPER_ADMIN),
  DIRECTOR: [
    RoleCode.PRINCIPAL,
    RoleCode.HR,
    RoleCode.HOD,
    RoleCode.TEACHER,
    RoleCode.EXAM_CONTROLLER,
    RoleCode.ACCOUNTANT,
    RoleCode.PROCUREMENT_MANAGER,
    RoleCode.LIBRARIAN,
    RoleCode.TRANSPORT_MANAGER,
    RoleCode.HOSTEL_WARDEN,
    RoleCode.FRONT_DESK,
    RoleCode.NURSE,
    RoleCode.SECURITY_GUARD,
    RoleCode.MAINTENANCE_TECHNICIAN,
    RoleCode.PEON,
    RoleCode.STUDENT,
    RoleCode.PARENT
  ],
  PRINCIPAL: [
    RoleCode.HOD,
    RoleCode.TEACHER,
    RoleCode.EXAM_CONTROLLER,
    RoleCode.LIBRARIAN,
    RoleCode.FRONT_DESK,
    RoleCode.NURSE,
    RoleCode.STUDENT,
    RoleCode.PARENT
  ],
  HR: [
    RoleCode.TEACHER,
    RoleCode.ACCOUNTANT,
    RoleCode.LIBRARIAN,
    RoleCode.TRANSPORT_MANAGER,
    RoleCode.HOSTEL_WARDEN,
    RoleCode.FRONT_DESK,
    RoleCode.NURSE,
    RoleCode.SECURITY_GUARD,
    RoleCode.MAINTENANCE_TECHNICIAN,
    RoleCode.PEON
  ],
  HOD: [],
  TEACHER: [],
  EXAM_CONTROLLER: [],
  ACCOUNTANT: [],
  PROCUREMENT_MANAGER: [],
  LIBRARIAN: [],
  TRANSPORT_MANAGER: [],
  HOSTEL_WARDEN: [],
  FRONT_DESK: [],
  NURSE: [],
  SECURITY_GUARD: [],
  MAINTENANCE_TECHNICIAN: [],
  PEON: [],
  STUDENT: [],
  PARENT: []
};

export function roleCodeToUserType(roleCode: RoleCode) {
  if (roleCode === RoleCode.STUDENT) {
    return UserType.STUDENT;
  }

  if (roleCode === RoleCode.PARENT) {
    return UserType.PARENT;
  }

  return UserType.STAFF;
}

export function isStaffRole(roleCode: string | RoleCode) {
  return STAFF_ROLE_CODE_SET.has(roleCode as RoleCode);
}

export function isManagementRole(roleCode: string | RoleCode) {
  return ROLE_GROUP_BY_CODE[roleCode as RoleCode] === "management";
}

export function getAssignableRoleCodes(roleCodes: string[]) {
  const normalized = roleCodes.filter((roleCode): roleCode is RoleCode =>
    RBAC_ROLE_CODES.includes(roleCode as RoleCode)
  );

  const assignable = new Set<RoleCode>();
  for (const roleCode of normalized) {
    for (const targetRoleCode of ASSIGNABLE_ROLE_MATRIX[roleCode] ?? []) {
      assignable.add(targetRoleCode);
    }
  }

  return RBAC_ROLE_CODES.filter((roleCode) => assignable.has(roleCode));
}

export function canAssignRole(roleCodes: string[], targetRoleCode: RoleCode) {
  return getAssignableRoleCodes(roleCodes).includes(targetRoleCode);
}
