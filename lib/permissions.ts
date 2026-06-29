import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/rbac/role-permissions";
import { RBAC_PERMISSIONS, type RbacPermissionKey } from "@/lib/rbac/permissions";

export const PERMISSIONS = {
  manageSchoolSettings: RBAC_PERMISSIONS.settingsManage,
  manageUsers: RBAC_PERMISSIONS.usersRolesManage,
  viewStaff: RBAC_PERMISSIONS.staffRead,
  manageStaff: RBAC_PERMISSIONS.staffUpdate,
  viewStudents: RBAC_PERMISSIONS.studentsRead,
  manageStudents: RBAC_PERMISSIONS.studentsUpdate,
  viewDocuments: RBAC_PERMISSIONS.documentsRead,
  manageDocuments: RBAC_PERMISSIONS.documentsUpdate,
  viewAttendance: RBAC_PERMISSIONS.attendanceRead,
  manageAttendance: RBAC_PERMISSIONS.attendanceUpdate,
  viewExams: RBAC_PERMISSIONS.examsRead,
  manageExams: RBAC_PERMISSIONS.examsUpdate,
  manageFees: RBAC_PERMISSIONS.feesUpdate,
  viewReports: RBAC_PERMISSIONS.reportsRead,
  manageNotices: RBAC_PERMISSIONS.noticesUpdate,
  viewAuditLogs: RBAC_PERMISSIONS.auditRead,
  viewAccounts: RBAC_PERMISSIONS.accountsRead,
  manageAccounts: RBAC_PERMISSIONS.accountsExpensesManage,
  viewPayroll: RBAC_PERMISSIONS.payrollRead,
  managePayroll: RBAC_PERMISSIONS.payrollRun,
  viewLeaves: RBAC_PERMISSIONS.leavesRead,
  manageLeaves: RBAC_PERMISSIONS.leavesManage,
  viewLibrary: RBAC_PERMISSIONS.libraryRead,
  manageLibrary: RBAC_PERMISSIONS.libraryBooksManage,
  viewInventory: RBAC_PERMISSIONS.inventoryRead,
  manageInventory: RBAC_PERMISSIONS.inventoryItemsManage,
  viewTransport: RBAC_PERMISSIONS.transportRead,
  manageTransport: RBAC_PERMISSIONS.transportRoutesManage,
  viewHostel: RBAC_PERMISSIONS.hostelRead,
  manageHostel: RBAC_PERMISSIONS.hostelRoomsManage
} as const;

export { RBAC_PERMISSIONS };

export type PermissionKey = RbacPermissionKey;
