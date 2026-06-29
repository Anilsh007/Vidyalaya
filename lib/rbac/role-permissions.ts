import { RoleCode } from "@prisma/client";

import { ALL_RBAC_PERMISSIONS, RBAC_PERMISSIONS, type RbacPermissionKey } from "@/lib/rbac/permissions";

const uniquePermissions = (...groups: Array<readonly RbacPermissionKey[]>) =>
  Array.from(new Set(groups.flat())) as RbacPermissionKey[];

const dashboardOwn = [RBAC_PERMISSIONS.dashboardRead, RBAC_PERMISSIONS.dashboardReadOwn] as const;
const dashboardSchool = [RBAC_PERMISSIONS.dashboardRead, RBAC_PERMISSIONS.dashboardReadSchool] as const;
const reportsAcademic = [
  RBAC_PERMISSIONS.reportsRead,
  RBAC_PERMISSIONS.reportsExport,
  RBAC_PERMISSIONS.reportsAcademic
] as const;
const reportsFinance = [
  RBAC_PERMISSIONS.reportsRead,
  RBAC_PERMISSIONS.reportsExport,
  RBAC_PERMISSIONS.reportsFinance
] as const;
const reportsAttendance = [
  RBAC_PERMISSIONS.reportsRead,
  RBAC_PERMISSIONS.reportsExport,
  RBAC_PERMISSIONS.reportsAttendance
] as const;
const reportsOperations = [
  RBAC_PERMISSIONS.reportsRead,
  RBAC_PERMISSIONS.reportsExport,
  RBAC_PERMISSIONS.reportsOperations
] as const;

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleCode, RbacPermissionKey[]> = {
  SUPER_ADMIN: [...ALL_RBAC_PERMISSIONS],
  ADMIN: uniquePermissions(
    ALL_RBAC_PERMISSIONS.filter((permission) => permission !== RBAC_PERMISSIONS.usersPermissionsManage),
    [RBAC_PERMISSIONS.usersRolesManage]
  ),
  DIRECTOR: uniquePermissions(
    dashboardSchool,
    [
      RBAC_PERMISSIONS.studentsRead,
      RBAC_PERMISSIONS.studentsDocumentsRead,
      RBAC_PERMISSIONS.staffRead,
      RBAC_PERMISSIONS.staffAttendanceRead,
      RBAC_PERMISSIONS.attendanceRead,
      RBAC_PERMISSIONS.attendanceReports,
      RBAC_PERMISSIONS.feesRead,
      RBAC_PERMISSIONS.feesConcessionApprove,
      RBAC_PERMISSIONS.examsRead,
      RBAC_PERMISSIONS.examsReports,
      RBAC_PERMISSIONS.documentsRead,
      RBAC_PERMISSIONS.noticesRead,
      RBAC_PERMISSIONS.noticesCreate,
      RBAC_PERMISSIONS.noticesUpdate,
      RBAC_PERMISSIONS.noticesPublish,
      RBAC_PERMISSIONS.usersRead,
      RBAC_PERMISSIONS.settingsRead,
      RBAC_PERMISSIONS.auditRead,
      RBAC_PERMISSIONS.libraryRead,
      RBAC_PERMISSIONS.inventoryRead,
      RBAC_PERMISSIONS.transportRead,
      RBAC_PERMISSIONS.hostelRead,
      RBAC_PERMISSIONS.leavesRead,
      RBAC_PERMISSIONS.leavesApprove,
      RBAC_PERMISSIONS.payrollRead,
      RBAC_PERMISSIONS.payrollSlipsRead,
      RBAC_PERMISSIONS.accountsRead,
      RBAC_PERMISSIONS.healthRead,
      RBAC_PERMISSIONS.receptionRead
    ],
    reportsAcademic,
    reportsFinance,
    reportsAttendance,
    reportsOperations
  ),
  PRINCIPAL: uniquePermissions(
    dashboardSchool,
    [
      RBAC_PERMISSIONS.studentsRead,
      RBAC_PERMISSIONS.studentsDocumentsRead,
      RBAC_PERMISSIONS.staffRead,
      RBAC_PERMISSIONS.staffAttendanceRead,
      RBAC_PERMISSIONS.attendanceRead,
      RBAC_PERMISSIONS.attendanceReadClass,
      RBAC_PERMISSIONS.attendanceMark,
      RBAC_PERMISSIONS.attendanceReports,
      RBAC_PERMISSIONS.examsRead,
      RBAC_PERMISSIONS.examsCreate,
      RBAC_PERMISSIONS.examsUpdate,
      RBAC_PERMISSIONS.examsMarksModerate,
      RBAC_PERMISSIONS.examsPublishResult,
      RBAC_PERMISSIONS.examsReports,
      RBAC_PERMISSIONS.documentsRead,
      RBAC_PERMISSIONS.documentsUpload,
      RBAC_PERMISSIONS.documentsUpdate,
      RBAC_PERMISSIONS.noticesRead,
      RBAC_PERMISSIONS.noticesCreate,
      RBAC_PERMISSIONS.noticesUpdate,
      RBAC_PERMISSIONS.noticesPublish,
      RBAC_PERMISSIONS.receptionRead,
      RBAC_PERMISSIONS.leavesRead,
      RBAC_PERMISSIONS.leavesApprove,
      RBAC_PERMISSIONS.healthRead
    ],
    reportsAcademic,
    reportsAttendance
  ),
  HR: uniquePermissions(
    dashboardSchool,
    [
      RBAC_PERMISSIONS.staffRead,
      RBAC_PERMISSIONS.staffCreate,
      RBAC_PERMISSIONS.staffUpdate,
      RBAC_PERMISSIONS.documentsRead,
      RBAC_PERMISSIONS.usersRead,
      RBAC_PERMISSIONS.leavesRead,
      RBAC_PERMISSIONS.leavesManage,
      RBAC_PERMISSIONS.leavesReports,
      RBAC_PERMISSIONS.payrollRead,
      RBAC_PERMISSIONS.payrollSlipsRead,
      RBAC_PERMISSIONS.healthRead
    ],
    reportsOperations
  ),
  HOD: uniquePermissions(
    dashboardSchool,
    [
      RBAC_PERMISSIONS.studentsRead,
      RBAC_PERMISSIONS.staffRead,
      RBAC_PERMISSIONS.attendanceRead,
      RBAC_PERMISSIONS.attendanceReadClass,
      RBAC_PERMISSIONS.attendanceMark,
      RBAC_PERMISSIONS.attendanceUpdate,
      RBAC_PERMISSIONS.examsRead,
      RBAC_PERMISSIONS.examsUpdate,
      RBAC_PERMISSIONS.examsMarksEntry,
      RBAC_PERMISSIONS.examsReports,
      RBAC_PERMISSIONS.documentsRead,
      RBAC_PERMISSIONS.documentsUpload,
      RBAC_PERMISSIONS.documentsUpdate,
      RBAC_PERMISSIONS.noticesRead,
      RBAC_PERMISSIONS.noticesCreate,
      RBAC_PERMISSIONS.noticesUpdate
    ],
    reportsAcademic,
    reportsAttendance
  ),
  TEACHER: uniquePermissions(
    dashboardOwn,
    [
      RBAC_PERMISSIONS.studentsRead,
      RBAC_PERMISSIONS.attendanceRead,
      RBAC_PERMISSIONS.attendanceReadClass,
      RBAC_PERMISSIONS.attendanceMark,
      RBAC_PERMISSIONS.attendanceUpdate,
      RBAC_PERMISSIONS.examsRead,
      RBAC_PERMISSIONS.examsUpdate,
      RBAC_PERMISSIONS.examsMarksEntry,
      RBAC_PERMISSIONS.documentsRead,
      RBAC_PERMISSIONS.documentsUpload,
      RBAC_PERMISSIONS.documentsUpdate,
      RBAC_PERMISSIONS.noticesRead,
      RBAC_PERMISSIONS.noticesUpdate,
      RBAC_PERMISSIONS.leavesRead,
      RBAC_PERMISSIONS.leavesRequest
    ]
  ),
  EXAM_CONTROLLER: uniquePermissions(
    dashboardSchool,
    [
      RBAC_PERMISSIONS.studentsRead,
      RBAC_PERMISSIONS.examsRead,
      RBAC_PERMISSIONS.examsCreate,
      RBAC_PERMISSIONS.examsUpdate,
      RBAC_PERMISSIONS.examsDelete,
      RBAC_PERMISSIONS.examsMarksEntry,
      RBAC_PERMISSIONS.examsMarksModerate,
      RBAC_PERMISSIONS.examsPublishResult,
      RBAC_PERMISSIONS.documentsRead,
      RBAC_PERMISSIONS.documentsUpdate,
      RBAC_PERMISSIONS.noticesRead,
      RBAC_PERMISSIONS.noticesUpdate
    ],
    reportsAcademic
  ),
  ACCOUNTANT: uniquePermissions(
    dashboardSchool,
    [
      RBAC_PERMISSIONS.studentsRead,
      RBAC_PERMISSIONS.feesRead,
      RBAC_PERMISSIONS.feesCollect,
      RBAC_PERMISSIONS.feesUpdate,
      RBAC_PERMISSIONS.feesConcessionRequest,
      RBAC_PERMISSIONS.feesRefund,
      RBAC_PERMISSIONS.documentsRead,
      RBAC_PERMISSIONS.payrollRead,
      RBAC_PERMISSIONS.payrollRun,
      RBAC_PERMISSIONS.payrollSlipsRead,
      RBAC_PERMISSIONS.accountsRead,
      RBAC_PERMISSIONS.accountsExpensesManage
    ],
    reportsFinance
  ),
  PROCUREMENT_MANAGER: uniquePermissions(
    dashboardSchool,
    [
      RBAC_PERMISSIONS.inventoryRead,
      RBAC_PERMISSIONS.inventoryItemsManage,
      RBAC_PERMISSIONS.inventoryMovementsManage,
      RBAC_PERMISSIONS.accountsRead,
      RBAC_PERMISSIONS.accountsExpensesManage,
      RBAC_PERMISSIONS.documentsRead
    ],
    reportsOperations
  ),
  LIBRARIAN: uniquePermissions(
    dashboardSchool,
    [
      RBAC_PERMISSIONS.libraryRead,
      RBAC_PERMISSIONS.libraryBooksManage,
      RBAC_PERMISSIONS.libraryIssueManage,
      RBAC_PERMISSIONS.studentsRead,
      RBAC_PERMISSIONS.staffRead
    ],
    reportsOperations
  ),
  TRANSPORT_MANAGER: uniquePermissions(
    dashboardSchool,
    [
      RBAC_PERMISSIONS.transportRead,
      RBAC_PERMISSIONS.transportVehiclesManage,
      RBAC_PERMISSIONS.transportRoutesManage,
      RBAC_PERMISSIONS.transportAssignmentsManage,
      RBAC_PERMISSIONS.studentsRead,
      RBAC_PERMISSIONS.staffRead
    ],
    reportsOperations
  ),
  HOSTEL_WARDEN: uniquePermissions(
    dashboardSchool,
    [
      RBAC_PERMISSIONS.hostelRead,
      RBAC_PERMISSIONS.hostelRoomsManage,
      RBAC_PERMISSIONS.hostelAllocationsManage,
      RBAC_PERMISSIONS.studentsRead,
      RBAC_PERMISSIONS.healthRead
    ],
    reportsOperations
  ),
  FRONT_DESK: uniquePermissions(
    dashboardSchool,
    [
      RBAC_PERMISSIONS.studentsRead,
      RBAC_PERMISSIONS.studentsCreate,
      RBAC_PERMISSIONS.studentsUpdate,
      RBAC_PERMISSIONS.documentsRead,
      RBAC_PERMISSIONS.documentsUpload,
      RBAC_PERMISSIONS.noticesRead,
      RBAC_PERMISSIONS.receptionRead,
      RBAC_PERMISSIONS.receptionAdmissionsManage,
      RBAC_PERMISSIONS.receptionEnquiriesManage,
      RBAC_PERMISSIONS.receptionVisitorsManage
    ]
  ),
  NURSE: uniquePermissions(
    dashboardOwn,
    [
      RBAC_PERMISSIONS.studentsRead,
      RBAC_PERMISSIONS.healthRead,
      RBAC_PERMISSIONS.healthRecordsManage
    ]
  ),
  SECURITY_GUARD: uniquePermissions(
    dashboardOwn,
    [RBAC_PERMISSIONS.noticesRead, RBAC_PERMISSIONS.securityRead, RBAC_PERMISSIONS.securityVisitorsManage]
  ),
  MAINTENANCE_TECHNICIAN: uniquePermissions(
    dashboardOwn,
    [RBAC_PERMISSIONS.noticesRead, RBAC_PERMISSIONS.maintenanceRead, RBAC_PERMISSIONS.maintenanceTicketsManage]
  ),
  PEON: uniquePermissions(dashboardOwn, [RBAC_PERMISSIONS.noticesRead]),
  STUDENT: uniquePermissions(
    dashboardOwn,
    [
      RBAC_PERMISSIONS.studentsReadOwn,
      RBAC_PERMISSIONS.attendanceReadOwn,
      RBAC_PERMISSIONS.feesReadOwn,
      RBAC_PERMISSIONS.examsReadOwn,
      RBAC_PERMISSIONS.documentsReadOwn,
      RBAC_PERMISSIONS.noticesRead
    ]
  ),
  PARENT: uniquePermissions(
    dashboardOwn,
    [
      RBAC_PERMISSIONS.studentsReadChild,
      RBAC_PERMISSIONS.attendanceReadChild,
      RBAC_PERMISSIONS.feesReadChild,
      RBAC_PERMISSIONS.examsReadChild,
      RBAC_PERMISSIONS.documentsReadChild,
      RBAC_PERMISSIONS.noticesRead
    ]
  )
};
