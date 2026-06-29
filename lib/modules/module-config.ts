import { RoleCode } from "@prisma/client";

import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";

export type ModuleStatus = "active" | "beta" | "hidden";

export type AppModuleChild = {
  key: string;
  label: string;
  href: string;
  status: ModuleStatus;
  requiredPermissions: string[];
};

export type AppModule = {
  key: string;
  label: string;
  description?: string;
  href: string;
  icon?: string;
  status: ModuleStatus;
  requiredPermissions: string[];
  allowedRoles?: readonly RoleCode[];
  navigationRoles?: readonly RoleCode[];
  children?: AppModuleChild[];
};

export const APP_MODULES: readonly AppModule[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Role-aware ERP homepage and operational overview.",
    href: "/dashboard",
    icon: "LayoutDashboard",
    status: "active",
    requiredPermissions: [
      RBAC_PERMISSIONS.dashboardRead,
      RBAC_PERMISSIONS.dashboardReadSchool,
      RBAC_PERMISSIONS.dashboardReadOwn
    ],
    children: [
      {
        key: "profile",
        label: "Profile",
        href: "/dashboard/profile",
        status: "active",
        requiredPermissions: [
          RBAC_PERMISSIONS.dashboardRead,
          RBAC_PERMISSIONS.dashboardReadSchool,
          RBAC_PERMISSIONS.dashboardReadOwn
        ]
      }
    ]
  },
  {
    key: "students",
    label: "Students",
    description: "Student records, admissions, and profile management.",
    href: "/dashboard/students",
    icon: "Users",
    status: "active",
    requiredPermissions: [
      RBAC_PERMISSIONS.studentsRead,
      RBAC_PERMISSIONS.studentsCreate,
      RBAC_PERMISSIONS.studentsUpdate
    ]
  },
  {
    key: "staff",
    label: "Staff",
    description: "Staff records, departments, and assignments.",
    href: "/dashboard/staff",
    icon: "UserRound",
    status: "active",
    requiredPermissions: [
      RBAC_PERMISSIONS.staffRead,
      RBAC_PERMISSIONS.staffReadOwn,
      RBAC_PERMISSIONS.staffCreate,
      RBAC_PERMISSIONS.staffUpdate
    ]
  },
  {
    key: "attendance",
    label: "Attendance",
    description: "Student and staff attendance operations.",
    href: "/dashboard/attendance",
    icon: "CalendarCheck2",
    status: "active",
    requiredPermissions: [
      RBAC_PERMISSIONS.attendanceRead,
      RBAC_PERMISSIONS.attendanceReadClass,
      RBAC_PERMISSIONS.attendanceMark,
      RBAC_PERMISSIONS.attendanceUpdate
    ]
  },
  {
    key: "fees",
    label: "Fees",
    description: "Collections, invoices, and dues tracking.",
    href: "/dashboard/fees",
    icon: "IndianRupee",
    status: "active",
    requiredPermissions: [
      RBAC_PERMISSIONS.feesRead,
      RBAC_PERMISSIONS.feesCollect,
      RBAC_PERMISSIONS.feesUpdate
    ]
  },
  {
    key: "exams",
    label: "Exams",
    description: "Exam planning, marks entry, and results.",
    href: "/dashboard/exams",
    icon: "BookOpenCheck",
    status: "active",
    requiredPermissions: [
      RBAC_PERMISSIONS.examsRead,
      RBAC_PERMISSIONS.examsCreate,
      RBAC_PERMISSIONS.examsUpdate,
      RBAC_PERMISSIONS.examsMarksEntry,
      RBAC_PERMISSIONS.examsMarksModerate,
      RBAC_PERMISSIONS.examsPublishResult
    ]
  },
  {
    key: "documents",
    label: "Documents",
    description: "Certificates, uploads, and archive operations.",
    href: "/dashboard/documents",
    icon: "FileText",
    status: "active",
    requiredPermissions: [
      RBAC_PERMISSIONS.documentsRead,
      RBAC_PERMISSIONS.documentsUpload,
      RBAC_PERMISSIONS.documentsUpdate,
      RBAC_PERMISSIONS.documentsArchive
    ]
  },
  {
    key: "notices",
    label: "Notices",
    description: "Announcements and communication notices.",
    href: "/dashboard/notices",
    icon: "ClipboardList",
    status: "active",
    requiredPermissions: [
      RBAC_PERMISSIONS.noticesCreate,
      RBAC_PERMISSIONS.noticesUpdate,
      RBAC_PERMISSIONS.noticesPublish
    ]
  },
  {
    key: "reports",
    label: "Reports",
    description: "Academic, finance, attendance, and operations reporting.",
    href: "/dashboard/reports",
    icon: "ClipboardList",
    status: "active",
    requiredPermissions: [
      RBAC_PERMISSIONS.reportsRead,
      RBAC_PERMISSIONS.reportsAcademic,
      RBAC_PERMISSIONS.reportsFinance,
      RBAC_PERMISSIONS.reportsAttendance,
      RBAC_PERMISSIONS.reportsOperations
    ]
  },
  {
    key: "users",
    label: "Users",
    description: "ERP account provisioning and role assignment.",
    href: "/dashboard/users",
    icon: "UserCog",
    status: "active",
    requiredPermissions: [
      RBAC_PERMISSIONS.usersRead,
      RBAC_PERMISSIONS.usersCreate,
      RBAC_PERMISSIONS.usersUpdate,
      RBAC_PERMISSIONS.usersDelete,
      RBAC_PERMISSIONS.usersRolesManage
    ]
  },
  {
    key: "settings",
    label: "Settings",
    description: "School-wide settings and master-data setup.",
    href: "/dashboard/settings",
    icon: "Settings2",
    status: "active",
    requiredPermissions: [
      RBAC_PERMISSIONS.settingsRead,
      RBAC_PERMISSIONS.settingsUpdate,
      RBAC_PERMISSIONS.settingsManage
    ]
  },
  {
    key: "audit",
    label: "Audit",
    description: "System audit trail and compliance logs.",
    href: "/dashboard/audit",
    icon: "History",
    status: "active",
    requiredPermissions: [RBAC_PERMISSIONS.auditRead, RBAC_PERMISSIONS.auditExport]
  },
  {
    key: "library",
    label: "Library",
    description: "Book catalog and circulation workflows.",
    href: "/dashboard/library",
    icon: "BookOpenCheck",
    status: "beta",
    requiredPermissions: [
      RBAC_PERMISSIONS.libraryRead,
      RBAC_PERMISSIONS.libraryBooksManage,
      RBAC_PERMISSIONS.libraryIssueManage
    ]
  },
  {
    key: "inventory",
    label: "Inventory",
    description: "Stock, issuance, and movement tracking.",
    href: "/dashboard/inventory",
    icon: "ClipboardList",
    status: "beta",
    requiredPermissions: [
      RBAC_PERMISSIONS.inventoryRead,
      RBAC_PERMISSIONS.inventoryItemsManage,
      RBAC_PERMISSIONS.inventoryMovementsManage
    ]
  },
  {
    key: "transport",
    label: "Transport",
    description: "Vehicles, routes, and transport assignments.",
    href: "/dashboard/transport",
    icon: "Users",
    status: "beta",
    requiredPermissions: [
      RBAC_PERMISSIONS.transportRead,
      RBAC_PERMISSIONS.transportVehiclesManage,
      RBAC_PERMISSIONS.transportRoutesManage,
      RBAC_PERMISSIONS.transportAssignmentsManage
    ]
  },
  {
    key: "hostel",
    label: "Hostel",
    description: "Residential rooms, allocations, and hostel visibility.",
    href: "/dashboard/hostel",
    icon: "Users",
    status: "beta",
    requiredPermissions: [
      RBAC_PERMISSIONS.hostelRead,
      RBAC_PERMISSIONS.hostelRoomsManage,
      RBAC_PERMISSIONS.hostelAllocationsManage
    ]
  },
  {
    key: "leaves",
    label: "Leaves",
    description: "Leave requests, approvals, and workflow review.",
    href: "/dashboard/leaves",
    icon: "ClipboardList",
    status: "beta",
    requiredPermissions: [
      RBAC_PERMISSIONS.leavesRead,
      RBAC_PERMISSIONS.leavesRequest,
      RBAC_PERMISSIONS.leavesApprove,
      RBAC_PERMISSIONS.leavesManage
    ]
  },
  {
    key: "payroll",
    label: "Payroll",
    description: "Salary runs, slips, and payroll review.",
    href: "/dashboard/payroll",
    icon: "IndianRupee",
    status: "beta",
    requiredPermissions: [
      RBAC_PERMISSIONS.payrollRead,
      RBAC_PERMISSIONS.payrollRun,
      RBAC_PERMISSIONS.payrollApprove,
      RBAC_PERMISSIONS.payrollSlipsRead,
      RBAC_PERMISSIONS.payrollSlipsReadOwn
    ]
  },
  {
    key: "accounts",
    label: "Accounts",
    description: "Expense vouchers and finance operations.",
    href: "/dashboard/accounts",
    icon: "IndianRupee",
    status: "beta",
    requiredPermissions: [
      RBAC_PERMISSIONS.accountsRead,
      RBAC_PERMISSIONS.accountsExpensesManage,
      RBAC_PERMISSIONS.accountsExpensesApprove
    ]
  },
  {
    key: "health",
    label: "Health",
    description: "Health incidents and medical records.",
    href: "/dashboard/health",
    icon: "ShieldAlert",
    status: "hidden",
    requiredPermissions: [
      RBAC_PERMISSIONS.healthRead,
      RBAC_PERMISSIONS.healthRecordsManage,
      RBAC_PERMISSIONS.healthRecordsReadOwn,
      RBAC_PERMISSIONS.healthRecordsReadChild
    ]
  },
  {
    key: "reception",
    label: "Reception",
    description: "Visitor, enquiry, and admission desk workflows.",
    href: "/dashboard/reception",
    icon: "Users",
    status: "hidden",
    requiredPermissions: [
      RBAC_PERMISSIONS.receptionRead,
      RBAC_PERMISSIONS.receptionEnquiriesManage,
      RBAC_PERMISSIONS.receptionVisitorsManage,
      RBAC_PERMISSIONS.receptionAdmissionsManage
    ]
  },
  {
    key: "maintenance",
    label: "Maintenance",
    description: "Maintenance tickets and operational work orders.",
    href: "/dashboard/maintenance",
    icon: "Settings2",
    status: "hidden",
    requiredPermissions: [RBAC_PERMISSIONS.maintenanceRead, RBAC_PERMISSIONS.maintenanceTicketsManage]
  },
  {
    key: "security",
    label: "Security",
    description: "Security desk and visitor log operations.",
    href: "/dashboard/security",
    icon: "ShieldAlert",
    status: "hidden",
    requiredPermissions: [RBAC_PERMISSIONS.securityRead, RBAC_PERMISSIONS.securityVisitorsManage]
  },
  {
    key: "student-portal",
    label: "Student Portal",
    description: "Student self-service workspace.",
    href: "/dashboard/student-portal",
    icon: "UserRound",
    status: "active",
    allowedRoles: [RoleCode.STUDENT],
    navigationRoles: [RoleCode.STUDENT],
    requiredPermissions: [
      RBAC_PERMISSIONS.dashboardReadOwn,
      RBAC_PERMISSIONS.studentsReadOwn,
      RBAC_PERMISSIONS.attendanceReadOwn,
      RBAC_PERMISSIONS.feesReadOwn,
      RBAC_PERMISSIONS.examsReadOwn
    ]
  },
  {
    key: "parent-portal",
    label: "Parent Portal",
    description: "Parent and ward self-service workspace.",
    href: "/dashboard/parent-portal",
    icon: "Users",
    status: "active",
    allowedRoles: [RoleCode.PARENT],
    navigationRoles: [RoleCode.PARENT],
    requiredPermissions: [
      RBAC_PERMISSIONS.dashboardReadOwn,
      RBAC_PERMISSIONS.studentsReadChild,
      RBAC_PERMISSIONS.attendanceReadChild,
      RBAC_PERMISSIONS.feesReadChild,
      RBAC_PERMISSIONS.examsReadChild
    ]
  }
] as const satisfies readonly AppModule[];
