import { type PermissionKey, PERMISSIONS } from "@/lib/permissions";

export const APP_NAME = "Vidyalaya";

export const APP_DESCRIPTION =
  "Self-hosted school ERP dashboard for Indian schools with LAN-first deployment, role-based access, and optional tunnel access.";

export const APP_TAGLINE = "Operate academics, fees, and records from one local-first dashboard.";

export type NavItem = {
  href: string;
  label: string;
  disabled?: boolean;
  permission?: PermissionKey;
};

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/staff", label: "Staff", permission: PERMISSIONS.viewStaff },
  { href: "/dashboard/users", label: "Users", permission: PERMISSIONS.manageUsers },
  { href: "/dashboard/students", label: "Students", permission: PERMISSIONS.viewStudents },
  { href: "/dashboard/documents", label: "Documents", permission: PERMISSIONS.viewDocuments },
  { href: "/dashboard/attendance", label: "Attendance", permission: PERMISSIONS.viewAttendance },
  { href: "/dashboard/fees", label: "Fees", permission: PERMISSIONS.manageFees },
  { href: "/dashboard/exams", label: "Exams", permission: PERMISSIONS.viewExams },
  { href: "/dashboard/notices", label: "Notices", permission: PERMISSIONS.manageNotices },
  { href: "/dashboard/reports", label: "Reports", permission: PERMISSIONS.viewReports },
  { href: "/dashboard/accounts", label: "Accounts", permission: PERMISSIONS.viewAccounts },
  { href: "/dashboard/payroll", label: "Payroll", permission: PERMISSIONS.viewPayroll },
  { href: "/dashboard/leaves", label: "Leaves", permission: PERMISSIONS.viewLeaves },
  { href: "/dashboard/library", label: "Library", permission: PERMISSIONS.viewLibrary },
  { href: "/dashboard/inventory", label: "Inventory", permission: PERMISSIONS.viewInventory },
  { href: "/dashboard/transport", label: "Transport", permission: PERMISSIONS.viewTransport },
  { href: "/dashboard/hostel", label: "Hostel", permission: PERMISSIONS.viewHostel },
  { href: "/dashboard/audit", label: "Audit", permission: PERMISSIONS.viewAuditLogs },
  { href: "/dashboard/settings", label: "Settings", permission: PERMISSIONS.manageSchoolSettings }
];

export const LOGIN_COPY = {
  title: "School ERP sign in",
  subtitle:
    "Use your staff account to access the school dashboard on this computer or over the local network.",
  emailLabel: "Email address",
  passwordLabel: "Password",
  submitLabel: "Sign in",
  helper:
    "This starter uses secure password hashing, signed sessions, protected routes, and role checks.",
  success: "Signed in successfully.",
  error: "We could not verify those credentials."
} as const;
