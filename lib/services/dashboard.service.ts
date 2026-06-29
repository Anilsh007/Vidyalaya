import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Banknote,
  BellRing,
  BookOpenCheck,
  BookType,
  Boxes,
  Briefcase,
  BusFront,
  CalendarCheck2,
  CalendarClock,
  ClipboardList,
  FileBadge2,
  FileClock,
  FileText,
  GraduationCap,
  IndianRupee,
  LayoutGrid,
  Library,
  Megaphone,
  ShieldAlert,
  Users,
  WalletCards,
  Warehouse,
  Stethoscope
} from "lucide-react";
import { FeePaymentMode, LibraryIssueStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { isNoticeVisibleToSession } from "@/lib/notices";
import { PERMISSIONS } from "@/lib/permissions";
import { getParentPortalData, getStudentPortalData } from "@/lib/services/portal.service";
import { formatCurrency } from "@/lib/utils";

export type DashboardRoleKey =
  | "admin"
  | "leadership"
  | "teaching"
  | "finance"
  | "student"
  | "parent"
  | "library"
  | "transport"
  | "hostel"
  | "inventory"
  | "frontdesk"
  | "general";

export type MetricTone = "slate" | "indigo" | "emerald" | "purple" | "amber" | "rose";
export type AlertTone = "indigo" | "emerald" | "amber" | "rose" | "slate";

export type MetricCardData = {
  title: string;
  value: string;
  hint: string;
  trend: string;
  href: string;
  ctaLabel?: string;
  detail?: string;
  icon: LucideIcon;
  tone: MetricTone;
};

export type ActionCardData = {
  label: string;
  href: string;
  icon: LucideIcon;
  variant?: "primary" | "secondary";
};

export type ChartPoint = {
  label: string;
  value: number;
  target?: number;
  meta?: string;
};

export type ChartCardData =
  | {
      type: "financial";
      title: string;
      subtitle: string;
      href: string;
      ctaLabel?: string;
      points: ChartPoint[];
    }
  | {
      type: "bars";
      title: string;
      subtitle: string;
      href: string;
      ctaLabel?: string;
      points: ChartPoint[];
    }
  | {
      type: "compare";
      title: string;
      subtitle: string;
      href: string;
      ctaLabel?: string;
      points: ChartPoint[];
      suffix?: string;
    }
  | {
      type: "progress";
      title: string;
      subtitle: string;
      href: string;
      ctaLabel?: string;
      value: number;
      hint: string;
      segments: Array<{ label: string; value: number; tone: MetricTone }>;
    }
  | {
      type: "countdown";
      title: string;
      subtitle: string;
      href: string;
      ctaLabel?: string;
      items: Array<{ label: string; value: string; meta: string }>;
    };

export type AlertItemData = {
  time: string;
  title: string;
  detail: string;
  tone: AlertTone;
};

export type DashboardVariant = {
  key: DashboardRoleKey;
  label: string;
  title: string;
  subtitle: string;
  heroNote: string;
  metrics: MetricCardData[];
  actions: ActionCardData[];
  charts: ChartCardData[];
  alerts: AlertItemData[];
  noticesTitle: string;
  noticesSubtitle: string;
};

type DashboardSession = {
  userId: string;
  schoolId: string;
  roles: string[];
  permissions: string[];
};

type DashboardContext = {
  schoolId: string;
  todayStart: Date;
  todayEnd: Date;
  monthStart: Date;
  sixMonthsStart: Date;
  weekStart: Date;
};

type CurrentUser = {
  id: string;
  fullName: string;
  userType: string;
  roles: Array<{ role: { code: string; name: string } }>;
  staffProfile: {
    id: string;
    designation: string;
    classTeacherFor: Array<{ id: string; name: string; classId: string; class: { name: string } }>;
  } | null;
  studentProfile: {
    id: string;
    classId: string | null;
    sectionId: string | null;
    class: { name: string } | null;
    section: { name: string } | null;
  } | null;
  parentProfile: {
    id: string;
    students: Array<{
      isPrimary: boolean;
      student: {
        id: string;
        fullName: string;
        classId: string | null;
        sectionId: string | null;
        class: { name: string } | null;
        section: { name: string } | null;
      };
    }>;
  } | null;
};

type PersonalStudent = {
  id: string;
  fullName: string;
  classId: string | null;
  sectionId: string | null;
  class: { name: string } | null;
  section: { name: string } | null;
};

type VisibleNotice = Awaited<ReturnType<typeof getVisibleNotices>>[number];

type OptionalDelegate = {
  count?: (args?: unknown) => Promise<number>;
  findMany?: (args?: unknown) => Promise<unknown[]>;
};

type NumericLike = number | { toString(): string };

type RoleDataParams = {
  context: DashboardContext;
  session: DashboardSession;
  user: CurrentUser;
  visibleNotices: VisibleNotice[];
};

export async function getDashboardOverview(params: { session: DashboardSession }) {
  const { session } = params;
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setUTCHours(23, 59, 59, 999);
  const monthStart = new Date(now);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const sixMonthsStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - 6);
  weekStart.setUTCHours(0, 0, 0, 0);

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: {
      roles: { include: { role: true } },
      staffProfile: {
        include: {
          classTeacherFor: {
            include: { class: true }
          }
        }
      },
      studentProfile: {
        include: {
          class: true,
          section: true
        }
      },
      parentProfile: {
        include: {
          students: {
            include: {
              student: {
                include: {
                  class: true,
                  section: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!user) {
    throw new Error("Dashboard user context could not be resolved.");
  }

  const context: DashboardContext = {
    schoolId: session.schoolId,
    todayStart,
    todayEnd,
    monthStart,
    sixMonthsStart,
    weekStart
  };
  const visibleNotices = await getVisibleNotices(session.schoolId, session.roles, user);
  const role = resolveDashboardRole(session.roles, user);
  const variant = await getDashboardVariant({ role, context, session, user, visibleNotices });

  return {
    user,
    variant,
    visibleNotices
  };
}

export async function getDashboardVariant(params: {
  role: DashboardRoleKey;
  context: DashboardContext;
  session: DashboardSession;
  user: CurrentUser;
  visibleNotices: VisibleNotice[];
}): Promise<DashboardVariant> {
  const { role, context, session, user, visibleNotices } = params;
  const roleParams: RoleDataParams = { context, session, user, visibleNotices };

  switch (role) {
    case "admin":
      return getAdminDashboardData(roleParams);
    case "leadership":
      return getPrincipalDashboardData(roleParams);
    case "teaching":
      return getTeacherDashboardData(roleParams);
    case "finance":
      return getAccountantDashboardData(roleParams);
    case "student":
      return getStudentDashboardData(roleParams);
    case "parent":
      return getParentDashboardData(roleParams);
    case "library":
      return getLibrarianDashboardData(roleParams);
    case "transport":
      return getTransportDashboardData(roleParams);
    case "hostel":
      return getHostelDashboardData(roleParams);
    case "inventory":
      return getHrDashboardData(roleParams);
    case "frontdesk":
      return getFrontDeskDashboardData(roleParams);
    default:
      return getGeneralDashboardData(roleParams);
  }
}

export async function getAdminDashboardData({ context, session, visibleNotices }: RoleDataParams): Promise<DashboardVariant> {
  const [activeStudentCount, activeStaffCount, feeSummary, attendanceRows, collectionRows, teacherCount, accountantCount, adminCount] = await Promise.all([
    db.student.count({ where: { schoolId: context.schoolId, status: { not: "ARCHIVED" } } }),
    db.staff.count({ where: { schoolId: context.schoolId, isArchived: false } }),
    db.feeInvoice.aggregate({ where: { schoolId: context.schoolId }, _sum: { totalAmount: true, paidAmount: true } }),
    db.attendance.findMany({
      where: { schoolId: context.schoolId, date: { gte: context.weekStart, lte: context.todayEnd } },
      select: { date: true, status: true }
    }),
    db.feePayment.findMany({
      where: { schoolId: context.schoolId, paymentDate: { gte: context.sixMonthsStart, lte: context.todayEnd } },
      select: { amount: true, paymentDate: true }
    }),
    db.user.count({ where: { schoolId: context.schoolId, roles: { some: { role: { code: "TEACHER" } } } } }),
    db.user.count({ where: { schoolId: context.schoolId, roles: { some: { role: { code: "ACCOUNTANT" } } } } }),
    db.user.count({ where: { schoolId: context.schoolId, roles: { some: { role: { code: { in: ["ADMIN", "SUPER_ADMIN"] } } } } } })
  ]);

  const totalBilled = Number(feeSummary._sum.totalAmount ?? 0);
  const totalPaid = Number(feeSummary._sum.paidAmount ?? 0);
  const outstanding = Math.max(0, totalBilled - totalPaid);
  const liveAttendanceToday = attendanceRows.filter(
    (row) => row.status === "PRESENT" && row.date >= context.todayStart && row.date <= context.todayEnd
  ).length;
  const importantNoticeCount = visibleNotices.filter((notice) => notice.noticeType === "IMPORTANT").length;
  const alerts = await buildRecentAlerts({
    schoolId: context.schoolId,
    roles: session.roles,
    visibleNotices,
    entityTypes: ["FeePayment", "FeeInvoice", "Attendance", "Notice", "AuditLog"]
  });

  return {
    key: "admin",
    label: "Admin / Super Admin",
    title: "Unified School Governance & Real-Time Operational Intelligence",
    subtitle: "Top-level operational, attendance, and revenue signals for the institution.",
    heroNote: "All cards, charts, and alerts here are built from live database records only.",
    metrics: [
      metric("Total Active Students", activeStudentCount.toString(), "Live active enrolment count.", "Live enrolment", "/dashboard/students", Users, "indigo", {
        ctaLabel: "View Student Registry"
      }),
      metric("Total Staff", activeStaffCount.toString(), "Non-archived staff members in the current school.", "Live staff count", "/dashboard/staff", Briefcase, "slate", {
        ctaLabel: "Open Staff Directory",
        detail: `Teachers ${teacherCount} · Accountants ${accountantCount} · Admins ${adminCount}`
      }),
      metric("Today's Live Attendance", liveAttendanceToday.toString(), "Present attendance rows recorded today.", "Today only", "/dashboard/attendance", CalendarCheck2, "purple", {
        ctaLabel: "View Attendance Records"
      }),
      metric("MTD Revenue vs Outstanding Dues", `${formatCurrency(totalPaid)} / ${formatCurrency(outstanding)}`, "Paid fee amount versus current unpaid dues.", "Invoice-backed", "/dashboard/fees", IndianRupee, "emerald", {
        ctaLabel: "Open Fee Ledger"
      }),
      metric("Active System Alerts", importantNoticeCount.toString(), "Important notices currently visible in the system.", "Notice-backed", "/dashboard/audit", ShieldAlert, "amber", {
        ctaLabel: "Review Activity Feed"
      })
    ],
    actions: [
      action("+ Create Branch/User", "/dashboard/users"),
      action("+ System Config", "/dashboard/settings", Activity, "secondary"),
      action("View Audit Logs", "/dashboard/audit", FileText, "secondary")
    ],
    charts: [
      {
        type: "bars",
        title: "Overall School Attendance Trends",
        subtitle: "Weekly attendance rows grouped from recorded attendance data.",
        href: "/dashboard/attendance",
        ctaLabel: "View Attendance Records",
        points: buildWeeklyAttendanceBars(attendanceRows, context.weekStart)
      },
      {
        type: "financial",
        title: "Monthly Collection Curve",
        subtitle: "Six-month fee collection trend from posted payments.",
        href: "/dashboard/fees",
        ctaLabel: "View Full Analytics",
        points: buildCollectionTrend(collectionRows, context.sixMonthsStart)
      }
    ],
    alerts,
    noticesTitle: "System notices",
    noticesSubtitle: "Published notices visible to the current administrative role set."
  };
}

export async function getPrincipalDashboardData({ context, session, visibleNotices }: RoleDataParams): Promise<DashboardVariant> {
  const [resultRows, subjectCount, activeStaffCount, attendanceToday, staffPresentToday, pendingLeavesCount, teacherCount, accountantCount, adminCount] = await Promise.all([
    db.examResult.findMany({
      where: { exam: { schoolId: context.schoolId } },
      select: { percentage: true, resultStatus: true, student: { select: { class: { select: { name: true } } } } },
      take: 600
    }),
    db.subject.count({ where: { schoolId: context.schoolId } }),
    db.staff.count({ where: { schoolId: context.schoolId, isArchived: false } }),
    db.attendance.findMany({
      where: { schoolId: context.schoolId, date: { gte: context.todayStart, lte: context.todayEnd } },
      select: { status: true }
    }),
    db.attendance.count({
      where: { schoolId: context.schoolId, date: { gte: context.todayStart, lte: context.todayEnd }, status: "PRESENT" }
    }),
    safeOptionalCount("leaveRequest", { where: { schoolId: context.schoolId, status: "PENDING" } }),
    db.user.count({ where: { schoolId: context.schoolId, roles: { some: { role: { code: "TEACHER" } } } } }),
    db.user.count({ where: { schoolId: context.schoolId, roles: { some: { role: { code: "ACCOUNTANT" } } } } }),
    db.user.count({ where: { schoolId: context.schoolId, roles: { some: { role: { code: { in: ["ADMIN", "SUPER_ADMIN"] } } } } } })
  ]);

  const avgPerformance =
    resultRows.length > 0
      ? resultRows.reduce((sum, row) => sum + Number(row.percentage ?? 0), 0) / resultRows.length
      : 0;
  const syllabusProgress = subjectCount
    ? Math.round(
        (new Set(
          resultRows
            .map((row) => row.student.class?.name ?? "")
            .filter(Boolean)
        ).size /
          subjectCount) *
          100
      )
    : 0;
  const liveAttendanceToday = attendanceToday.filter((row) => row.status === "PRESENT").length;
  const alerts = await buildRecentAlerts({
    schoolId: context.schoolId,
    roles: session.roles,
    visibleNotices,
    entityTypes: ["ExamResult", "ExamMark", "Attendance", "LeaveRequest", "Notice"]
  });

  return {
    key: "leadership",
    label: "Principal / Director / Academic Head",
    title: "Academic Performance & Readiness Command Desk",
    subtitle: "Leadership-facing education analytics and academic operations built from real school records.",
    heroNote: "Only academic, attendance, and published-notice data visible to leadership is rendered here.",
    metrics: [
      metric("Average School Performance %", `${avgPerformance.toFixed(1)}%`, "Average published exam percentage.", "Result-backed", "/dashboard/reports", GraduationCap, "purple", {
        ctaLabel: "View Academic Reports"
      }),
      metric("Syllabus Progress Tracker", `${syllabusProgress}%`, "Progress derived only from recorded academic coverage signals.", "Live academic coverage", "/dashboard/reports", ClipboardList, "emerald", {
        ctaLabel: "View Progress Analytics"
      }),
      metric("Total Staff", activeStaffCount.toString(), "Staff strength under leadership visibility.", `${staffPresentToday} present today`, "/dashboard/staff", Briefcase, "indigo", {
        ctaLabel: "Open Staff Directory",
        detail: `Teachers ${teacherCount} · Accountants ${accountantCount} · Admins ${adminCount}`
      }),
      metric("Today's Live Attendance", liveAttendanceToday.toString(), "Present attendance rows recorded today.", "Attendance-backed", "/dashboard/attendance", CalendarCheck2, "slate", {
        ctaLabel: "View Attendance Records"
      }),
      metric("Active Complaints/Grievances", pendingLeavesCount.toString(), "Pending leave or review records requiring leadership action.", "Review queue", "/dashboard/leaves", BellRing, "amber", {
        ctaLabel: "Review Requests"
      })
    ],
    actions: [
      action("+ Post Announcement", "/dashboard/notices"),
      action("Review Lesson Plans", "/dashboard/reports", ClipboardList, "secondary"),
      action("Approve Leaves", "/dashboard/leaves", BellRing, "secondary")
    ],
    charts: [
      {
        type: "bars",
        title: "Class-wise Academic Pass Percentage",
        subtitle: "Pass percentage computed from recorded exam results by class.",
        href: "/dashboard/reports",
        ctaLabel: "View Full Analytics",
        points: buildClassPassChart(resultRows)
      },
      {
        type: "compare",
        title: "Student-Staff Attendance Ratio",
        subtitle: "Today’s attendance-based student and staff readiness comparison.",
        href: "/dashboard/attendance",
        ctaLabel: "View Attendance Records",
        points: [
          { label: "Students present", value: liveAttendanceToday, meta: "Recorded today" },
          { label: "Staff present", value: staffPresentToday, meta: "Recorded today" }
        ]
      }
    ],
    alerts,
    noticesTitle: "Leadership notices",
    noticesSubtitle: "Important communications and recent academic operations visible to leadership."
  };
}

export async function getTeacherDashboardData({ context, session, user, visibleNotices }: RoleDataParams): Promise<DashboardVariant> {
  const assignedSections = user.staffProfile?.classTeacherFor ?? [];
  const studentFilter =
    assignedSections.length > 0
      ? {
          schoolId: context.schoolId,
          OR: assignedSections.map((section) => ({
            classId: section.classId,
            sectionId: section.id
          }))
        }
      : null;

  const [students, attendanceToday, pendingMarks] = await Promise.all([
    studentFilter
      ? db.student.findMany({
          where: studentFilter,
          select: { id: true, class: { select: { name: true } } }
        })
      : Promise.resolve([]),
    studentFilter
      ? db.attendance.findMany({
          where: {
            schoolId: context.schoolId,
            date: { gte: context.todayStart, lte: context.todayEnd },
            student: studentFilter
          },
          select: { studentId: true }
        })
      : Promise.resolve([]),
    studentFilter
      ? db.examMark.count({
          where: {
            exam: { schoolId: context.schoolId },
            student: studentFilter,
            remarks: null
          }
        })
      : Promise.resolve(0)
  ]);

  const markedStudentIds = new Set(attendanceToday.map((row) => row.studentId));
  const classNames = assignedSections.map((section) => `${section.class.name}-${section.name}`).join(", ");
  const alerts = await buildRecentAlerts({
    schoolId: context.schoolId,
    roles: session.roles,
    visibleNotices,
    entityTypes: ["Attendance", "ExamMark", "ExamResult", "Notice"]
  });

  return {
    key: "teaching",
    label: "Teacher / HOD / Instructor",
    title: "Classroom Operations Hub",
    subtitle: "Only live class-linked attendance, grading, and teaching surfaces are rendered here.",
    heroNote: "Global finance, audit, and administrative statistics are withheld from teacher-facing dashboards.",
    metrics: [
      metric("My Classes Today", assignedSections.length.toString(), assignedSections.length ? classNames : "No class-teacher sections are linked to this profile.", "Live mapping", "/dashboard/attendance", CalendarCheck2, "indigo", {
        ctaLabel: "Open Attendance Desk"
      }),
      metric("Unmarked Class Attendance", Math.max(0, students.length - markedStudentIds.size).toString(), "Students still missing attendance marks for today.", "Today only", "/dashboard/attendance", ClipboardList, "amber", {
        ctaLabel: "View Attendance Records"
      }),
      metric("Pending Assignments to Grade", pendingMarks.toString(), "Exam marks with unresolved grading remarks in linked classes.", "Result-backed", "/dashboard/exams", FileBadge2, "rose", {
        ctaLabel: "Open Exam Records"
      }),
      metric("My Timetable Overview", `${assignedSections.length} section(s)`, assignedSections.length ? `Current spread: ${assignedSections.map((section) => section.name).join(", ")}` : "No timetable-linked sections found for this staff profile.", "Section-backed", "/dashboard/attendance", CalendarClock, "purple", {
        ctaLabel: "View Class Schedule"
      })
    ],
    actions: [
      action("+ Mark Attendance", "/dashboard/attendance"),
      action("+ Create Homework/Test", "/dashboard/exams"),
      action("+ Publish Internal Marks", "/dashboard/exams", GraduationCap, "secondary")
    ],
    charts: [
      {
        type: "compare",
        title: "Academic Pass Rate & Attendance Trends",
        subtitle: "Teacher-scope counts from linked classes only.",
        href: "/dashboard/exams",
        ctaLabel: "View Records",
        points: [
          { label: "Linked students", value: students.length, meta: "Class-linked learners" },
          { label: "Marked today", value: markedStudentIds.size, meta: "Attendance records posted" },
          { label: "Pending grading", value: pendingMarks, meta: "Open marks queue" }
        ]
      }
    ],
    alerts,
    noticesTitle: "Classroom notices",
    noticesSubtitle: "Teacher-visible announcements and recent classroom activity."
  };
}

export async function getAccountantDashboardData({ context, session, visibleNotices }: RoleDataParams): Promise<DashboardVariant> {
  const [todayPayments, monthPayments, overdueInvoices, expenseVouchers] = await Promise.all([
    db.feePayment.findMany({
      where: { schoolId: context.schoolId, paymentDate: { gte: context.todayStart, lte: context.todayEnd } },
      select: { amount: true, paymentMode: true, paymentDate: true }
    }),
    db.feePayment.findMany({
      where: { schoolId: context.schoolId, paymentDate: { gte: context.monthStart, lte: context.todayEnd } },
      select: { amount: true, paymentDate: true }
    }),
    db.feeInvoice.count({
      where: {
        schoolId: context.schoolId,
        dueDate: { lt: context.todayStart },
        status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] }
      }
    }),
    safeOptionalFindMany<{ status: string; amount: number; expenseDate: Date }>("expenseVoucher", {
      where: { schoolId: context.schoolId },
      select: { status: true, amount: true, expenseDate: true }
    })
  ]);

  const feesCollectedToday = todayPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalMTDCollection = monthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const pendingClearance = 0;
  const alerts = await buildRecentAlerts({
    schoolId: context.schoolId,
    roles: session.roles,
    visibleNotices,
    entityTypes: ["FeePayment", "FeeInvoice", "ExpenseVoucher", "PayrollRun"]
  });

  return {
    key: "finance",
    label: "Accountant / Cashier / Finance Head",
    title: "Financial Collections & Liability Pulse",
    subtitle: "Commerce-only visibility for fees, outstanding dues, and approved finance operations.",
    heroNote: "No academic, lesson, or school-wide audit statistics are shown in this role scope.",
    metrics: [
      metric("Fees Collected Today", formatCurrency(feesCollectedToday), "Confirmed same-day fee receipts.", "Cash desk ledger", "/dashboard/fees", Banknote, "emerald", {
        ctaLabel: "Open Fee Collections"
      }),
      metric("Total MTD Collection", formatCurrency(totalMTDCollection), "Month-to-date confirmed fee collection.", "Receipt-backed", "/dashboard/fees", IndianRupee, "indigo", {
        ctaLabel: "Open Fee Ledger"
      }),
      metric("Total Cheques/Online Pending Clearance", pendingClearance.toString(), "No settlement clearance model is configured yet, so no pending count is inferred.", "Model not configured", "/dashboard/accounts", WalletCards, "amber", {
        ctaLabel: "View Reconciliation"
      }),
      metric("Total Active Defaulters Count", overdueInvoices.toString(), "Overdue student invoices with unpaid balance.", "Due-date aware", "/dashboard/fees", ShieldAlert, "rose", {
        ctaLabel: "Review Defaulters"
      })
    ],
    actions: [
      action("+ Collect Cash Fee", "/dashboard/fees"),
      action("+ Generate Invoice", "/dashboard/fees"),
      action("+ Record Vendor Expense", "/dashboard/accounts", FileText, "secondary"),
      action("Export Tax Ledger", "/dashboard/accounts", ClipboardList, "secondary")
    ],
    charts: [
      {
        type: "financial",
        title: "Fee Collection Trend vs Target Budget",
        subtitle: "Monthly fee payment curve from recorded collections and billed invoices.",
        href: "/dashboard/fees",
        ctaLabel: "View Full Analytics",
        points: buildFinancialTargetTrend(
          await db.feeInvoice.findMany({
            where: { schoolId: context.schoolId, dueDate: { gte: context.sixMonthsStart, lte: context.todayEnd } },
            select: { totalAmount: true, dueDate: true }
          }),
          monthPayments,
          context.sixMonthsStart
        )
      }
    ],
    alerts,
    noticesTitle: "Finance notices",
    noticesSubtitle: "Finance-visible notices and recent ledger-side activity."
  };
}

export async function getStudentDashboardData(params: RoleDataParams): Promise<DashboardVariant> {
  const portal = await getStudentPortalData(params.session);
  const student = portal.student;
  const attendancePct = portal.attendanceSummary?.attendancePct ?? 0;
  const totalInvoiced = portal.feeSummary?.totalInvoiced ?? 0;
  const totalPaid = portal.feeSummary?.totalPaid ?? 0;
  const alerts = await buildRecentAlerts({
    schoolId: params.context.schoolId,
    roles: params.session.roles,
    visibleNotices: params.visibleNotices,
    entityTypes: ["Notice", "ExamResult", "Document"]
  });

  return {
    key: "student",
    label: "Student",
    title: "My Learning Dashboard",
    subtitle: "Only your linked attendance, fee, result, and document data is shown here.",
    heroNote: student ? `Linked student profile: ${student.fullName}` : "This login needs a linked student admission profile before learner data can appear.",
    metrics: [
      metric("My Attendance Overall %", `${attendancePct}%`, student ? `Attendance for ${student.fullName}.` : "Student profile is not linked to this login yet.", "Own records", "/dashboard/student-portal", CalendarCheck2, "indigo"),
      metric("My Current Pending Fees/Dues", portal.feeSummary?.totalDueLabel ?? formatCurrency(0), "Outstanding amount across your invoices.", "Invoice-backed", "/dashboard/student-portal", IndianRupee, "amber"),
      metric("My Upcoming Exams", String(portal.upcomingExams.length), student?.class?.name ? `Future exams for ${student.class.name}.` : "No class-linked upcoming exams found.", "Scheduled exams", "/dashboard/student-portal", GraduationCap, "emerald"),
      metric("My Documents", String(portal.documents.length), "Recent files linked to your account or student profile.", "Document-backed", "/dashboard/student-portal", FileText, "purple")
    ],
    actions: [
      action("View My Portal", "/dashboard/student-portal"),
      action("Open My Documents", "/dashboard/student-portal", FileText, "secondary"),
      action("View Results", "/dashboard/student-portal", FileBadge2, "secondary")
    ],
    charts: [
      {
        type: "progress",
        title: "Syllabus Progress Tracker",
        subtitle: "Own attendance and fee completion snapshot from live records.",
        href: "/dashboard/student-portal",
        ctaLabel: "View Records",
        value: attendancePct,
        hint: student ? `Current overview for ${student.fullName}.` : "No linked student profile found.",
        segments: [
          { label: "Attendance", value: attendancePct, tone: "indigo" },
          { label: "Fee paid", value: totalInvoiced ? Math.round((totalPaid / totalInvoiced) * 100) : 0, tone: "emerald" }
        ]
      },
      {
        type: "countdown",
        title: "Weekly Timetable & Exam Countdown Grid",
        subtitle: "Upcoming exam schedule from your class records.",
        href: "/dashboard/student-portal",
        ctaLabel: "View Progress",
        items: portal.upcomingExams.map((exam) => ({
          label: exam.name,
          value: `${daysUntil(exam.startDate, params.context.todayStart)} day(s)`,
          meta: exam.examType ?? exam.startDate.toLocaleDateString("en-IN")
        }))
      }
    ],
    alerts,
    noticesTitle: "My notices",
    noticesSubtitle: "Notices visible to your role, class, and section."
  };
}

export async function getParentDashboardData(params: RoleDataParams): Promise<DashboardVariant> {
  const portal = await getParentPortalData(params.session);
  const primaryChild = portal.childSummaries[0] ?? null;
  const alerts = await buildRecentAlerts({
    schoolId: params.context.schoolId,
    roles: params.session.roles,
    visibleNotices: params.visibleNotices,
    entityTypes: ["Notice", "ExamResult", "Document"]
  });

  return {
    key: "parent",
    label: "Parent",
    title: "Ward Progress & Fee Dashboard",
    subtitle: "Only linked child attendance, fees, results, documents, and notices appear here.",
    heroNote: portal.children.length ? `${portal.children.length} linked child profile(s) found for this login.` : "No child is linked to this parent login yet.",
    metrics: [
      metric("Linked Children", String(portal.children.length), "Children linked through parent-child records.", "Parent linkage", "/dashboard/parent-portal", Users, "indigo"),
      metric("Primary Child Attendance %", `${primaryChild?.attendancePct ?? 0}%`, primaryChild ? `Attendance for ${primaryChild.student.fullName}.` : "No linked child found.", "Attendance-backed", "/dashboard/parent-portal", CalendarCheck2, "emerald"),
      metric("Primary Child Pending Fees", primaryChild?.totalDueLabel ?? formatCurrency(0), "Current outstanding amount for the primary child.", "Invoice-backed", "/dashboard/parent-portal", IndianRupee, "amber"),
      metric("Recent Results Available", String(portal.childSummaries.filter((entry) => entry.latestResult).length), "Children with at least one saved exam result.", "Result-backed", "/dashboard/parent-portal", GraduationCap, "purple")
    ],
    actions: [
      action("View Child Dashboard", "/dashboard/parent-portal"),
      action("Open Fee Summary", "/dashboard/parent-portal", IndianRupee, "secondary"),
      action("View Report Card / Progress", "/dashboard/parent-portal", FileBadge2, "secondary")
    ],
    charts: [
      {
        type: "countdown",
        title: "Child Snapshot Grid",
        subtitle: "Per-child attendance and fee status from linked ward records.",
        href: "/dashboard/parent-portal",
        ctaLabel: "View Child Records",
        items: portal.childSummaries.map((entry) => ({
          label: entry.student.fullName,
          value: `${entry.attendancePct}%`,
          meta: `${entry.totalDueLabel} due`
        }))
      }
    ],
    alerts,
    noticesTitle: "Parent notices",
    noticesSubtitle: "Notices visible to parents and linked children."
  };
}

export async function getLibrarianDashboardData({ context, session, visibleNotices }: RoleDataParams): Promise<DashboardVariant> {
  const [books, issuesToday, overdueBooks, recentFines] = await Promise.all([
    safeOptionalCount("libraryBook", { where: { schoolId: context.schoolId, isArchived: false } }),
    safeOptionalCount("libraryIssue", { where: { schoolId: context.schoolId, issueDate: { gte: context.todayStart, lte: context.todayEnd } } }),
    safeOptionalCount("libraryIssue", { where: { schoolId: context.schoolId, status: LibraryIssueStatus.ISSUED, dueDate: { lt: context.todayStart } } }),
    safeOptionalFindMany<{ fineAmount: number }>("libraryIssue", {
      where: { schoolId: context.schoolId, returnedAt: { gte: context.monthStart, lte: context.todayEnd } },
      select: { fineAmount: true }
    })
  ]);

  const fineCollected = recentFines.reduce((sum, issue) => sum + Number(issue.fineAmount ?? 0), 0);
  const alerts = await buildRecentAlerts({
    schoolId: context.schoolId,
    roles: session.roles,
    visibleNotices,
    entityTypes: ["LibraryIssue", "LibraryBook", "Notice"]
  });

  return {
    key: "library",
    label: "Librarian / Media Center Manager",
    title: "Library Resource & Circulation Desk",
    subtitle: "Only catalogue and circulation data backed by real library records is rendered here.",
    heroNote: "No school-wide finance, academic, or administrative data is exposed in this role view.",
    metrics: [
      metric("Total Books in Library", books.toString(), "Active catalogue records.", "Catalogue-backed", "/dashboard/library", Library, "indigo"),
      metric("Books Issued Today", issuesToday.toString(), "Same-day circulation records.", "Today only", "/dashboard/library", BookOpenCheck, "emerald"),
      metric("Overdue Books Counter", overdueBooks.toString(), "Active issues past their due date.", "Due-date aware", "/dashboard/library", ShieldAlert, "amber"),
      metric("Fine Collected This Month", formatCurrency(fineCollected), "Library fine amounts returned this month.", "Return-backed", "/dashboard/library", IndianRupee, "rose")
    ],
    actions: [
      action("+ Issue / Return Book", "/dashboard/library"),
      action("+ Catalog New Title", "/dashboard/library", Library, "secondary"),
      action("Scan Member Barcode", "/dashboard/library", Activity, "secondary")
    ],
    charts: [
      {
        type: "compare",
        title: "Circulation Summary",
        subtitle: "Live circulation counters from real issue records.",
        href: "/dashboard/library",
        ctaLabel: "View Records",
        points: [
          { label: "Catalogue", value: books, meta: "Active books" },
          { label: "Issued today", value: issuesToday, meta: "Today only" },
          { label: "Overdue", value: overdueBooks, meta: "Still active" }
        ]
      }
    ],
    alerts,
    noticesTitle: "Library notices",
    noticesSubtitle: "Library-visible notices and recent circulation activity."
  };
}

export async function getTransportDashboardData({ context, session, visibleNotices }: RoleDataParams): Promise<DashboardVariant> {
  const [vehicles, routes, assignments] = await Promise.all([
    safeOptionalFindMany<{ insuranceValidUntil: Date | null; fitnessValidUntil: Date | null; isActive: boolean }>("transportVehicle", {
      where: { schoolId: context.schoolId, isArchived: false },
      select: { insuranceValidUntil: true, fitnessValidUntil: true, isActive: true }
    }),
    safeOptionalCount("transportRoute", { where: { schoolId: context.schoolId, isArchived: false, isActive: true } }),
    safeOptionalCount("transportAssignment", { where: { schoolId: context.schoolId, status: "ACTIVE" } })
  ]);

  const activeBuses = vehicles.filter((vehicle) => vehicle.isActive).length;
  const maintenanceAlerts = vehicles.filter(
    (vehicle) =>
      vehicle.isActive &&
      ((vehicle.insuranceValidUntil && vehicle.insuranceValidUntil < context.todayEnd) ||
        (vehicle.fitnessValidUntil && vehicle.fitnessValidUntil < context.todayEnd))
  ).length;
  const alerts = await buildRecentAlerts({
    schoolId: context.schoolId,
    roles: session.roles,
    visibleNotices,
    entityTypes: ["TransportAssignment", "TransportRoute", "TransportVehicle", "Notice"]
  });

  return {
    key: "transport",
    label: "Transport Manager / Driver Coordinator",
    title: "Transport Route & Fleet Watchdesk",
    subtitle: "Route, assignment, and compliance signals from the transport module only.",
    heroNote: "Unavailable transport submodules are left empty instead of being estimated from other ERP records.",
    metrics: [
      metric("Active Buses/Routes On Road", `${activeBuses} / ${routes}`, "Active vehicles against active routes.", "Transport-backed", "/dashboard/transport", BusFront, "indigo"),
      metric("Total Transport Enrolled Students", assignments.toString(), "Students with active transport assignments.", "Assignment-backed", "/dashboard/transport", Users, "emerald"),
      metric("Fuel Log Status", "0 pending", "No dedicated fuel-log model is configured yet.", "Model not configured", "/dashboard/transport", Activity, "amber"),
      metric("Maintenance Alerts Due", maintenanceAlerts.toString(), "Vehicles with overdue insurance or fitness validity.", "Compliance-backed", "/dashboard/transport", ShieldAlert, "rose")
    ],
    actions: [
      action("+ Update Route Status", "/dashboard/transport"),
      action("Broadcast Route Delay Alert", "/dashboard/notices", Megaphone, "secondary"),
      action("Live GPS Tracking", "/dashboard/transport", Activity, "secondary")
    ],
    charts: [
      {
        type: "compare",
        title: "Fleet & Dispatch Snapshot",
        subtitle: "Current transport totals from real route and assignment records.",
        href: "/dashboard/transport",
        ctaLabel: "View Records",
        points: [
          { label: "Active buses", value: activeBuses, meta: "Vehicle records" },
          { label: "Active routes", value: routes, meta: "Route records" },
          { label: "Assigned students", value: assignments, meta: "Assignment records" }
        ]
      }
    ],
    alerts,
    noticesTitle: "Transport notices",
    noticesSubtitle: "Transport-visible notices and recent fleet activity."
  };
}

export async function getHostelDashboardData({ context, session, visibleNotices }: RoleDataParams): Promise<DashboardVariant> {
  const [rooms, allocations, messNotices] = await Promise.all([
    safeOptionalFindMany<{ capacity: number }>("hostelRoom", {
      where: { schoolId: context.schoolId, isArchived: false, isActive: true },
      select: { capacity: true }
    }),
    safeOptionalCount("hostelAllocation", { where: { schoolId: context.schoolId, status: "ACTIVE" } }),
    db.notice.findMany({
      where: { schoolId: context.schoolId, isPublished: true, title: { contains: "mess" } },
      orderBy: { publishedAt: "desc" },
      take: 1
    })
  ]);

  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const occupancyRate = totalCapacity ? Math.round((allocations / totalCapacity) * 100) : 0;
  const messMenuNotice = messNotices[0]?.title ?? "No update";
  const alerts = await buildRecentAlerts({
    schoolId: context.schoolId,
    roles: session.roles,
    visibleNotices,
    entityTypes: ["HostelAllocation", "HostelRoom", "Notice"]
  });

  return {
    key: "hostel",
    label: "Hostel Warden / Residential In-charge",
    title: "Residential Occupancy & Welfare Hub",
    subtitle: "Only hostel allocations, room capacity, and published residential communications are shown.",
    heroNote: "Unavailable welfare submodules stay empty instead of being guessed from unrelated fields.",
    metrics: [
      metric("Total Boarders Checked In", allocations.toString(), "Students with active hostel allocations.", "Allocation-backed", "/dashboard/hostel", Users, "indigo"),
      metric("Room Occupancy Rate", `${occupancyRate}%`, "Active allocations versus total configured room capacity.", "Capacity-backed", "/dashboard/hostel", LayoutGrid, "emerald"),
      metric("Mess Menu Today", messMenuNotice, "Latest published mess/menu notice if one exists.", "Notice-backed", "/dashboard/hostel", ClipboardList, "amber"),
      metric("Sick Bay / Medical Incidents Today", "0", "No dedicated hostel medical incident model is configured yet.", "Model not configured", "/dashboard/hostel", Stethoscope, "rose")
    ],
    actions: [
      action("+ Mark Room Night-Attendance", "/dashboard/hostel"),
      action("+ Log Mess Feedback", "/dashboard/hostel", ClipboardList, "secondary"),
      action("+ Gate Pass Authorization", "/dashboard/hostel", FileText, "secondary")
    ],
    charts: [
      {
        type: "compare",
        title: "Hostel Occupancy Snapshot",
        subtitle: "Residential capacity from real room and allocation records.",
        href: "/dashboard/hostel",
        ctaLabel: "View Records",
        points: [
          { label: "Rooms", value: rooms.length, meta: "Configured active rooms" },
          { label: "Boarders", value: allocations, meta: "Active allocations" },
          { label: "Occupancy", value: occupancyRate, meta: "Percent used" }
        ],
        suffix: rooms.length || allocations ? "%" : ""
      }
    ],
    alerts,
    noticesTitle: "Residential notices",
    noticesSubtitle: "Residential announcements and recent hostel activity."
  };
}

export async function getHrDashboardData({ context, session, visibleNotices }: RoleDataParams): Promise<DashboardVariant> {
  const [items, stockOutMovements] = await Promise.all([
    safeOptionalFindMany<{ category: string | null; quantityOnHand: number; minimumQuantity: number }>("inventoryItem", {
      where: { schoolId: context.schoolId, isArchived: false },
      select: { category: true, quantityOnHand: true, minimumQuantity: true }
    }),
    safeOptionalFindMany<{ issuedTo: string | null; movementDate: Date }>("inventoryMovement", {
      where: {
        schoolId: context.schoolId,
        movementType: "STOCK_OUT",
        movementDate: { gte: context.monthStart, lte: context.todayEnd }
      },
      select: { issuedTo: true, movementDate: true }
    })
  ]);

  const lowStockCount = items.filter((item) => item.quantityOnHand <= item.minimumQuantity).length;
  const uniformsAndBooks = items.filter((item) => ["uniform", "book"].includes((item.category ?? "").toLowerCase())).length;
  const assetsIssuedToStaff = stockOutMovements.filter((movement) => Boolean(movement.issuedTo)).length;
  const alerts = await buildRecentAlerts({
    schoolId: context.schoolId,
    roles: session.roles,
    visibleNotices,
    entityTypes: ["InventoryItem", "InventoryMovement", "Notice"]
  });

  return {
    key: "inventory",
    label: "Inventory / Stores / Procurement Manager",
    title: "Stock Movement & Procurement Pressure Board",
    subtitle: "Only inventory-backed stock, issue, and reorder signals are shown here.",
    heroNote: "Missing procurement models are left empty instead of being derived from unrelated module data.",
    metrics: [
      metric("Low Stock Alerts", lowStockCount.toString(), "Items at or below reorder threshold.", "Inventory-backed", "/dashboard/inventory", Warehouse, "amber"),
      metric("Total Purchase Orders Pending", "0", "No purchase-order model is configured yet.", "Model not configured", "/dashboard/inventory", FileClock, "rose"),
      metric("Assets Issued to Staff", assetsIssuedToStaff.toString(), "Month-to-date stock-out movements with recipients.", "Movement-backed", "/dashboard/inventory", Boxes, "indigo"),
      metric("Uniforms/Books Inventory Count", uniformsAndBooks.toString(), "Inventory items in uniform or book-related categories.", "Category-backed", "/dashboard/inventory", BookType, "emerald")
    ],
    actions: [
      action("+ Record New Stock Entry", "/dashboard/inventory"),
      action("+ Issue Asset Item", "/dashboard/inventory", Boxes, "secondary"),
      action("Create Vendor PO", "/dashboard/inventory", FileText, "secondary")
    ],
    charts: [
      {
        type: "compare",
        title: "Inventory Pressure Snapshot",
        subtitle: "Current inventory counts from live stock records.",
        href: "/dashboard/inventory",
        ctaLabel: "View Records",
        points: [
          { label: "Tracked items", value: items.length, meta: "Active inventory records" },
          { label: "Low stock", value: lowStockCount, meta: "At/below threshold" },
          { label: "Issued this month", value: assetsIssuedToStaff, meta: "Movement-backed" }
        ]
      }
    ],
    alerts,
    noticesTitle: "Stores notices",
    noticesSubtitle: "Stores/procurement notices and recent inventory activity."
  };
}

export async function getFrontDeskDashboardData({ context, session, visibleNotices }: RoleDataParams): Promise<DashboardVariant> {
  const schoolDocuments = await db.document.count({ where: { schoolId: context.schoolId, ownerType: "SCHOOL", isArchived: false } });
  const alerts = await buildRecentAlerts({
    schoolId: context.schoolId,
    roles: session.roles,
    visibleNotices,
    entityTypes: ["Document", "Notice", "Student"]
  });

  return {
    key: "frontdesk",
    label: "Front Desk / Reception / Admission Counselor",
    title: "Reception & Intake Navigation Desk",
    subtitle: "Only records actually present in the database are shown; unconfigured desk modules remain empty.",
    heroNote: "Visitor meeting and admission lead metrics stay at zero until dedicated models are available.",
    metrics: [
      metric("Today's Scheduled Visitor Meetings", "0", "No visitor meeting model is configured yet.", "Model not configured", "/dashboard/students", CalendarClock, "indigo"),
      metric("New Admission Inquiries Received", "0", "No dedicated admission inquiry model is configured yet.", "Model not configured", "/dashboard/students", Users, "emerald"),
      metric("General Courier/Inward Docs Pending", schoolDocuments.toString(), "Active school-owned document records pending desk review.", "Document-backed", "/dashboard/documents", FileText, "amber")
    ],
    actions: [
      action("+ Log New Visitor", "/dashboard/students"),
      action("+ Add Admission Lead", "/dashboard/students"),
      action("Quick Search Student Profile", "/dashboard/students", Users, "secondary")
    ],
    charts: [
      {
        type: "compare",
        title: "Desk Operations Snapshot",
        subtitle: "Only configured front-desk related records are shown.",
        href: "/dashboard/documents",
        ctaLabel: "View Records",
        points: [
          { label: "Visitor meetings", value: 0, meta: "Model not configured" },
          { label: "Admission leads", value: 0, meta: "Model not configured" },
          { label: "School docs", value: schoolDocuments, meta: "Document-backed" }
        ]
      }
    ],
    alerts,
    noticesTitle: "Front desk notices",
    noticesSubtitle: "Desk-visible notices and recent document-side activity."
  };
}

async function getGeneralDashboardData({ context, session, visibleNotices }: RoleDataParams): Promise<DashboardVariant> {
  const [documents, todayAttendance, results] = await Promise.all([
    session.permissions.includes(PERMISSIONS.viewDocuments)
      ? db.document.count({ where: { schoolId: context.schoolId, isArchived: false } })
      : Promise.resolve(0),
    session.permissions.includes(PERMISSIONS.viewAttendance)
      ? db.attendance.count({ where: { schoolId: context.schoolId, date: { gte: context.todayStart, lte: context.todayEnd } } })
      : Promise.resolve(0),
    session.permissions.includes(PERMISSIONS.viewExams)
      ? db.examResult.count({ where: { exam: { schoolId: context.schoolId } } })
      : Promise.resolve(0)
  ]);
  const alerts = await buildRecentAlerts({
    schoolId: context.schoolId,
    roles: session.roles,
    visibleNotices,
    entityTypes: ["Notice", "Document", "Attendance", "ExamResult"]
  });

  return {
    key: "general",
    label: "General Dashboard Profile",
    title: "Permission-Scoped Dashboard",
    subtitle: "Fallback dashboard using only data allowed by the current live permission set.",
    heroNote: "No academic, finance, or administrative cards are estimated when the role bundle does not map to a richer dashboard.",
    metrics: [
      metric("Accessible Notices", visibleNotices.length.toString(), "Published notices visible to this account.", "Role-filtered", "/dashboard", BellRing, "indigo"),
      metric("Documents Visible", documents.toString(), "Active document records allowed by current permissions.", "Permission-backed", "/dashboard/documents", FileText, "emerald"),
      metric("Attendance Rows Today", todayAttendance.toString(), "Attendance rows visible under current permissions.", "Permission-backed", "/dashboard/attendance", CalendarCheck2, "amber"),
      metric("Results Available", results.toString(), "Exam results visible under current permissions.", "Permission-backed", "/dashboard/exams", GraduationCap, "slate")
    ],
    actions: [action("Open Notice Center", "/dashboard/notices"), action("Open Documents", "/dashboard/documents", FileText, "secondary")],
    charts: [],
    alerts,
    noticesTitle: "General notices",
    noticesSubtitle: "Role-filtered notices and recent permission-backed activity."
  };
}

function getOptionalDelegate(modelName: string): OptionalDelegate | null {
  const delegate = (db as unknown as Record<string, unknown>)[modelName];
  if (!delegate || typeof delegate !== "object") {
    return null;
  }

  return delegate as OptionalDelegate;
}

async function safeOptionalCount(modelName: string, args?: unknown) {
  const delegate = getOptionalDelegate(modelName);
  if (!delegate?.count) {
    return 0;
  }

  return delegate.count(args);
}

async function safeOptionalFindMany<T>(modelName: string, args?: unknown): Promise<T[]> {
  const delegate = getOptionalDelegate(modelName);
  if (!delegate?.findMany) {
    return [];
  }

  return (await delegate.findMany(args)) as T[];
}

const ROLE_ALIASES: Record<DashboardRoleKey, string[]> = {
  admin: ["ADMIN", "SUPER_ADMIN"],
  leadership: ["PRINCIPAL", "DIRECTOR", "ACADEMIC_HEAD"],
  teaching: ["TEACHER", "HOD", "INSTRUCTOR"],
  finance: ["ACCOUNTANT", "CASHIER", "FINANCE_HEAD"],
  student: ["STUDENT"],
  parent: ["PARENT"],
  library: ["LIBRARIAN", "MEDIA_CENTER_MANAGER"],
  transport: ["TRANSPORT_MANAGER", "DRIVER_COORDINATOR"],
  hostel: ["HOSTEL_WARDEN", "RESIDENTIAL_IN_CHARGE"],
  inventory: ["INVENTORY", "STORES", "PROCUREMENT_MANAGER", "INVENTORY_MANAGER"],
  frontdesk: ["FRONT_DESK", "RECEPTIONIST", "ADMISSION_COUNSELOR"],
  general: []
};

async function getVisibleNotices(schoolId: string, roles: string[], user: CurrentUser) {
  const classIds = Array.from(
    new Set(
      [
        user.studentProfile?.classId,
        ...((user.parentProfile?.students ?? []).map((entry) => entry.student.classId))
      ].filter(Boolean)
    )
  ) as string[];
  const sectionIds = Array.from(
    new Set(
      [
        user.studentProfile?.sectionId,
        ...((user.parentProfile?.students ?? []).map((entry) => entry.student.sectionId))
      ].filter(Boolean)
    )
  ) as string[];
  const notices = await db.notice.findMany({
    where: { schoolId, isPublished: true },
    orderBy: [{ noticeType: "desc" }, { publishedAt: "desc" }],
    take: 12
  });

  return notices
    .filter((notice) =>
      isNoticeVisibleToSession(notice, roles, {
        classIds,
        sectionIds,
        includeStudents: roles.includes("STUDENT"),
        includeParents: roles.includes("PARENT")
      })
    )
    .sort((left, right) => {
      if (left.noticeType === right.noticeType) {
        return (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0);
      }

      return left.noticeType === "IMPORTANT" ? -1 : 1;
    });
}

function resolveDashboardRole(sessionRoles: string[], user: CurrentUser): DashboardRoleKey {
  const candidates = new Set<string>();

  for (const role of sessionRoles) {
    candidates.add(normalizeRoleToken(role));
  }

  for (const entry of user.roles) {
    candidates.add(normalizeRoleToken(entry.role.code));
    candidates.add(normalizeRoleToken(entry.role.name));
  }

  if (user.staffProfile?.designation) {
    candidates.add(normalizeRoleToken(user.staffProfile.designation));
  }

  const orderedRoles: DashboardRoleKey[] = [
    "admin",
    "leadership",
    "finance",
    "teaching",
    "student",
    "parent",
    "library",
    "transport",
    "hostel",
    "inventory",
    "frontdesk"
  ];

  for (const role of orderedRoles) {
    if (ROLE_ALIASES[role].some((alias) => candidates.has(alias))) {
      return role;
    }
  }

  return "general";
}

function normalizeRoleToken(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .toUpperCase();
}

async function buildRecentAlerts(params: {
  schoolId: string;
  roles: string[];
  visibleNotices: VisibleNotice[];
  entityTypes: string[];
}): Promise<AlertItemData[]> {
  const { schoolId, roles, visibleNotices, entityTypes } = params;

  const auditLogs = await db.auditLog.findMany({
    where: { schoolId, entityType: { in: entityTypes } },
    orderBy: { createdAt: "desc" },
    take: 6
  });

  const noticeAlerts = visibleNotices.slice(0, 2).map((notice) => ({
    time: notice.publishedAt ? formatAlertTime(notice.publishedAt) : "Published",
    title: notice.title,
    detail: notice.body,
    tone: notice.noticeType === "IMPORTANT" ? "rose" : "indigo"
  })) satisfies AlertItemData[];

  const auditAlerts = auditLogs.map((log) => ({
    time: formatAlertTime(log.createdAt),
    title: `${humanizeToken(log.entityType)} update`,
    detail: `${humanizeToken(log.action)} recorded for ${humanizeToken(log.entityType)}.`,
    tone: toneForEntityType(log.entityType, roles)
  })) satisfies AlertItemData[];

  const combined = [...noticeAlerts, ...auditAlerts]
    .filter((item, index, array) => array.findIndex((entry) => `${entry.time}:${entry.title}` === `${item.time}:${item.title}`) === index)
    .slice(0, 6);

  if (combined.length) {
    return combined;
  }

  return [];
}

function toneForEntityType(entityType: string, roles: string[]): AlertTone {
  const normalized = normalizeRoleToken(entityType);
  if (normalized.includes("FEE") || normalized.includes("EXPENSE") || roles.some((role) => normalizeRoleToken(role) === "ACCOUNTANT")) {
    return "emerald";
  }
  if (normalized.includes("ATTENDANCE") || normalized.includes("EXAM")) {
    return "indigo";
  }
  if (normalized.includes("NOTICE")) {
    return "rose";
  }
  return "slate";
}

function formatAlertTime(value: Date) {
  return value.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function humanizeToken(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildWeeklyAttendanceBars(rows: Array<{ date: Date; status: string }>, weekStart: Date): ChartPoint[] {
  const buckets = new Map<string, number>();
  for (let index = 0; index < 7; index += 1) {
    const day = new Date(weekStart);
    day.setUTCDate(weekStart.getUTCDate() + index);
    buckets.set(day.toLocaleDateString("en-IN", { weekday: "short" }), 0);
  }

  for (const row of rows) {
    if (row.status !== "PRESENT") continue;
    const key = row.date.toLocaleDateString("en-IN", { weekday: "short" });
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
}

function buildCollectionTrend(rows: Array<{ amount: NumericLike; paymentDate: Date }>, startDate: Date): ChartPoint[] {
  const buckets = seedMonthBuckets(startDate);
  for (const row of rows) {
    const key = monthKey(row.paymentDate);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + Number(row.amount));
    }
  }

  return Array.from(buckets.entries()).map(([label, value]) => ({
    label,
    value: Math.round(value)
  }));
}

function buildFinancialTargetTrend(
  invoices: Array<{ totalAmount: NumericLike; dueDate: Date }>,
  payments: Array<{ amount: NumericLike; paymentDate: Date }>,
  startDate: Date
) {
  const targetBuckets = seedMonthBuckets(startDate);
  const actualBuckets = seedMonthBuckets(startDate);

  for (const invoice of invoices) {
    const key = monthKey(invoice.dueDate);
    if (targetBuckets.has(key)) {
      targetBuckets.set(key, (targetBuckets.get(key) ?? 0) + Number(invoice.totalAmount ?? 0));
    }
  }

  for (const payment of payments) {
    const key = monthKey(payment.paymentDate);
    if (actualBuckets.has(key)) {
      actualBuckets.set(key, (actualBuckets.get(key) ?? 0) + Number(payment.amount ?? 0));
    }
  }

  return Array.from(actualBuckets.entries()).map(([label, value]) => ({
    label,
    value: Math.round(value),
    target: Math.round(targetBuckets.get(label) ?? 0)
  }));
}

function buildClassPassChart(
  rows: Array<{ resultStatus: string; student: { class: { name: string } | null } }>
): ChartPoint[] {
  const buckets = new Map<string, { total: number; passed: number }>();

  for (const row of rows) {
    const label = row.student.class?.name ?? "Unassigned";
    const current = buckets.get(label) ?? { total: 0, passed: 0 };
    current.total += 1;
    if (row.resultStatus.toUpperCase() === "PASS") {
      current.passed += 1;
    }
    buckets.set(label, current);
  }

  return Array.from(buckets.entries())
    .map(([label, value]) => ({
      label,
      value: value.total ? Math.round((value.passed / value.total) * 100) : 0
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);
}

function seedMonthBuckets(startDate: Date) {
  const buckets = new Map<string, number>();
  for (let index = 0; index < 6; index += 1) {
    const month = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + index, 1));
    buckets.set(monthKey(month), 0);
  }
  return buckets;
}

function monthKey(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "short" });
}

function daysUntil(targetDate: Date, todayStart: Date) {
  const diff = targetDate.getTime() - todayStart.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function feeCompletionPct(invoices: Array<{ totalAmount: NumericLike; paidAmount: NumericLike }>) {
  const total = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
  const paid = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount), 0);
  return total ? Math.round((paid / total) * 100) : 0;
}

function metric(
  title: string,
  value: string,
  hint: string,
  trend: string,
  href: string,
  icon: LucideIcon,
  tone: MetricTone,
  options?: { ctaLabel?: string; detail?: string }
): MetricCardData {
  return { title, value, hint, trend, href, icon, tone, ctaLabel: options?.ctaLabel, detail: options?.detail };
}

function action(
  label: string,
  href: string,
  icon: LucideIcon = Activity,
  variant: ActionCardData["variant"] = "primary"
): ActionCardData {
  return { label, href, icon, variant };
}
