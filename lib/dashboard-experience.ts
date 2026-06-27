import { NAV_ITEMS, type NavItem } from "@/lib/copy";
import { type AppSession } from "@/lib/auth/session";

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

const ROLE_ALIASES: Record<ExperienceRoleKey, string[]> = {
  admin: ["ADMIN", "SUPER_ADMIN"],
  leadership: ["PRINCIPAL", "DIRECTOR", "ACADEMIC_HEAD"],
  teaching: ["TEACHER", "HOD", "INSTRUCTOR"],
  finance: ["ACCOUNTANT", "CASHIER", "FINANCE_HEAD"],
  guardian: ["STUDENT", "PARENT"],
  library: ["LIBRARIAN", "MEDIA_CENTER_MANAGER"],
  transport: ["TRANSPORT_MANAGER", "DRIVER_COORDINATOR"],
  hostel: ["HOSTEL_WARDEN", "RESIDENTIAL_IN_CHARGE"],
  inventory: ["INVENTORY", "STORES", "PROCUREMENT_MANAGER", "INVENTORY_MANAGER"],
  frontdesk: ["FRONT_DESK", "RECEPTIONIST", "ADMISSION_COUNSELOR"],
  general: []
};

const ROLE_NAV_LABELS: Partial<Record<ExperienceRoleKey, Record<string, string>>> = {
  admin: {
    "/dashboard/users": "User Control",
    "/dashboard/settings": "System Config",
    "/dashboard/audit": "Audit Logs"
  },
  leadership: {
    "/dashboard/reports": "Academic Reports",
    "/dashboard/notices": "Announcements",
    "/dashboard/leaves": "Leave Reviews"
  },
  teaching: {
    "/dashboard/students": "My Students",
    "/dashboard/attendance": "Class Attendance",
    "/dashboard/exams": "Marks & Tests",
    "/dashboard/notices": "Staff Updates"
  },
  finance: {
    "/dashboard/fees": "Fee Desk",
    "/dashboard/accounts": "Expense Desk",
    "/dashboard/payroll": "Salary Desk",
    "/dashboard/reports": "Finance Reports"
  },
  guardian: {
    "/dashboard/documents": "Assignments",
    "/dashboard/fees": "Fee Dues",
    "/dashboard/exams": "Progress"
  },
  library: {
    "/dashboard/library": "Circulation Desk"
  },
  transport: {
    "/dashboard/transport": "Route Control"
  },
  hostel: {
    "/dashboard/hostel": "Residential Desk"
  },
  inventory: {
    "/dashboard/inventory": "Stock Control",
    "/dashboard/accounts": "Purchase Spend"
  },
  frontdesk: {
    "/dashboard/students": "Admissions",
    "/dashboard/documents": "Inward Docs",
    "/dashboard/notices": "Desk Notices"
  }
};

const ROLE_ROUTE_ORDER: Record<ExperienceRoleKey, string[]> = {
  admin: ["/dashboard/users", "/dashboard/settings", "/dashboard/audit", "/dashboard/reports", "/dashboard"],
  leadership: ["/dashboard/reports", "/dashboard/leaves", "/dashboard/notices", "/dashboard/attendance", "/dashboard"],
  teaching: ["/dashboard/attendance", "/dashboard/exams", "/dashboard/students", "/dashboard/notices", "/dashboard"],
  finance: ["/dashboard/fees", "/dashboard/accounts", "/dashboard/payroll", "/dashboard/reports", "/dashboard"],
  guardian: ["/dashboard", "/dashboard/fees", "/dashboard/exams", "/dashboard/documents"],
  library: ["/dashboard/library", "/dashboard/reports", "/dashboard"],
  transport: ["/dashboard/transport", "/dashboard/reports", "/dashboard"],
  hostel: ["/dashboard/hostel", "/dashboard/reports", "/dashboard"],
  inventory: ["/dashboard/inventory", "/dashboard/accounts", "/dashboard/reports", "/dashboard"],
  frontdesk: ["/dashboard/students", "/dashboard/documents", "/dashboard/notices", "/dashboard"],
  general: ["/dashboard"]
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
    if (ROLE_ALIASES[role].some((alias) => normalized.has(alias))) {
      return role;
    }
  }

  return "general";
}

export function getVisibleNavItems(permissions: string[], roleHints: string[]) {
  const roleKey = resolveExperienceRole(roleHints);
  const overrides = ROLE_NAV_LABELS[roleKey] ?? {};

  return NAV_ITEMS.filter((item) => !item.permission || permissions.includes(item.permission)).map((item) => ({
    ...item,
    label: overrides[item.href] ?? item.label
  })) satisfies NavItem[];
}

export function getDefaultDashboardRoute(session: Pick<AppSession, "roles" | "permissions">) {
  const roleKey = resolveExperienceRole(session.roles);
  const preferredRoutes = ROLE_ROUTE_ORDER[roleKey] ?? ROLE_ROUTE_ORDER.general;

  for (const href of preferredRoutes) {
    const navItem = NAV_ITEMS.find((item) => item.href === href);
    if (!navItem) {
      continue;
    }

    if (!navItem.permission || session.permissions.includes(navItem.permission)) {
      return href;
    }
  }

  const firstAllowed = NAV_ITEMS.find((item) => !item.permission || session.permissions.includes(item.permission));
  return firstAllowed?.href ?? "/dashboard";
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
