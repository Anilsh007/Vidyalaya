import { RoleCode } from "@prisma/client";

export type ExperienceRoleKey =
  | "admin"
  | "leadership"
  | "teaching"
  | "finance"
  | "guardian"
  | "library"
  | "transport"
  | "hostel"
  | "inventory"
  | "frontdesk"
  | "general";

type WorkspaceKey =
  | "accounts"
  | "payroll"
  | "leaves"
  | "library"
  | "inventory"
  | "transport"
  | "hostel";

const ROLE_GROUPS: Record<ExperienceRoleKey, RoleCode[]> = {
  admin: [RoleCode.ADMIN, RoleCode.SUPER_ADMIN],
  leadership: [RoleCode.PRINCIPAL, RoleCode.DIRECTOR, RoleCode.HR],
  teaching: [RoleCode.TEACHER, RoleCode.HOD, RoleCode.EXAM_CONTROLLER],
  finance: [RoleCode.ACCOUNTANT, RoleCode.PROCUREMENT_MANAGER],
  guardian: [RoleCode.STUDENT, RoleCode.PARENT],
  library: [RoleCode.LIBRARIAN],
  transport: [RoleCode.TRANSPORT_MANAGER],
  hostel: [RoleCode.HOSTEL_WARDEN],
  inventory: [RoleCode.PROCUREMENT_MANAGER],
  frontdesk: [RoleCode.FRONT_DESK],
  general: []
};

const ROLE_WORKSPACE_PREFIX: Record<ExperienceRoleKey, string> = {
  admin: "This administrative login keeps control surfaces tight and clearly separated.",
  leadership: "This academic leadership login is tuned for oversight, not record mutation everywhere.",
  teaching: "This teaching login stays classroom-first and avoids extra administrative clutter.",
  finance: "This finance login protects transactional workspaces from non-finance changes.",
  guardian: "This student or parent login remains strictly personal and review-oriented.",
  library: "This library login focuses on circulation review unless management access is granted.",
  transport: "This transport login is designed for route review unless dispatch control is granted.",
  hostel: "This residential login prioritizes boarder visibility over unrestricted edits.",
  inventory: "This stores login highlights stock review while keeping issue and procurement actions permission-based.",
  frontdesk: "This front-desk login is aimed at desk visibility without broad operational mutation.",
  general: "This login is using the safest general workspace profile."
};

const WORKSPACE_LABELS: Record<WorkspaceKey, string> = {
  accounts: "accounts and expenses",
  payroll: "payroll",
  leaves: "leave management",
  library: "library management",
  inventory: "inventory",
  transport: "transport management",
  hostel: "hostel management"
};

export function resolveExperienceRole(roleHints: string[]) {
  const normalized = new Set(roleHints.map(normalizeRoleToken).filter(Boolean));

  const orderedRoles: ExperienceRoleKey[] = [
    "admin",
    "leadership",
    "finance",
    "teaching",
    "library",
    "transport",
    "hostel",
    "inventory",
    "frontdesk",
    "guardian"
  ];

  for (const role of orderedRoles) {
    if (ROLE_GROUPS[role].some((alias) => normalized.has(alias))) {
      return role;
    }
  }

  return "general";
}

export function getWorkspaceAccessCopy(roleKey: ExperienceRoleKey, workspace: WorkspaceKey) {
  const label = WORKSPACE_LABELS[workspace];
  const prefix = ROLE_WORKSPACE_PREFIX[roleKey] ?? ROLE_WORKSPACE_PREFIX.general;

  return {
    title: "View-only access",
    summary: `${prefix} You can review ${label} here, but this login cannot create, approve, or update records in that workspace.`,
    description: `Ask an administrator for ${label} management permission if this role needs to perform changes instead of review-only work.`
  };
}

function normalizeRoleToken(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
