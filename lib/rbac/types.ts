import type { RoleCode } from "@prisma/client";

export type RbacRoleCode = RoleCode;

export type PermissionMap = Record<string, string>;

export type PermissionKey<TPermissions extends PermissionMap = PermissionMap> =
  TPermissions[keyof TPermissions];

export type SessionLike = {
  userId: string;
  schoolId: string;
  roles: string[];
  permissions: string[];
};

export type RoleGroupKey =
  | "management"
  | "academics"
  | "finance"
  | "operations"
  | "support"
  | "primary_users";

export type ScopeContext = {
  schoolId: string;
  userId: string;
  roles: string[];
};
