export const PERMISSIONS = {
  manageSchoolSettings: "school.manage",
  manageUsers: "users.manage",
  viewStaff: "staff.view",
  manageStaff: "staff.manage",
  viewStudents: "students.view",
  manageStudents: "students.manage",
  viewDocuments: "documents.view",
  manageDocuments: "documents.manage",
  viewAttendance: "attendance.view",
  manageAttendance: "attendance.manage",
  viewExams: "exams.view",
  manageExams: "exams.manage",
  manageFees: "fees.manage",
  viewReports: "reports.view",
  manageNotices: "notices.manage",
  viewAuditLogs: "audit.view"
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  ADMIN: [
    PERMISSIONS.manageSchoolSettings,
    PERMISSIONS.manageUsers,
    PERMISSIONS.viewStaff,
    PERMISSIONS.manageStaff,
    PERMISSIONS.viewStudents,
    PERMISSIONS.manageStudents,
    PERMISSIONS.viewDocuments,
    PERMISSIONS.manageDocuments,
    PERMISSIONS.viewAttendance,
    PERMISSIONS.manageAttendance,
    PERMISSIONS.viewExams,
    PERMISSIONS.manageExams,
    PERMISSIONS.manageFees,
    PERMISSIONS.viewReports,
    PERMISSIONS.manageNotices,
    PERMISSIONS.viewAuditLogs
  ],
  PRINCIPAL: [
    PERMISSIONS.viewStaff,
    PERMISSIONS.viewStudents,
    PERMISSIONS.viewDocuments,
    PERMISSIONS.viewAttendance,
    PERMISSIONS.manageAttendance,
    PERMISSIONS.viewExams,
    PERMISSIONS.manageExams,
    PERMISSIONS.viewReports,
    PERMISSIONS.manageNotices
  ],
  TEACHER: [
    PERMISSIONS.viewStaff,
    PERMISSIONS.viewStudents,
    PERMISSIONS.viewDocuments,
    PERMISSIONS.viewAttendance,
    PERMISSIONS.manageAttendance,
    PERMISSIONS.viewExams,
    PERMISSIONS.manageExams
  ],
  ACCOUNTANT: [PERMISSIONS.viewDocuments, PERMISSIONS.manageFees, PERMISSIONS.viewReports],
  STUDENT: [],
  PARENT: []
};
