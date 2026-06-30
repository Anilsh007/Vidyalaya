import { FeeInvoiceStatus, RoleCode } from "@prisma/client";

import { db } from "@/lib/db";
import { fromMoney } from "@/lib/fees";
import { hasAllPermissions, hasPermission } from "@/lib/rbac/guards";
import { RBAC_PERMISSIONS, type RbacPermissionKey } from "@/lib/rbac/permissions";
import {
  getLinkedStudentIdForUser,
  getParentLinkedStudentIds,
  getTeacherScope
} from "@/lib/rbac/scope";

export const REPORT_TYPES = ["student", "attendance", "fees", "dues", "results"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export type ReportViewer = {
  userId: string;
  schoolId: string;
  roles: string[];
  permissions: string[];
};

export type ReportFilters = {
  schoolId: string;
  classId?: string;
  sectionId?: string;
  startDate?: Date;
  endDate?: Date;
  examId?: string;
};

type StudentRow = {
  studentName: string;
  admissionNumber: string;
  rollNumber: string;
  class: string;
  section: string;
  status: string;
  guardian: string;
  phone: string;
};

type AttendanceRow = {
  date: string;
  studentName: string;
  class: string;
  section: string;
  status: string;
  remarks: string;
};

type FeesRow = {
  receiptNumber: string;
  paymentDate: string;
  studentName: string;
  class: string;
  section: string;
  invoiceNumber: string;
  amount: number;
  paymentMode: string;
};

type DuesRow = {
  invoiceNumber: string;
  dueDate: string;
  studentName: string;
  class: string;
  section: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
};

type ResultsRow = {
  exam: string;
  studentName: string;
  class: string;
  section: string;
  percentage: number;
  grade: string;
  resultStatus: string;
};

export type ReportRowMap = {
  student: StudentRow;
  attendance: AttendanceRow;
  fees: FeesRow;
  dues: DuesRow;
  results: ResultsRow;
};

export type ReportDefinition = {
  key: ReportType;
  label: string;
  description: string;
  requiredReadPermissions: readonly RbacPermissionKey[];
  requiredReadAnyPermissions?: readonly RbacPermissionKey[];
  requiredExportPermissions: readonly RbacPermissionKey[];
};

const REPORT_DEFINITIONS: Record<ReportType, ReportDefinition> = {
  student: {
    key: "student",
    label: "Student report",
    description: "Student register export with class, section, status, and guardian contact.",
    requiredReadPermissions: [RBAC_PERMISSIONS.reportsRead, RBAC_PERMISSIONS.reportsAcademic],
    requiredReadAnyPermissions: [
      RBAC_PERMISSIONS.studentsRead,
      RBAC_PERMISSIONS.studentsReadOwn,
      RBAC_PERMISSIONS.studentsReadChild
    ],
    requiredExportPermissions: [RBAC_PERMISSIONS.reportsExport]
  },
  attendance: {
    key: "attendance",
    label: "Attendance report",
    description: "Attendance rows by date, student, class, section, status, and remarks.",
    requiredReadPermissions: [RBAC_PERMISSIONS.reportsRead, RBAC_PERMISSIONS.reportsAttendance],
    requiredReadAnyPermissions: [
      RBAC_PERMISSIONS.attendanceReports,
      RBAC_PERMISSIONS.attendanceRead,
      RBAC_PERMISSIONS.attendanceReadClass,
      RBAC_PERMISSIONS.attendanceReadOwn,
      RBAC_PERMISSIONS.attendanceReadChild
    ],
    requiredExportPermissions: [RBAC_PERMISSIONS.reportsExport]
  },
  fees: {
    key: "fees",
    label: "Fee collection report",
    description: "Receipt-wise collections with invoice, student, mode, and amount.",
    requiredReadPermissions: [RBAC_PERMISSIONS.reportsRead, RBAC_PERMISSIONS.reportsFinance],
    requiredReadAnyPermissions: [
      RBAC_PERMISSIONS.feesRead,
      RBAC_PERMISSIONS.feesReadOwn,
      RBAC_PERMISSIONS.feesReadChild
    ],
    requiredExportPermissions: [RBAC_PERMISSIONS.reportsExport]
  },
  dues: {
    key: "dues",
    label: "Pending dues report",
    description: "Outstanding invoices with due date, paid amount, and balance due.",
    requiredReadPermissions: [RBAC_PERMISSIONS.reportsRead, RBAC_PERMISSIONS.reportsFinance],
    requiredReadAnyPermissions: [
      RBAC_PERMISSIONS.feesRead,
      RBAC_PERMISSIONS.feesReadOwn,
      RBAC_PERMISSIONS.feesReadChild
    ],
    requiredExportPermissions: [RBAC_PERMISSIONS.reportsExport]
  },
  results: {
    key: "results",
    label: "Exam result report",
    description: "Exam result summary with class, section, percentage, grade, and result status.",
    requiredReadPermissions: [RBAC_PERMISSIONS.reportsRead, RBAC_PERMISSIONS.reportsAcademic],
    requiredReadAnyPermissions: [
      RBAC_PERMISSIONS.examsRead,
      RBAC_PERMISSIONS.examsReadOwn,
      RBAC_PERMISSIONS.examsReadChild
    ],
    requiredExportPermissions: [RBAC_PERMISSIONS.reportsExport]
  }
};

type ScopedStudentAccess =
  | { mode: "all" }
  | { mode: "ids"; studentIds: string[] }
  | { mode: "teacher"; classIds: string[]; sectionIds: string[] }
  | { mode: "none" };

function hasAnyPermission(viewer: ReportViewer, permissions: readonly RbacPermissionKey[]) {
  return permissions.some((permission) => hasPermission(viewer, permission));
}

function hasAnyRole(viewer: ReportViewer, roles: readonly RoleCode[]) {
  return roles.some((role) => viewer.roles.includes(role));
}

function impossibleStudentWhere(schoolId: string) {
  return { schoolId, id: "__no_report_scope__" };
}

function buildDateRangeFilter(startDate?: Date, endDate?: Date) {
  if (!startDate && !endDate) {
    return undefined;
  }

  return {
    ...(startDate ? { gte: startDate } : {}),
    ...(endDate ? { lte: endDate } : {})
  };
}

async function resolveStudentAccessScope(viewer: ReportViewer): Promise<ScopedStudentAccess> {
  if (
    hasAnyRole(viewer, [
      RoleCode.SUPER_ADMIN,
      RoleCode.ADMIN,
      RoleCode.PRINCIPAL,
      RoleCode.DIRECTOR,
      RoleCode.ACCOUNTANT,
      RoleCode.HR,
      RoleCode.FRONT_DESK,
      RoleCode.LIBRARIAN,
      RoleCode.TRANSPORT_MANAGER,
      RoleCode.HOSTEL_WARDEN,
      RoleCode.PROCUREMENT_MANAGER,
      RoleCode.NURSE
    ])
  ) {
    return { mode: "all" };
  }

  if (viewer.roles.includes(RoleCode.STUDENT)) {
    const studentId = await getLinkedStudentIdForUser(viewer);
    return studentId ? { mode: "ids", studentIds: [studentId] } : { mode: "none" };
  }

  if (viewer.roles.includes(RoleCode.PARENT)) {
    const studentIds = await getParentLinkedStudentIds(viewer);
    return studentIds.length ? { mode: "ids", studentIds } : { mode: "none" };
  }

  if (hasAnyRole(viewer, [RoleCode.TEACHER, RoleCode.HOD, RoleCode.EXAM_CONTROLLER])) {
    const scope = await getTeacherScope(viewer);
    return scope.classIds.length || scope.sectionIds.length
      ? {
          mode: "teacher",
          classIds: scope.classIds,
          sectionIds: scope.sectionIds
        }
      : { mode: "none" };
  }

  return { mode: "none" };
}

function buildStudentWhereForScope(scope: ScopedStudentAccess, filters: ReportFilters) {
  if (scope.mode === "none") {
    return impossibleStudentWhere(filters.schoolId);
  }

  if (scope.mode === "all") {
    return {
      schoolId: filters.schoolId,
      ...(filters.classId ? { classId: filters.classId } : {}),
      ...(filters.sectionId ? { sectionId: filters.sectionId } : {})
    };
  }

  if (scope.mode === "ids") {
    return {
      schoolId: filters.schoolId,
      id: { in: scope.studentIds },
      ...(filters.classId ? { classId: filters.classId } : {}),
      ...(filters.sectionId ? { sectionId: filters.sectionId } : {})
    };
  }

  if (filters.classId && !scope.classIds.includes(filters.classId)) {
    return impossibleStudentWhere(filters.schoolId);
  }

  if (filters.sectionId && !scope.sectionIds.includes(filters.sectionId)) {
    return impossibleStudentWhere(filters.schoolId);
  }

  const scopedPairs =
    filters.sectionId || filters.classId
      ? scope.sectionIds
          .filter((sectionId) => !filters.sectionId || sectionId === filters.sectionId)
          .map((sectionId) => ({
            sectionId,
            ...(filters.classId ? { classId: filters.classId } : {})
          }))
      : scope.sectionIds.map((sectionId) => ({ sectionId }));

  if (scopedPairs.length) {
    return {
      schoolId: filters.schoolId,
      OR: scopedPairs
    };
  }

  return {
    schoolId: filters.schoolId,
    classId: { in: scope.classIds.length ? scope.classIds : ["__no_report_scope__"] }
  };
}

function buildSectionWhereForScope(scope: ScopedStudentAccess, schoolId: string) {
  if (scope.mode === "none") {
    return { schoolId, id: "__no_report_scope__" };
  }

  if (scope.mode === "all" || scope.mode === "ids") {
    return { schoolId };
  }

  return {
    schoolId,
    id: { in: scope.sectionIds.length ? scope.sectionIds : ["__no_report_scope__"] }
  };
}

function buildClassWhereForScope(scope: ScopedStudentAccess, schoolId: string) {
  if (scope.mode === "none") {
    return { schoolId, id: "__no_report_scope__" };
  }

  if (scope.mode === "all" || scope.mode === "ids") {
    return { schoolId };
  }

  return {
    schoolId,
    id: { in: scope.classIds.length ? scope.classIds : ["__no_report_scope__"] }
  };
}

function buildExamWhereForScope(scope: ScopedStudentAccess, schoolId: string) {
  if (scope.mode === "none") {
    return { schoolId, id: "__no_report_scope__" };
  }

  if (scope.mode === "all" || scope.mode === "ids") {
    return { schoolId };
  }

  return {
    schoolId,
    classId: { in: scope.classIds.length ? scope.classIds : ["__no_report_scope__"] }
  };
}

export function getReportDefinition(type: ReportType) {
  return REPORT_DEFINITIONS[type];
}

export function getAvailableReportDefinitions(viewer: ReportViewer) {
  return REPORT_TYPES.filter((type) => hasReportReadAccess(viewer, type)).map((type) =>
    getReportDefinition(type)
  );
}

export function hasReportReadAccess(viewer: ReportViewer, type: ReportType) {
  const definition = REPORT_DEFINITIONS[type];
  const hasRequiredRead = hasAllPermissions(viewer, definition.requiredReadPermissions);
  if (!hasRequiredRead) {
    return false;
  }

  if (!definition.requiredReadAnyPermissions?.length) {
    return true;
  }

  return hasAnyPermission(viewer, definition.requiredReadAnyPermissions);
}

export function hasReportExportAccess(viewer: ReportViewer, type: ReportType) {
  return (
    hasReportReadAccess(viewer, type) &&
    hasAnyPermission(viewer, REPORT_DEFINITIONS[type].requiredExportPermissions)
  );
}

export function assertCanAccessReport(viewer: ReportViewer, type: ReportType, intent: "view" | "export" = "view") {
  const allowed =
    intent === "export" ? hasReportExportAccess(viewer, type) : hasReportReadAccess(viewer, type);

  if (!allowed) {
    throw new Error("You do not have permission to access this report.");
  }
}

export async function getReportsPageMeta(viewer: ReportViewer) {
  const scope = await resolveStudentAccessScope(viewer);

  const [classes, sections, exams] = await Promise.all([
    db.schoolClass.findMany({
      where: buildClassWhereForScope(scope, viewer.schoolId),
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    }),
    db.section.findMany({
      where: buildSectionWhereForScope(scope, viewer.schoolId),
      include: { class: true },
      orderBy: [{ class: { displayOrder: "asc" } }, { name: "asc" }]
    }),
    db.exam.findMany({
      where: buildExamWhereForScope(scope, viewer.schoolId),
      orderBy: [{ startDate: "desc" }]
    })
  ]);

  return { classes, sections, exams };
}

export async function getStudentReport(viewer: ReportViewer, filters: ReportFilters): Promise<StudentRow[]> {
  assertCanAccessReport(viewer, "student", "view");
  const scope = await resolveStudentAccessScope(viewer);
  const students = await db.student.findMany({
    where: buildStudentWhereForScope(scope, filters),
    include: {
      class: true,
      section: true,
      guardians: {
        where: { isPrimary: true },
        include: { parent: true },
        take: 1
      }
    },
    orderBy: [{ fullName: "asc" }]
  });

  return students.map((student) => ({
    studentName: student.fullName,
    admissionNumber: student.admissionNumber,
    rollNumber: student.rollNumber ?? "",
    class: student.class?.name ?? "",
    section: student.section?.name ?? "",
    status: student.status,
    guardian: student.guardians[0]?.parent.guardianName ?? "",
    phone: student.guardians[0]?.parent.phonePrimary ?? ""
  }));
}

export async function getAttendanceReport(viewer: ReportViewer, filters: ReportFilters): Promise<AttendanceRow[]> {
  assertCanAccessReport(viewer, "attendance", "view");
  const scope = await resolveStudentAccessScope(viewer);
  const attendances = await db.attendance.findMany({
    where: {
      schoolId: filters.schoolId,
      ...(buildDateRangeFilter(filters.startDate, filters.endDate)
        ? { date: buildDateRangeFilter(filters.startDate, filters.endDate) }
        : {}),
      student: buildStudentWhereForScope(scope, filters)
    },
    include: {
      student: {
        include: {
          class: true,
          section: true
        }
      }
    },
    orderBy: [{ date: "desc" }]
  });

  return attendances.map((attendance) => ({
    date: attendance.date.toISOString().slice(0, 10),
    studentName: attendance.student.fullName,
    class: attendance.student.class?.name ?? "",
    section: attendance.student.section?.name ?? "",
    status: attendance.status,
    remarks: attendance.remarks ?? ""
  }));
}

export async function getFeeCollectionReport(viewer: ReportViewer, filters: ReportFilters): Promise<FeesRow[]> {
  assertCanAccessReport(viewer, "fees", "view");
  const scope = await resolveStudentAccessScope(viewer);
  const payments = await db.feePayment.findMany({
    where: {
      schoolId: filters.schoolId,
      ...(buildDateRangeFilter(filters.startDate, filters.endDate)
        ? { paymentDate: buildDateRangeFilter(filters.startDate, filters.endDate) }
        : {}),
      feeInvoice: {
        student: buildStudentWhereForScope(scope, filters)
      }
    },
    include: {
      feeInvoice: {
        include: {
          student: {
            include: {
              class: true,
              section: true
            }
          }
        }
      }
    },
    orderBy: [{ paymentDate: "desc" }]
  });

  return payments.map((payment) => ({
    receiptNumber: payment.receiptNumber,
    paymentDate: payment.paymentDate.toISOString().slice(0, 10),
    studentName: payment.feeInvoice.student.fullName,
    class: payment.feeInvoice.student.class?.name ?? "",
    section: payment.feeInvoice.student.section?.name ?? "",
    invoiceNumber: payment.feeInvoice.invoiceNumber,
    amount: fromMoney(payment.amount),
    paymentMode: payment.paymentMode.replaceAll("_", " ")
  }));
}

export async function getPendingDuesReport(viewer: ReportViewer, filters: ReportFilters): Promise<DuesRow[]> {
  assertCanAccessReport(viewer, "dues", "view");
  const scope = await resolveStudentAccessScope(viewer);
  const invoices = await db.feeInvoice.findMany({
    where: {
      schoolId: filters.schoolId,
      status: {
        in: [FeeInvoiceStatus.ISSUED, FeeInvoiceStatus.PARTIALLY_PAID, FeeInvoiceStatus.OVERDUE]
      },
      student: buildStudentWhereForScope(scope, filters)
    },
    include: {
      student: {
        include: {
          class: true,
          section: true
        }
      }
    },
    orderBy: [{ dueDate: "asc" }]
  });

  return invoices.map((invoice) => ({
    invoiceNumber: invoice.invoiceNumber,
    dueDate: invoice.dueDate.toISOString().slice(0, 10),
    studentName: invoice.student.fullName,
    class: invoice.student.class?.name ?? "",
    section: invoice.student.section?.name ?? "",
    totalAmount: fromMoney(invoice.totalAmount),
    paidAmount: fromMoney(invoice.paidAmount),
    balanceDue: Math.max(0, fromMoney(invoice.totalAmount) - fromMoney(invoice.paidAmount)),
    status: invoice.status
  }));
}

export async function getExamResultReport(viewer: ReportViewer, filters: ReportFilters): Promise<ResultsRow[]> {
  assertCanAccessReport(viewer, "results", "view");
  const scope = await resolveStudentAccessScope(viewer);
  const results = await db.examResult.findMany({
    where: {
      ...(filters.examId ? { examId: filters.examId } : {}),
      exam: { schoolId: filters.schoolId },
      student: buildStudentWhereForScope(scope, filters)
    },
    include: {
      exam: true,
      student: {
        include: {
          class: true,
          section: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return results.map((result) => ({
    exam: result.exam.name,
    studentName: result.student.fullName,
    class: result.student.class?.name ?? "",
    section: result.student.section?.name ?? "",
    percentage: Number(result.percentage),
    grade: result.grade,
    resultStatus: result.resultStatus
  }));
}

export async function getReportRows<T extends ReportType>(
  viewer: ReportViewer,
  type: T,
  filters: ReportFilters
): Promise<ReportRowMap[T][]> {
  switch (type) {
    case "student":
      return (await getStudentReport(viewer, filters)) as ReportRowMap[T][];
    case "attendance":
      return (await getAttendanceReport(viewer, filters)) as ReportRowMap[T][];
    case "fees":
      return (await getFeeCollectionReport(viewer, filters)) as ReportRowMap[T][];
    case "dues":
      return (await getPendingDuesReport(viewer, filters)) as ReportRowMap[T][];
    case "results":
      return (await getExamResultReport(viewer, filters)) as ReportRowMap[T][];
  }
}
