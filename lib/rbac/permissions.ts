export const RBAC_PERMISSIONS = {
  dashboardRead: "dashboard.read",
  dashboardReadSchool: "dashboard.read_school",
  dashboardReadOwn: "dashboard.read_own",

  studentsRead: "students.read",
  studentsReadOwn: "students.read_own",
  studentsReadChild: "students.read_child",
  studentsCreate: "students.create",
  studentsUpdate: "students.update",
  studentsDelete: "students.delete",
  studentsTransfer: "students.transfer",
  studentsDocumentsRead: "students.documents.read",
  studentsDocumentsManage: "students.documents.manage",

  staffRead: "staff.read",
  staffReadOwn: "staff.read_own",
  staffCreate: "staff.create",
  staffUpdate: "staff.update",
  staffDelete: "staff.delete",
  staffAttendanceRead: "staff.attendance.read",
  staffAttendanceMark: "staff.attendance.mark",

  attendanceRead: "attendance.read",
  attendanceReadClass: "attendance.read_class",
  attendanceReadOwn: "attendance.read_own",
  attendanceReadChild: "attendance.read_child",
  attendanceMark: "attendance.mark",
  attendanceUpdate: "attendance.update",
  attendanceReports: "attendance.reports",

  feesRead: "fees.read",
  feesReadOwn: "fees.read_own",
  feesReadChild: "fees.read_child",
  feesCollect: "fees.collect",
  feesUpdate: "fees.update",
  feesConcessionRequest: "fees.concession.request",
  feesConcessionApprove: "fees.concession.approve",
  feesRefund: "fees.refund",
  feesReports: "fees.reports",

  examsRead: "exams.read",
  examsReadOwn: "exams.read_own",
  examsReadChild: "exams.read_child",
  examsCreate: "exams.create",
  examsUpdate: "exams.update",
  examsDelete: "exams.delete",
  examsMarksEntry: "exams.marks_entry",
  examsMarksModerate: "exams.marks_moderate",
  examsPublishResult: "exams.publish_result",
  examsReports: "exams.reports",

  documentsRead: "documents.read",
  documentsReadOwn: "documents.read_own",
  documentsReadChild: "documents.read_child",
  documentsUpload: "documents.upload",
  documentsUpdate: "documents.update",
  documentsArchive: "documents.archive",
  documentsDelete: "documents.delete",

  noticesRead: "notices.read",
  noticesCreate: "notices.create",
  noticesUpdate: "notices.update",
  noticesPublish: "notices.publish",
  noticesDelete: "notices.delete",

  reportsRead: "reports.read",
  reportsExport: "reports.export",
  reportsAcademic: "reports.academic",
  reportsFinance: "reports.finance",
  reportsAttendance: "reports.attendance",
  reportsOperations: "reports.operations",

  usersRead: "users.read",
  usersCreate: "users.create",
  usersUpdate: "users.update",
  usersDelete: "users.delete",
  usersRolesManage: "users.roles.manage",
  usersPermissionsManage: "users.permissions.manage",

  settingsRead: "settings.read",
  settingsUpdate: "settings.update",
  settingsManage: "settings.manage",

  auditRead: "audit.read",
  auditExport: "audit.export",

  libraryRead: "library.read",
  libraryBooksManage: "library.books.manage",
  libraryIssueManage: "library.issue.manage",
  libraryReports: "library.reports",

  inventoryRead: "inventory.read",
  inventoryItemsManage: "inventory.items.manage",
  inventoryMovementsManage: "inventory.movements.manage",
  inventoryReports: "inventory.reports",

  transportRead: "transport.read",
  transportVehiclesManage: "transport.vehicles.manage",
  transportRoutesManage: "transport.routes.manage",
  transportAssignmentsManage: "transport.assignments.manage",
  transportReports: "transport.reports",

  hostelRead: "hostel.read",
  hostelRoomsManage: "hostel.rooms.manage",
  hostelAllocationsManage: "hostel.allocations.manage",
  hostelReports: "hostel.reports",

  leavesRead: "leaves.read",
  leavesRequest: "leaves.request",
  leavesApprove: "leaves.approve",
  leavesManage: "leaves.manage",
  leavesReports: "leaves.reports",

  payrollRead: "payroll.read",
  payrollRun: "payroll.run",
  payrollApprove: "payroll.approve",
  payrollSlipsRead: "payroll.slips.read",
  payrollSlipsReadOwn: "payroll.slips.read_own",
  payrollReports: "payroll.reports",

  accountsRead: "accounts.read",
  accountsExpensesManage: "accounts.expenses.manage",
  accountsExpensesApprove: "accounts.expenses.approve",
  accountsReports: "accounts.reports",

  healthRead: "health.read",
  healthRecordsManage: "health.records.manage",
  healthRecordsReadOwn: "health.records.read_own",
  healthRecordsReadChild: "health.records.read_child",

  receptionRead: "reception.read",
  receptionEnquiriesManage: "reception.enquiries.manage",
  receptionVisitorsManage: "reception.visitors.manage",
  receptionAdmissionsManage: "reception.admissions.manage",

  maintenanceRead: "maintenance.read",
  maintenanceTicketsManage: "maintenance.tickets.manage",

  securityRead: "security.read",
  securityVisitorsManage: "security.visitors.manage"
} as const;

export type RbacPermissionKey = (typeof RBAC_PERMISSIONS)[keyof typeof RBAC_PERMISSIONS];

export const ALL_RBAC_PERMISSIONS = Object.values(RBAC_PERMISSIONS) as RbacPermissionKey[];
