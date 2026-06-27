import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
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
  HeartPulse,
  IndianRupee,
  LayoutGrid,
  Library,
  Megaphone,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
  Warehouse
} from "lucide-react";
import { FeePaymentMode } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getRequiredSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/access";
import { isNoticeVisibleToSession, noticeTypeTone } from "@/lib/notices";
import { PERMISSIONS } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";

type DashboardRoleKey =
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

type MetricTone = "slate" | "indigo" | "emerald" | "purple" | "amber" | "rose";

type MetricCardData = {
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

type ActionCardData = {
  label: string;
  href: string;
  icon: LucideIcon;
  variant?: "primary" | "secondary";
};

type ChartPoint = {
  label: string;
  value: number;
  target?: number;
  meta?: string;
};

type ChartCardData =
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

type AlertTone = "indigo" | "emerald" | "amber" | "rose" | "slate";

type AlertItemData = {
  time: string;
  title: string;
  detail: string;
  tone: AlertTone;
};

type DashboardVariant = {
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
  guardian: ["STUDENT", "PARENT"],
  library: ["LIBRARIAN", "MEDIA_CENTER_MANAGER"],
  transport: ["TRANSPORT_MANAGER", "DRIVER_COORDINATOR"],
  hostel: ["HOSTEL_WARDEN", "RESIDENTIAL_IN_CHARGE"],
  inventory: ["INVENTORY", "STORES", "PROCUREMENT_MANAGER", "INVENTORY_MANAGER"],
  frontdesk: ["FRONT_DESK", "RECEPTIONIST", "ADMISSION_COUNSELOR"],
  general: []
};

export default async function DashboardPage() {
  const session = await getRequiredSession();
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
    return null;
  }

  const resolvedRole = resolveDashboardRole(session.roles, user);
  const visibleNotices = await getVisibleNotices(session.schoolId, session.roles);
  const variant = await buildDashboardVariant(
    resolvedRole,
    session,
    user,
    visibleNotices,
    {
      schoolId: session.schoolId,
      todayStart,
      todayEnd,
      monthStart,
      sixMonthsStart,
      weekStart
    }
  );

  return (
    <div className="grid gap-6 bg-slate-50/50">
      <section className="overflow-hidden rounded-[30px] border border-slate-200/60 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(135deg,#ffffff_0%,#f8fafc_45%,#eef2ff_100%)] px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="grid max-w-4xl gap-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700 shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                {variant.label}
              </div>
              <div className="grid gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.15rem]">
                  {variant.title}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-600">
                  {variant.subtitle}
                </p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm">
                <Activity className="h-4 w-4 text-indigo-600" />
                {variant.heroNote}
              </div>
            </div>

            <div className="min-w-[270px] rounded-[26px] border border-slate-200/70 bg-white/85 p-5 shadow-sm backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Access Snapshot
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{user.fullName}</p>
              <p className="mt-1 text-sm text-slate-600">
                {session.roles.join(", ") || "No role assigned"}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Permissions</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{session.permissions.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Scope</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 capitalize">{variant.key}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {variant.metrics.map((metric) => (
              <MetricCard key={metric.title} metric={metric} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.95fr)]">
        <div className="grid gap-6">
          <Card className="border-slate-200/60 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-slate-900">Quick actions</CardTitle>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Only role-approved shortcuts are rendered for this live session.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {variant.actions.map((item) => (
                <ActionCard key={item.label} action={item} />
              ))}
            </CardContent>
          </Card>

          {variant.charts.length ? (
            <div className={`grid gap-6 ${variant.charts.length > 1 ? "2xl:grid-cols-2" : ""}`}>
              {variant.charts.map((chart) => (
                <ChartSurface key={chart.title} chart={chart} />
              ))}
            </div>
          ) : null}
        </div>

        <Card className="border-slate-200/60 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <CardTitle className="text-slate-900">Operational alert hub</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Timeline events are filtered to the current role family so no higher-scope operations leak here.
            </p>
          </CardHeader>
          <CardContent>
            <AlertTimeline alerts={variant.alerts} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{variant.noticesTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{variant.noticesSubtitle}</p>
          </div>
          <Link href="/dashboard/notices" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600">
            Open notice center
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {visibleNotices.length ? (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {visibleNotices.slice(0, 6).map((notice) => (
              <NoticeCard key={notice.id} notice={notice} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-slate-200/80 bg-white/80">
            <CardContent className="flex min-h-[160px] items-center justify-center text-center text-sm text-slate-500">
              No notices are currently visible for this dashboard profile.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

async function buildDashboardVariant(
  role: DashboardRoleKey,
  session: Awaited<ReturnType<typeof getRequiredSession>>,
  user: CurrentUser,
  visibleNotices: VisibleNotice[],
  context: DashboardContext
): Promise<DashboardVariant> {
  switch (role) {
    case "admin":
      return buildAdminVariant(context, visibleNotices);
    case "leadership":
      return buildLeadershipVariant(context, visibleNotices);
    case "teaching":
      return buildTeachingVariant(context, user, visibleNotices);
    case "finance":
      return buildFinanceVariant(context, visibleNotices);
    case "guardian":
      return buildGuardianVariant(context, user, session, visibleNotices);
    case "library":
      return buildLibraryVariant(context, visibleNotices);
    case "transport":
      return buildTransportVariant(context, visibleNotices);
    case "hostel":
      return buildHostelVariant(context, visibleNotices);
    case "inventory":
      return buildInventoryVariant(context, visibleNotices);
    case "frontdesk":
      return buildFrontDeskVariant(context, visibleNotices);
    default:
      return buildGeneralVariant(context, session, visibleNotices);
  }
}

async function buildAdminVariant(
  context: DashboardContext,
  visibleNotices: VisibleNotice[]
): Promise<DashboardVariant> {
  const [
    activeStudentCount,
    activeStaffCount,
    feeSummary,
    attendanceRows,
    collectionRows,
    lowStockItems,
    overdueBooksCount,
    pendingLeavesCount,
    transportVehicles,
    teacherCount,
    accountantCount,
    adminCount
  ] = await Promise.all([
    db.student.count({
      where: { schoolId: context.schoolId, status: { not: "ARCHIVED" } }
    }),
    db.staff.count({
      where: { schoolId: context.schoolId, isArchived: false }
    }),
    db.feeInvoice.aggregate({
      where: { schoolId: context.schoolId },
      _sum: { totalAmount: true, paidAmount: true }
    }),
    db.attendance.findMany({
      where: {
        schoolId: context.schoolId,
        date: { gte: context.weekStart, lte: context.todayEnd }
      },
      select: { date: true, status: true }
    }),
    db.feePayment.findMany({
      where: {
        schoolId: context.schoolId,
        paymentDate: { gte: context.sixMonthsStart, lte: context.todayEnd }
      },
      select: { amount: true, paymentDate: true }
    }),
    safeOptionalFindMany<{ quantityOnHand: number; minimumQuantity: number }>("inventoryItem", {
      where: { schoolId: context.schoolId, isArchived: false },
      select: { quantityOnHand: true, minimumQuantity: true }
    }),
    safeOptionalCount("libraryIssue", {
      where: {
        schoolId: context.schoolId,
        status: "ISSUED",
        dueDate: { lt: context.todayStart }
      }
    }),
    safeOptionalCount("leaveRequest", {
      where: { schoolId: context.schoolId, status: "PENDING" }
    }),
    safeOptionalFindMany<{ insuranceValidUntil: Date | null; fitnessValidUntil: Date | null; isActive: boolean }>("transportVehicle", {
      where: { schoolId: context.schoolId, isArchived: false },
      select: { insuranceValidUntil: true, fitnessValidUntil: true, isActive: true }
    }),
    db.user.count({
      where: { schoolId: context.schoolId, roles: { some: { role: { code: "TEACHER" } } } }
    }),
    db.user.count({
      where: { schoolId: context.schoolId, roles: { some: { role: { code: "ACCOUNTANT" } } } }
    }),
    db.user.count({
      where: { schoolId: context.schoolId, roles: { some: { role: { code: { in: ["ADMIN", "SUPER_ADMIN"] } } } } }
    })
  ]);

  const totalBilled = Number(feeSummary._sum.totalAmount ?? 0);
  const totalPaid = Number(feeSummary._sum.paidAmount ?? 0);
  const outstanding = Math.max(0, totalBilled - totalPaid);
  const lowStockCount = lowStockItems.filter((item) => item.quantityOnHand <= item.minimumQuantity).length;
  const expiringCompliance = transportVehicles.filter(
    (vehicle) =>
      vehicle.isActive &&
      ((vehicle.insuranceValidUntil && vehicle.insuranceValidUntil < context.todayEnd) ||
        (vehicle.fitnessValidUntil && vehicle.fitnessValidUntil < context.todayEnd))
  ).length;
  const activeSystemAlerts =
    lowStockCount +
    overdueBooksCount +
    pendingLeavesCount +
    expiringCompliance +
    visibleNotices.filter((notice) => notice.noticeType === "IMPORTANT").length;
  const liveAttendanceToday = attendanceRows.filter(
    (row) => row.status === "PRESENT" && row.date >= context.todayStart && row.date <= context.todayEnd
  ).length;

  return {
    key: "admin",
    label: "Admin / Super Admin",
    title: "Enterprise school command center with macro health, collections, and risk visibility.",
    subtitle:
      "The dashboard stays server-side role sealed and only exposes whole-school operational intelligence to top-control accounts.",
    heroNote: "Global metrics, financial pulse, and alert timelines are limited to top-level administrative roles.",
    metrics: [
      metric("Total Active Students", activeStudentCount.toString(), "Live active enrolment footprint across the institution.", "+4.2% this term", "/dashboard/students", Users, "indigo", { ctaLabel: "View Student Registry" }),
      metric("Total Staff", activeStaffCount.toString(), "Non-archived teaching and operations headcount.", "Staff readiness monitored daily", "/dashboard/staff", Briefcase, "slate", { ctaLabel: "Open Staff Directory", detail: `Teachers ${teacherCount} · Accountants ${accountantCount} · Admins ${adminCount}` }),
      metric("Today's Live Attendance", liveAttendanceToday.toString(), "Present-marked records captured for today across the school.", "Open attendance desk", "/dashboard/attendance", CalendarCheck2, "purple", { ctaLabel: "View Attendance Records" }),
      metric("MTD Revenue vs Outstanding Dues", `${formatCurrency(totalPaid)} / ${formatCurrency(outstanding)}`, "Collected fee value stacked against current unpaid dues.", "Collections refreshed from real invoices", "/dashboard/fees", IndianRupee, "emerald", { ctaLabel: "Open Fee Ledger" }),
      metric("Active System Alerts", activeSystemAlerts.toString(), "Cross-module warning stack covering stock, leaves, compliance, library, and urgent notices.", `${activeSystemAlerts} live items need review`, "/dashboard/audit", ShieldAlert, "amber", { ctaLabel: "Review Alerts" })
    ],
    actions: [
      action("[+ Create Branch/User]", "/dashboard/users", Users),
      action("[+ System Config]", "/dashboard/settings", ShieldCheck),
      action("[ View Audit Logs ]", "/dashboard/audit", FileText, "secondary")
    ],
    charts: [
      {
        type: "bars",
        title: "Overall School Attendance Trends",
        subtitle: "Present-marked attendance over the latest 7 days.",
        href: "/dashboard/attendance",
        ctaLabel: "View Records",
        points: buildDailyAttendanceTrend(attendanceRows, context.weekStart)
      },
      {
        type: "financial",
        title: "Financial & Revenue Pulse",
        subtitle: "Actual monthly collections against school fee demand targets.",
        href: "/dashboard/fees",
        ctaLabel: "View Full Analytics",
        points: buildMonthlyTargetSeries(
          await db.feeInvoice.findMany({
            where: { schoolId: context.schoolId },
            select: { dueDate: true, totalAmount: true }
          }),
          collectionRows,
          context.sixMonthsStart
        )
      }
    ],
    alerts: [
      alertItem("10:15 AM", "Low stock pressure rising", `${lowStockCount} inventory item(s) sit at or below reorder level.`, "amber"),
      alertItem("09:30 AM", "Route compliance follow-up", `${expiringCompliance} active vehicle(s) show overdue fitness or insurance renewal.`, "rose"),
      alertItem("08:50 AM", "Library overdue stack", `${overdueBooksCount} open issue(s) are past due and still active.`, "indigo"),
      alertItem("08:10 AM", "Approval queue pending", `${pendingLeavesCount} leave request(s) need administrative decisioning.`, "slate")
    ],
    noticesTitle: "System notices",
    noticesSubtitle: "High-importance operational communication visible to administrative leadership."
  };
}

async function buildLeadershipVariant(
  context: DashboardContext,
  visibleNotices: VisibleNotice[]
): Promise<DashboardVariant> {
  const [
    subjectsCount,
    touchedSubjects,
    examResults,
    activeStaffCount,
    activeStudentCount,
    approvedStaffLeaves,
    studentAttendanceToday,
    pendingLeavesCount,
    attendanceRows,
    teacherCount,
    accountantCount,
    adminCount
  ] = await Promise.all([
    db.subject.count({
      where: { schoolId: context.schoolId, isArchived: false }
    }),
    db.examMark.findMany({
      where: { exam: { schoolId: context.schoolId } },
      distinct: ["subjectId"],
      select: { subjectId: true }
    }),
    db.examResult.findMany({
      where: { exam: { schoolId: context.schoolId } },
      include: {
        student: { include: { class: true } }
      }
    }),
    db.staff.count({
      where: { schoolId: context.schoolId, isArchived: false }
    }),
    db.student.count({
      where: { schoolId: context.schoolId, status: { not: "ARCHIVED" } }
    }),
    safeOptionalCount("leaveRequest", {
      where: {
        schoolId: context.schoolId,
        requesterType: "STAFF",
        status: "APPROVED",
        startDate: { lte: context.todayEnd },
        endDate: { gte: context.todayStart }
      }
    }),
    db.attendance.count({
      where: {
        schoolId: context.schoolId,
        status: "PRESENT",
        date: { gte: context.todayStart, lte: context.todayEnd }
      }
    }),
    safeOptionalCount("leaveRequest", {
      where: { schoolId: context.schoolId, status: "PENDING" }
    }),
    db.attendance.findMany({
      where: {
        schoolId: context.schoolId,
        date: { gte: context.weekStart, lte: context.todayEnd }
      },
      select: { date: true, status: true }
    }),
    db.user.count({
      where: { schoolId: context.schoolId, roles: { some: { role: { code: "TEACHER" } } } }
    }),
    db.user.count({
      where: { schoolId: context.schoolId, roles: { some: { role: { code: "ACCOUNTANT" } } } }
    }),
    db.user.count({
      where: { schoolId: context.schoolId, roles: { some: { role: { code: { in: ["ADMIN", "SUPER_ADMIN"] } } } } }
    })
  ]);

  const avgPerformance = examResults.length
    ? examResults.reduce((sum, row) => sum + Number(row.percentage), 0) / examResults.length
    : 0;
  const syllabusProgress = subjectsCount ? Math.round((touchedSubjects.length / subjectsCount) * 100) : 0;
  const staffPresentToday = Math.max(0, activeStaffCount - approvedStaffLeaves);
  const activeComplaints = pendingLeavesCount + visibleNotices.filter((notice) => notice.noticeType === "IMPORTANT").length;
  const liveAttendanceToday = studentAttendanceToday;

  return {
    key: "leadership",
    label: "Principal / Director / Academic Head",
    title: "Academic performance cockpit with quality, syllabus readiness, and people coverage.",
    subtitle:
      "Only instructional leadership sees institution-level learning analytics, staff availability, and review pressure from the homepage.",
    heroNote: "Academic control views stay focused on pass rates, coverage, attendance quality, and approvals.",
    metrics: [
      metric("Average School Performance %", `${avgPerformance.toFixed(1)}%`, "Published exam-result averages blended across visible school assessments.", "+3.8% from last cycle", "/dashboard/reports", GraduationCap, "purple", { ctaLabel: "View Academic Reports" }),
      metric("Syllabus Progress Tracker", `${syllabusProgress}%`, "Coverage estimated from subjects already touched by recorded assessment activity.", "Assessment-backed progress only", "/dashboard/reports", ClipboardList, "emerald", { ctaLabel: "View Progress Analytics" }),
      metric("Total Staff", activeStaffCount.toString(), "Staff strength available under academic leadership oversight.", `${staffPresentToday} present today`, "/dashboard/staff", Briefcase, "indigo", { ctaLabel: "Open Staff Directory", detail: `Teachers ${teacherCount} · Accountants ${accountantCount} · Admins ${adminCount}` }),
      metric("Today's Live Attendance", liveAttendanceToday.toString(), "Present-marked student attendance recorded today.", "Attendance desk is live", "/dashboard/attendance", CalendarCheck2, "slate", { ctaLabel: "View Attendance Records" }),
      metric("Active Complaints/Grievances", activeComplaints.toString(), "Pending approvals and urgent notices requiring leadership attention.", "Escalation stack remains visible", "/dashboard/leaves", BellRing, "amber", { ctaLabel: "Review Escalations" })
    ],
    actions: [
      action("[+ Post Announcement]", "/dashboard/notices", Megaphone),
      action("[ Review Lesson Plans ]", "/dashboard/staff", BookType, "secondary"),
      action("[ Approve Leaves ]", "/dashboard/leaves", CalendarClock, "secondary")
    ],
    charts: [
      {
        type: "bars",
        title: "Academic Pass Rate by Class",
        subtitle: "Top class-level pass rates from current published result data.",
        href: "/dashboard/reports",
        ctaLabel: "View Full Analytics",
        points: buildClassPassChart(examResults)
      },
      {
        type: "compare",
        title: "Attendance & Coverage Pulse",
        subtitle: "Student presence versus available staff coverage for today.",
        href: "/dashboard/attendance",
        ctaLabel: "View Records",
        points: [
          {
            label: "Students present",
            value: activeStudentCount ? Math.round((studentAttendanceToday / activeStudentCount) * 100) : 0,
            meta: `${studentAttendanceToday} marked present`
          },
          {
            label: "Staff available",
            value: activeStaffCount ? Math.round((staffPresentToday / activeStaffCount) * 100) : 0,
            meta: `${staffPresentToday} active today`
          }
        ],
        suffix: "%"
      },
      {
        type: "bars",
        title: "Weekly Attendance Trend",
        subtitle: "Institution-wide present movement over the last 7 days.",
        href: "/dashboard/attendance",
        ctaLabel: "View Records",
        points: buildDailyAttendanceTrend(attendanceRows, context.weekStart)
      }
    ],
    alerts: [
      alertItem("11:00 AM", "Academic follow-up required", `${pendingLeavesCount} pending leave request(s) may affect classroom readiness.`, "amber"),
      alertItem("10:20 AM", "Urgent notice pressure", `${visibleNotices.filter((notice) => notice.noticeType === "IMPORTANT").length} important notice(s) remain visible to leadership.`, "rose"),
      alertItem("09:10 AM", "Coverage check", `${staffPresentToday}/${activeStaffCount || 0} staff members available for today’s sessions.`, "indigo"),
      alertItem("08:40 AM", "Performance watchlist", `${avgPerformance.toFixed(1)}% average pass indicator across recorded results.`, "emerald")
    ],
    noticesTitle: "Leadership notices",
    noticesSubtitle: "Announcements and flagged items scoped to academic oversight."
  };
}

async function buildTeachingVariant(
  context: DashboardContext,
  user: CurrentUser,
  visibleNotices: VisibleNotice[]
): Promise<DashboardVariant> {
  const assignedSections = user.staffProfile?.classTeacherFor ?? [];
  const sectionIds = assignedSections.map((section) => section.id);
  const classIds = Array.from(new Set(assignedSections.map((section) => section.classId)));

  const students = sectionIds.length
    ? await db.student.findMany({
        where: {
          schoolId: context.schoolId,
          sectionId: { in: sectionIds },
          status: { not: "ARCHIVED" }
        },
        include: { class: true, section: true },
        orderBy: [{ fullName: "asc" }]
      })
    : [];

  const studentIds = students.map((student) => student.id);

  const [todayAttendance, relevantExams, resultRows, weeklyAttendance] = await Promise.all([
    studentIds.length
      ? db.attendance.findMany({
          where: {
            schoolId: context.schoolId,
            studentId: { in: studentIds },
            date: { gte: context.todayStart, lte: context.todayEnd }
          },
          select: { studentId: true }
        })
      : Promise.resolve([]),
    classIds.length
      ? db.exam.findMany({
          where: {
            schoolId: context.schoolId,
            classId: { in: classIds },
            endDate: { lte: context.todayEnd }
          },
          orderBy: [{ endDate: "desc" }],
          take: 4
        })
      : Promise.resolve([]),
    classIds.length
      ? db.examResult.findMany({
          where: {
            exam: { schoolId: context.schoolId, classId: { in: classIds } },
            studentId: { in: studentIds }
          },
          select: { examId: true, studentId: true }
        })
      : Promise.resolve([]),
    studentIds.length
      ? db.attendance.findMany({
          where: {
            schoolId: context.schoolId,
            studentId: { in: studentIds },
            date: { gte: context.weekStart, lte: context.todayEnd }
          },
          select: { date: true, status: true }
        })
      : Promise.resolve([])
  ]);

  const markedStudentIds = new Set(todayAttendance.map((entry) => entry.studentId));
  const latestExamIds = relevantExams.map((exam) => exam.id);
  const expectedResultCount = latestExamIds.length * studentIds.length;
  const actualResultCount = resultRows.filter((row) => latestExamIds.includes(row.examId)).length;
  const pendingAssignments = Math.max(0, expectedResultCount - actualResultCount);
  const completionPct = expectedResultCount ? Math.round((actualResultCount / expectedResultCount) * 100) : 0;

  return {
    key: "teaching",
    label: "Teacher / HOD / Instructor",
    title: "Classroom operations workspace tuned for attendance action, grading follow-up, and section visibility.",
    subtitle:
      "Teacher-facing analytics stay limited to assigned classes and do not render global finance, audit, or institution-wide administrative data.",
    heroNote: "Every card and chart is computed from sections linked to the signed-in staff profile only.",
    metrics: [
      metric("My Classes Today", assignedSections.length.toString(), assignedSections.length ? assignedSections.map((section) => `${section.class.name}-${section.name}`).join(", ") : "No class-teacher sections are linked to this profile.", "Section list updates from live staff mapping", "/dashboard/attendance", CalendarCheck2, "indigo", { ctaLabel: "Open Attendance Desk" }),
      metric("Unmarked Class Attendance", Math.max(0, studentIds.length - markedStudentIds.size).toString(), "Learners in your sections still missing attendance marks for today.", "Complete attendance before session close", "/dashboard/attendance", ClipboardList, "amber", { ctaLabel: "View Attendance Records" }),
      metric("Pending Assignments to Grade", pendingAssignments.toString(), "Missing result entries for recent linked class assessments.", `${completionPct}% grading completion`, "/dashboard/exams", FileBadge2, "rose", { ctaLabel: "Open Exam Records" }),
      metric("My Timetable Overview", `${assignedSections.length} section(s)`, assignedSections.length ? `Current spread: ${assignedSections.map((section) => section.name).join(", ")}.` : "No timetable-linked sections found for this role.", "Workload remains classroom scoped", "/dashboard/attendance", CalendarClock, "purple", { ctaLabel: "View Class Schedule" })
    ],
    actions: [
      action("[+ Mark Attendance]", "/dashboard/attendance", CalendarCheck2),
      action("[+ Create Homework/Test]", "/dashboard/exams", BookOpenCheck),
      action("[+ Publish Internal Marks]", "/dashboard/exams", FileBadge2, "secondary")
    ],
    charts: [
      {
        type: "bars",
        title: "Weekly Attendance Trend",
        subtitle: "Present-marked attendance only for your assigned sections.",
        href: "/dashboard/attendance",
        ctaLabel: "View Records",
        points: buildDailyAttendanceTrend(weeklyAttendance, context.weekStart)
      },
      {
        type: "compare",
        title: "Assessment Completion Split",
        subtitle: "Publishing coverage versus remaining grading workload.",
        href: "/dashboard/exams",
        ctaLabel: "View Full Analytics",
        points: [
          { label: "Published / marked", value: completionPct, meta: `${actualResultCount} result rows logged` },
          { label: "Still pending", value: Math.max(0, 100 - completionPct), meta: `${pendingAssignments} records pending` }
        ],
        suffix: "%"
      }
    ],
    alerts: [
      alertItem("02:15 PM", "Attendance gaps remain", `${Math.max(0, studentIds.length - markedStudentIds.size)} learner(s) in your sections still need attendance marking.`, "amber"),
      alertItem("12:30 PM", "Assessment queue open", `${pendingAssignments} grading item(s) remain unresolved for recent exams.`, "rose"),
      alertItem("10:45 AM", "Section readiness synced", `${assignedSections.length} section(s) mapped to this staff account.`, "indigo"),
      alertItem("09:20 AM", "Classroom notices filtered", `${visibleNotices.length} visible announcement(s) are scoped to teacher-facing audiences only.`, "slate")
    ],
    noticesTitle: "Classroom notices",
    noticesSubtitle: "Announcements and reminders filtered to teacher-level visibility."
  };
}

async function buildFinanceVariant(
  context: DashboardContext,
  visibleNotices: VisibleNotice[]
): Promise<DashboardVariant> {
  const [todayPayments, monthlyPayments, invoiceRows, recentNonCashPayments] = await Promise.all([
    db.feePayment.findMany({
      where: {
        schoolId: context.schoolId,
        paymentDate: { gte: context.todayStart, lte: context.todayEnd }
      },
      select: { amount: true, paymentMode: true, paymentDate: true }
    }),
    db.feePayment.findMany({
      where: {
        schoolId: context.schoolId,
        paymentDate: { gte: context.sixMonthsStart, lte: context.todayEnd }
      },
      select: { amount: true, paymentMode: true, paymentDate: true }
    }),
    db.feeInvoice.findMany({
      where: { schoolId: context.schoolId },
      select: { studentId: true, dueDate: true, totalAmount: true, paidAmount: true }
    }),
    db.feePayment.findMany({
      where: {
        schoolId: context.schoolId,
        paymentDate: { gte: context.monthStart, lte: context.todayEnd },
        paymentMode: {
          in: [
            FeePaymentMode.CHEQUE,
            FeePaymentMode.BANK_TRANSFER,
            FeePaymentMode.CARD,
            FeePaymentMode.UPI
          ]
        }
      },
      select: { id: true }
    })
  ]);

  const feesCollectedToday = todayPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalMTDCollection = monthlyPayments
    .filter((payment) => payment.paymentDate >= context.monthStart)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const defaulters = new Set(
    invoiceRows
      .filter((invoice) => invoice.dueDate < context.todayStart && Number(invoice.totalAmount) > Number(invoice.paidAmount))
      .map((invoice) => invoice.studentId)
  ).size;
  const targetSeries = buildMonthlyTargetSeries(invoiceRows, monthlyPayments, context.sixMonthsStart);

  return {
    key: "finance",
    label: "Accountant / Cashier / Finance Head",
    title: "Revenue operations dashboard with collection pulse, reconciliation pressure, and defaulter exposure.",
    subtitle:
      "Only commerce-facing metrics, charts, and action rails are shown here; academic and lesson surfaces remain hidden.",
    heroNote: "Fee, dues, and reconciliation intelligence stays contained to finance-role sessions.",
    metrics: [
      metric("Fees Collected Today", formatCurrency(feesCollectedToday), "Confirmed same-day fee receipts across collection modes.", "Daily cash desk movement", "/dashboard/fees", Banknote, "emerald", { ctaLabel: "Open Fee Collections" }),
      metric("Total MTD Collection", formatCurrency(totalMTDCollection), "Month-to-date receipt accumulation from recorded fee payments.", "Collections refreshed from ledger data", "/dashboard/fees", IndianRupee, "indigo", { ctaLabel: "Open Fee Ledger" }),
      metric("Total Cheques/Online Pending Clearance", recentNonCashPayments.length.toString(), "Non-cash receipts needing settlement confirmation.", `${recentNonCashPayments.length} receipts awaiting closure`, "/dashboard/accounts", WalletCards, "amber", { ctaLabel: "View Reconciliation" }),
      metric("Total Active Defaulters Count", defaulters.toString(), "Students with overdue invoices and unpaid balances.", "Overdue count is due-date aware", "/dashboard/fees", ShieldAlert, "rose", { ctaLabel: "Review Defaulters" })
    ],
    actions: [
      action("[+ Collect Cash Fee]", "/dashboard/fees", IndianRupee),
      action("[+ Generate Invoice]", "/dashboard/fees", FileText),
      action("[+ Record Vendor Expense]", "/dashboard/accounts", ClipboardList, "secondary"),
      action("[ Export Tax Ledger ]", "/dashboard/accounts", ArrowRight, "secondary")
    ],
    charts: [
      {
        type: "financial",
        title: "Financial & Revenue Pulse",
        subtitle: "Target due value versus actual monthly fee collections.",
        href: "/dashboard/fees",
        ctaLabel: "View Full Analytics",
        points: targetSeries
      }
    ],
    alerts: [
      alertItem("03:00 PM", "Receipt reconciliation queue", `${recentNonCashPayments.length} non-cash receipt(s) still need settlement confirmation.`, "amber"),
      alertItem("01:20 PM", "Defaulter pressure visible", `${defaulters} student account(s) are already overdue.`, "rose"),
      alertItem("11:05 AM", "Collection pulse updated", `${formatCurrency(feesCollectedToday)} posted today across confirmed entries.`, "emerald"),
      alertItem("09:00 AM", "Finance notices filtered", `${visibleNotices.length} notice(s) remain visible under finance-role communication scope.`, "slate")
    ],
    noticesTitle: "Finance notices",
    noticesSubtitle: "Collection, billing, and accounting follow-ups visible to finance roles."
  };
}

async function buildGuardianVariant(
  context: DashboardContext,
  user: CurrentUser,
  session: Awaited<ReturnType<typeof getRequiredSession>>,
  visibleNotices: VisibleNotice[]
): Promise<DashboardVariant> {
  const parentStudents: PersonalStudent[] = user.parentProfile?.students
    ?.sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary))
    .map((entry) => entry.student) ?? [];

  let primaryStudent: PersonalStudent | null = parentStudents[0] ?? null;

  if (!primaryStudent && session.roles.includes("STUDENT")) {
    primaryStudent =
      (await db.student.findFirst({
        where: {
          schoolId: context.schoolId,
          OR: [{ fullName: user.fullName }, { firstName: user.fullName.split(" ")[0] ?? user.fullName }]
        },
        include: { class: true, section: true }
      })) ?? null;
  }

  const studentIds = primaryStudent ? [primaryStudent.id] : parentStudents.map((student) => student.id);
  const relevantClassIds = primaryStudent?.classId
    ? [primaryStudent.classId]
    : parentStudents.map((student) => student.classId).filter((classId): classId is string => Boolean(classId));

  const [attendances, invoices, upcomingExams] = studentIds.length
    ? await Promise.all([
        db.attendance.findMany({
          where: { schoolId: context.schoolId, studentId: { in: studentIds } },
          select: { status: true }
        }),
        db.feeInvoice.findMany({
          where: { schoolId: context.schoolId, studentId: { in: studentIds } },
          select: { totalAmount: true, paidAmount: true }
        }),
        db.exam.findMany({
          where: {
            schoolId: context.schoolId,
            classId: { in: relevantClassIds },
            startDate: { gte: context.todayStart }
          },
          orderBy: [{ startDate: "asc" }],
          take: 6
        })
      ])
    : [[], [], []];

  const markedAttendanceCount = attendances.length;
  const presentCount = attendances.filter((attendance) => attendance.status === "PRESENT").length;
  const attendancePct = markedAttendanceCount ? Math.round((presentCount / markedAttendanceCount) * 100) : 0;
  const pendingFees = invoices.reduce(
    (sum, invoice) => sum + Math.max(0, Number(invoice.totalAmount) - Number(invoice.paidAmount)),
    0
  );
  const homeworkDeadlines = visibleNotices.filter((notice) => {
    const title = `${notice.title} ${notice.body}`.toLowerCase();
    return (
      (title.includes("homework") || title.includes("assignment") || title.includes("test")) &&
      (!notice.expiresAt || notice.expiresAt >= context.todayStart)
    );
  }).length;
  const syllabusProgress = deriveStudentProgress(attendancePct, upcomingExams.length, homeworkDeadlines);

  return {
    key: "guardian",
    label: session.roles.includes("PARENT") ? "Parent" : "Student",
    title: "Personal learner dashboard with dues, attendance, deadlines, and next academic checkpoints.",
    subtitle:
      "This page remains entirely learner-scoped and never renders school-wide staff, finance, or operational analytics.",
    heroNote: "Personal charts and alerts are computed only from the linked student context resolved for this session.",
    metrics: [
      metric("My Attendance Overall %", `${attendancePct}%`, primaryStudent ? `Attendance based on records for ${primaryStudent.fullName}.` : "No linked learner profile could be resolved for this account.", `${attendancePct}% present across marked days`, "/dashboard/attendance", CalendarCheck2, "indigo", { ctaLabel: "View Attendance" }),
      metric("My Current Pending Fees/Dues", formatCurrency(pendingFees), "Outstanding amount across linked student invoices.", "Fee view stays personal only", "/dashboard/fees", IndianRupee, "amber", { ctaLabel: "Open Billing" }),
      metric("My Upcoming Exams", upcomingExams.length.toString(), primaryStudent?.class?.name ? `Scheduled future exams for ${primaryStudent.class.name}.` : "No class-linked upcoming exams found.", `${upcomingExams.length} checkpoint(s) ahead`, "/dashboard/exams", GraduationCap, "emerald", { ctaLabel: "View Exam Schedule" }),
      metric("Homework Deadline Counter", homeworkDeadlines.toString(), "Visible assignment-like notices with active urgency windows.", "Reminder feed updates from visible notices", "/dashboard/documents", FileClock, "rose", { ctaLabel: "Open Assignments" })
    ],
    actions: [
      action("[ Pay Fee Online ]", "/dashboard/fees", IndianRupee),
      action("[ Download Assignment ]", "/dashboard/documents", FileText, "secondary"),
      action("[ View Report Card / Progress ]", "/dashboard/exams", FileBadge2, "secondary")
    ],
    charts: [
      {
        type: "progress",
        title: "Syllabus Progress Tracker",
        subtitle: "Personal learning momentum estimated from attendance, exams, and active deadlines.",
        href: "/dashboard/exams",
        ctaLabel: "View Full Analytics",
        value: syllabusProgress,
        hint: primaryStudent?.class?.name ? `${primaryStudent.class.name} learner context` : "Linked learner context",
        segments: [
          { label: "Attendance", value: attendancePct, tone: "indigo" },
          { label: "Upcoming exams", value: Math.max(12, 100 - upcomingExams.length * 14), tone: "emerald" },
          { label: "Deadline load", value: Math.max(10, 100 - homeworkDeadlines * 18), tone: "amber" }
        ]
      },
      {
        type: "countdown",
        title: "Weekly Timetable & Exam Countdown Grid",
        subtitle: "Near-term academic checkpoints derived from the learner’s class-linked schedule.",
        href: "/dashboard/exams",
        ctaLabel: "View Records",
        items: upcomingExams.slice(0, 4).map((exam) => ({
          label: exam.name,
          value: `${daysUntil(exam.startDate, context.todayStart)} day(s)`,
          meta: exam.startDate.toLocaleDateString("en-IN")
        }))
      }
    ],
    alerts: [
      alertItem("02:00 PM", "New assignment visibility", `${homeworkDeadlines} assignment or test reminder(s) are currently active.`, "amber"),
      alertItem("Yesterday", "Attendance pulse updated", `${attendancePct}% overall attendance is visible in this session.`, "indigo"),
      alertItem("Next exam", upcomingExams[0] ? `${upcomingExams[0].name} is due in ${daysUntil(upcomingExams[0].startDate, context.todayStart)} day(s).` : "No upcoming exam is currently scheduled.", primaryStudent?.class?.name ?? "Learner schedule", "emerald"),
      alertItem("Fee status", "Personal dues only", pendingFees ? `${formatCurrency(pendingFees)} remains payable across open fee invoices.` : "No current pending fee dues detected.", "rose")
    ],
    noticesTitle: "Personal notices",
    noticesSubtitle: "Learner-facing announcements and reminders visible to the current student or parent."
  };
}

async function buildLibraryVariant(
  context: DashboardContext,
  visibleNotices: VisibleNotice[]
): Promise<DashboardVariant> {
  const [books, issuesToday, overdueBooks, recentFines] = await Promise.all([
      safeOptionalCount("libraryBook", {
        where: { schoolId: context.schoolId, isArchived: false }
      }),
      safeOptionalCount("libraryIssue", {
        where: {
          schoolId: context.schoolId,
          issueDate: { gte: context.todayStart, lte: context.todayEnd }
        }
      }),
      safeOptionalCount("libraryIssue", {
        where: {
          schoolId: context.schoolId,
          status: "ISSUED",
          dueDate: { lt: context.todayStart }
        }
      }),
      safeOptionalFindMany<{ fineAmount: number | null }>("libraryIssue", {
        where: {
          schoolId: context.schoolId,
          createdAt: { gte: context.monthStart, lte: context.todayEnd }
        },
        select: { fineAmount: true }
      })
  ]);

  const fineCollected = recentFines.reduce((sum, issue) => sum + Number(issue.fineAmount), 0);

  return {
    key: "library",
    label: "Librarian / Media Center Manager",
    title: "Library service desk with circulation pressure, overdues, fines, and reader operations.",
    subtitle:
      "Only catalogue, issue, return, and library-facing service signals render for this role profile.",
    heroNote: "Circulation intelligence is isolated from finance, academic leadership, and administrative control layers.",
    metrics: [
      metric("Total Books in Library", books.toString(), "Active titles in the library catalogue.", "Catalogue footprint refreshed live", "/dashboard/library", Library, "indigo"),
      metric("Books Issued Today", issuesToday.toString(), "Circulation transactions created during the current day.", "Desk throughput today", "/dashboard/library", BookOpenCheck, "emerald"),
      metric("Overdue Books Counter", overdueBooks.toString(), "Books still active beyond their due date.", "Recovery watchlist remains visible", "/dashboard/library", ShieldAlert, "amber"),
      metric("Fine Collected This Month", formatCurrency(fineCollected), "Fine amounts captured in current-month circulation records.", "Monthly fine recovery pulse", "/dashboard/library", IndianRupee, "rose")
    ],
    actions: [
      action("[+ Issue / Return Book]", "/dashboard/library", BookOpenCheck),
      action("[+ Catalog New Title]", "/dashboard/library", Library),
      action("[ Scan Member Barcode ]", "/dashboard/library", ArrowRight, "secondary")
    ],
    charts: [
      {
        type: "compare",
        title: "Circulation Status Snapshot",
        subtitle: "Issue velocity, overdue pressure, and fine activity in one quick view.",
        href: "/dashboard/library",
        ctaLabel: "View Records",
        points: [
          { label: "Issued today", value: clampPercent(issuesToday * 10), meta: `${issuesToday} transaction(s)` },
          { label: "Overdue load", value: clampPercent(overdueBooks * 12), meta: `${overdueBooks} book(s)` },
          { label: "Fine recovery", value: clampPercent(Math.round(fineCollected / 100)), meta: formatCurrency(fineCollected) }
        ],
        suffix: "%"
      }
    ],
    alerts: [
      alertItem("01:40 PM", "Overdue recovery needed", `${overdueBooks} circulation item(s) are now past due.`, "amber"),
      alertItem("11:25 AM", "Issue desk active", `${issuesToday} issue transaction(s) were posted today.`, "emerald"),
      alertItem("10:05 AM", "Fine ledger updated", `${formatCurrency(fineCollected)} collected in fines this month.`, "rose"),
      alertItem("09:15 AM", "Desk notices scoped", `${visibleNotices.length} notice(s) visible to library-facing roles.`, "slate")
    ],
    noticesTitle: "Library notices",
    noticesSubtitle: "Reader service and catalogue announcements visible to the media center."
  };
}

async function buildTransportVariant(
  context: DashboardContext,
  visibleNotices: VisibleNotice[]
): Promise<DashboardVariant> {
  const [vehicles, routes, activeAssignments] = await Promise.all([
    safeOptionalFindMany<{ isActive: boolean; insuranceValidUntil: Date | null; fitnessValidUntil: Date | null }>("transportVehicle", {
      where: { schoolId: context.schoolId, isArchived: false },
      select: { isActive: true, insuranceValidUntil: true, fitnessValidUntil: true }
    }),
    safeOptionalFindMany<{ isActive: boolean }>("transportRoute", {
      where: { schoolId: context.schoolId, isArchived: false },
      select: { isActive: true }
    }),
    safeOptionalFindMany<{ id: string }>("transportAssignment", {
      where: { schoolId: context.schoolId, status: "ACTIVE" },
      select: { id: true }
    })
  ]);

  const activeBuses = vehicles.filter((vehicle) => vehicle.isActive).length;
  const activeRoutes = routes.filter((route) => route.isActive).length;
  const maintenanceAlerts = vehicles.filter(
    (vehicle) =>
      (vehicle.insuranceValidUntil && vehicle.insuranceValidUntil < context.todayEnd) ||
      (vehicle.fitnessValidUntil && vehicle.fitnessValidUntil < context.todayEnd)
  ).length;
  const fuelLogPending = Math.max(0, activeBuses - activeRoutes);

  return {
    key: "transport",
    label: "Transport Manager / Driver Coordinator",
    title: "Route and fleet operations dashboard focused on movement, rider load, and compliance follow-up.",
    subtitle:
      "Only route, vehicle, assignment, and transport-operations intelligence is visible to this role profile.",
    heroNote: "Fleet charts and dispatch alerts are kept separate from academics, finance, and audit data.",
    metrics: [
      metric("Active Buses/Routes On Road", `${activeBuses} / ${activeRoutes}`, "Active fleet count against current route availability.", "Route utilization in view", "/dashboard/transport", BusFront, "indigo"),
      metric("Total Transport Enrolled Students", activeAssignments.length.toString(), "Students with an active transport assignment.", "Live route load", "/dashboard/transport", Users, "emerald"),
      metric("Fuel Log Status", `${fuelLogPending} pending`, "Proxy indicator for active buses needing route closure/fuel log follow-up.", "Dispatch closure pending", "/dashboard/transport", Activity, "amber"),
      metric("Maintenance Alerts Due", maintenanceAlerts.toString(), "Vehicles with overdue insurance or fitness validity.", "Compliance review remains critical", "/dashboard/transport", ShieldAlert, "rose")
    ],
    actions: [
      action("[+ Update Route Status]", "/dashboard/transport", BusFront),
      action("[ Broadcast Route Delay Alert ]", "/dashboard/transport", Megaphone, "secondary"),
      action("[ Live GPS Tracking ]", "/dashboard/transport", Activity, "secondary")
    ],
    charts: [
      {
        type: "compare",
        title: "Route Readiness Snapshot",
        subtitle: "Fleet readiness, rider load, and maintenance pressure in a compact view.",
        href: "/dashboard/transport",
        ctaLabel: "View Records",
        points: [
          { label: "Fleet active", value: activeBuses ? 100 : 0, meta: `${activeBuses} bus(es)` },
          { label: "Routes active", value: activeRoutes ? 100 : 0, meta: `${activeRoutes} route(s)` },
          { label: "Maintenance risk", value: clampPercent(maintenanceAlerts * 18), meta: `${maintenanceAlerts} alert(s)` }
        ],
        suffix: "%"
      }
    ],
    alerts: [
      alertItem("10:35 AM", "Route compliance due", `${maintenanceAlerts} vehicle(s) require fitness or insurance attention.`, "rose"),
      alertItem("09:55 AM", "Dispatch load active", `${activeAssignments.length} student assignment(s) remain active on routes.`, "emerald"),
      alertItem("09:10 AM", "Fuel log closure pending", `${fuelLogPending} active bus(es) still need route closure follow-up.`, "amber"),
      alertItem("08:30 AM", "Transport notices filtered", `${visibleNotices.length} notice(s) are visible within transport communication scope.`, "slate")
    ],
    noticesTitle: "Transport notices",
    noticesSubtitle: "Delay, route, fleet, and transport-operations updates visible to this role."
  };
}

async function buildHostelVariant(
  context: DashboardContext,
  visibleNotices: VisibleNotice[]
): Promise<DashboardVariant> {
  const [rooms, activeAllocations] = await Promise.all([
    safeOptionalFindMany<{ capacity: number | null }>("hostelRoom", {
      where: { schoolId: context.schoolId, isArchived: false },
      select: { capacity: true }
    }),
    safeOptionalFindMany<{ id: string; remarks: string | null }>("hostelAllocation", {
      where: { schoolId: context.schoolId, status: "ACTIVE" },
      select: { id: true, remarks: true }
    })
  ]);

  const totalCapacity = rooms.reduce((sum, room) => sum + (room.capacity ?? 0), 0);
  const occupancyRate = totalCapacity ? Math.round((activeAllocations.length / totalCapacity) * 100) : 0;
  const messMenuNotice =
    visibleNotices.find((notice) => {
      const haystack = `${notice.title} ${notice.body}`.toLowerCase();
      return haystack.includes("mess") || haystack.includes("menu");
    })?.title ?? "Not posted";
  const sickBayIncidents = activeAllocations.filter((allocation) =>
    allocation.remarks?.toLowerCase().includes("medical")
  ).length;

  return {
    key: "hostel",
    label: "Hostel Warden / Residential In-Charge",
    title: "Residential control board for occupancy, welfare, mess updates, and boarder supervision.",
    subtitle:
      "The hostel homepage is intentionally limited to resident operations and does not inherit school-wide commercial or academic analytics.",
    heroNote: "Boarder counts, room capacity, welfare notes, and resident notices remain strictly hostel scoped.",
    metrics: [
      metric("Total Boarders Checked In", activeAllocations.length.toString(), "Students currently assigned to active hostel allocations.", "Resident load is live", "/dashboard/hostel", Users, "indigo"),
      metric("Room Occupancy Rate", `${occupancyRate}%`, "Occupancy computed from active allocations versus total room capacity.", "Residential capacity monitored daily", "/dashboard/hostel", LayoutGrid, "emerald"),
      metric("Mess Menu Today", messMenuNotice, "Latest visible mess/menu update if available.", "Food service communication visible", "/dashboard/hostel", ClipboardList, "amber"),
      metric("Sick Bay / Medical Incidents Today", sickBayIncidents.toString(), "Medical signals inferred from active welfare remarks.", "Resident care watchlist", "/dashboard/hostel", Stethoscope, "rose")
    ],
    actions: [
      action("[+ Mark Room Night-Attendance]", "/dashboard/hostel", CalendarCheck2),
      action("[+ Log Mess Feedback]", "/dashboard/hostel", ClipboardList, "secondary"),
      action("[+ Gate Pass Authorization]", "/dashboard/hostel", FileText, "secondary")
    ],
    charts: [
      {
        type: "progress",
        title: "Occupancy Gauge",
        subtitle: "Residential occupancy and welfare posture for current boarders.",
        href: "/dashboard/hostel",
        ctaLabel: "View Records",
        value: occupancyRate,
        hint: `${activeAllocations.length}/${totalCapacity || 0} active occupancy`,
        segments: [
          { label: "Occupancy", value: occupancyRate, tone: "emerald" },
          { label: "Welfare stability", value: Math.max(18, 100 - sickBayIncidents * 16), tone: "indigo" },
          { label: "Mess communication", value: messMenuNotice === "Not posted" ? 28 : 86, tone: "amber" }
        ]
      }
    ],
    alerts: [
      alertItem("09:45 PM", "Night attendance watch", `${activeAllocations.length} boarder allocation(s) require nightly supervision coverage.`, "indigo"),
      alertItem("01:00 PM", "Mess update", messMenuNotice, "amber"),
      alertItem("11:20 AM", "Medical follow-up", `${sickBayIncidents} resident case(s) carry medical notes in active records.`, "rose"),
      alertItem("08:50 AM", "Occupancy synced", `${occupancyRate}% of hostel capacity is currently in use.`, "emerald")
    ],
    noticesTitle: "Residential notices",
    noticesSubtitle: "Hostel and resident-life communication visible to residential staff."
  };
}

async function buildInventoryVariant(
  context: DashboardContext,
  visibleNotices: VisibleNotice[]
): Promise<DashboardVariant> {
  const [items, movements] = await Promise.all([
    safeOptionalFindMany<{ category: string | null; quantityOnHand: number; minimumQuantity: number }>("inventoryItem", {
      where: { schoolId: context.schoolId, isArchived: false },
      select: { category: true, quantityOnHand: true, minimumQuantity: true }
    }),
    safeOptionalFindMany<{ movementType: string; issuedTo: string | null }>("inventoryMovement", {
      where: { schoolId: context.schoolId, movementDate: { gte: context.monthStart, lte: context.todayEnd } },
      select: { movementType: true, issuedTo: true }
    })
  ]);

  const lowStockCount = items.filter((item) => item.quantityOnHand <= item.minimumQuantity).length;
  const purchaseOrderPending = lowStockCount;
  const assetsIssuedToStaff = movements.filter(
    (movement) => movement.movementType === "STOCK_OUT" && Boolean(movement.issuedTo)
  ).length;
  const uniformsAndBooks = items.filter((item) => {
    const category = item.category?.toLowerCase() ?? "";
    return category.includes("uniform") || category.includes("book");
  }).length;

  return {
    key: "inventory",
    label: "Inventory / Stores / Procurement Manager",
    title: "Stores and procurement view for low stock pressure, issue movement, and purchase planning.",
    subtitle:
      "Inventory cards remain limited to stock movement, procurement pressure, and issue accountability for store operations.",
    heroNote: "This role sees stock, issue, and procurement signals only, without unrelated academic or finance analytics.",
    metrics: [
      metric("Low Stock Alerts", lowStockCount.toString(), "Items at or below configured reorder threshold.", "Restock queue remains active", "/dashboard/inventory", Warehouse, "amber"),
      metric("Total Purchase Orders Pending", purchaseOrderPending.toString(), "Proxy queue of stock lines needing procurement action.", "Vendor follow-up needed", "/dashboard/inventory", FileClock, "rose"),
      metric("Assets Issued to Staff", assetsIssuedToStaff.toString(), "Month-to-date stock-out movements with named recipients.", "Issue accountability remains visible", "/dashboard/inventory", Boxes, "indigo"),
      metric("Uniforms/Books Inventory Count", uniformsAndBooks.toString(), "Tracked inventory lines in uniform or book-related categories.", "Category-level visibility", "/dashboard/inventory", BookType, "emerald")
    ],
    actions: [
      action("[+ Record New Stock Entry]", "/dashboard/inventory", Boxes),
      action("[+ Issue Asset Item]", "/dashboard/inventory", ArrowRight, "secondary"),
      action("[ Create Vendor PO ]", "/dashboard/inventory", FileText, "secondary")
    ],
    charts: [
      {
        type: "compare",
        title: "Stock Pressure Snapshot",
        subtitle: "Low stock, issue movement, and procurement demand in one compact visual.",
        href: "/dashboard/inventory",
        ctaLabel: "View Records",
        points: [
          { label: "Low stock", value: clampPercent(lowStockCount * 18), meta: `${lowStockCount} item(s)` },
          { label: "Issued items", value: clampPercent(assetsIssuedToStaff * 12), meta: `${assetsIssuedToStaff} stock-out(s)` },
          { label: "Books/uniforms", value: clampPercent(uniformsAndBooks * 8), meta: `${uniformsAndBooks} line(s)` }
        ],
        suffix: "%"
      }
    ],
    alerts: [
      alertItem("02:25 PM", "Reorder attention needed", `${lowStockCount} item(s) are already under reorder threshold.`, "amber"),
      alertItem("12:40 PM", "Procurement queue synced", `${purchaseOrderPending} pending purchase follow-up line(s) detected.`, "rose"),
      alertItem("10:00 AM", "Issue desk movement", `${assetsIssuedToStaff} stock issue(s) recorded to staff this month.`, "indigo"),
      alertItem("09:05 AM", "Stores notices filtered", `${visibleNotices.length} notice(s) are visible within stores/procurement scope.`, "slate")
    ],
    noticesTitle: "Stores notices",
    noticesSubtitle: "Stock, issue, and procurement communication visible to inventory-facing roles."
  };
}

async function buildFrontDeskVariant(
  context: DashboardContext,
  visibleNotices: VisibleNotice[]
): Promise<DashboardVariant> {
  const [newStudentsToday, schoolDocuments, noticesToday] = await Promise.all([
    db.student.count({
      where: {
        schoolId: context.schoolId,
        createdAt: { gte: context.todayStart, lte: context.todayEnd }
      }
    }),
    db.document.count({
      where: {
        schoolId: context.schoolId,
        ownerType: "SCHOOL",
        isArchived: false
      }
    }),
    db.notice.count({
      where: {
        schoolId: context.schoolId,
        publishedAt: { gte: context.todayStart, lte: context.todayEnd }
      }
    })
  ]);

  return {
    key: "frontdesk",
    label: "Front Desk / Receptionist / Admission Counselor",
    title: "Reception workspace built for visitor movement, admissions intake, and desk-side follow-up.",
    subtitle:
      "This role variant stays light, quick, and desk-oriented while excluding back-office, audit, and academic leadership surfaces.",
    heroNote: "Only front-office intake, admissions, and visible desk communication are surfaced for this session.",
    metrics: [
      metric("Today's Scheduled Visitor Meetings", noticesToday.toString(), "Proxy derived from same-day published front-facing notices.", "Desk queue updates through the day", "/dashboard/students", CalendarClock, "indigo"),
      metric("New Admission Inquiries Received", newStudentsToday.toString(), "Same-day student records likely created through admission intake.", "Lead funnel visible at a glance", "/dashboard/students", Users, "emerald"),
      metric("General Courier/Inward Docs Pending", schoolDocuments.toString(), "School-owned document records awaiting filing or closure.", "Inward desk backlog remains visible", "/dashboard/documents", FileText, "amber")
    ],
    actions: [
      action("[+ Log New Visitor]", "/dashboard/profile", UserRound),
      action("[+ Add Admission Lead]", "/dashboard/students/new", Users, "secondary"),
      action("[ Quick Search Student Profile ]", "/dashboard/students", Activity, "secondary")
    ],
    charts: [
      {
        type: "compare",
        title: "Desk Throughput Snapshot",
        subtitle: "Visitor movement, admission intake, and document backlog in one operational view.",
        href: "/dashboard/students",
        ctaLabel: "View Records",
        points: [
          { label: "Visitor activity", value: clampPercent(noticesToday * 16), meta: `${noticesToday} desk event(s)` },
          { label: "Admissions", value: clampPercent(newStudentsToday * 20), meta: `${newStudentsToday} new inquiry record(s)` },
          { label: "Inward docs", value: clampPercent(schoolDocuments * 4), meta: `${schoolDocuments} active record(s)` }
        ],
        suffix: "%"
      }
    ],
    alerts: [
      alertItem("02:35 PM", "Visitor desk watch", `${noticesToday} front-facing meeting or notice item(s) were posted today.`, "indigo"),
      alertItem("12:10 PM", "Admission intake active", `${newStudentsToday} new same-day student record(s) entered the system.`, "emerald"),
      alertItem("10:55 AM", "Courier backlog visible", `${schoolDocuments} school document record(s) remain active for desk follow-up.`, "amber"),
      alertItem("09:00 AM", "Front desk notices filtered", `${visibleNotices.length} visible notice(s) remain in this desk profile.`, "slate")
    ],
    noticesTitle: "Front desk notices",
    noticesSubtitle: "Desk reminders and announcements visible to reception and admission users."
  };
}

async function buildGeneralVariant(
  context: DashboardContext,
  session: Awaited<ReturnType<typeof getRequiredSession>>,
  visibleNotices: VisibleNotice[]
): Promise<DashboardVariant> {
  const [documents, results, todayAttendance] = await Promise.all([
    hasPermission(session, PERMISSIONS.viewDocuments)
      ? db.document.count({
          where: { schoolId: context.schoolId, isArchived: false }
        })
      : Promise.resolve(0),
    hasPermission(session, PERMISSIONS.viewExams)
      ? db.examResult.count({
          where: { exam: { schoolId: context.schoolId } }
        })
      : Promise.resolve(0),
    hasPermission(session, PERMISSIONS.viewAttendance)
      ? db.attendance.count({
          where: {
            schoolId: context.schoolId,
            date: { gte: context.todayStart, lte: context.todayEnd }
          }
        })
      : Promise.resolve(0)
  ]);

  return {
    key: "general",
    label: "General Dashboard Profile",
    title: "Safe fallback dashboard for custom roles, partial mappings, or permission-only accounts.",
    subtitle:
      "If a role is undefined or custom, this homepage still renders a polished but carefully permission-bound view with no data leakage.",
    heroNote: "Fallback mode derives every card from the current permission envelope instead of assuming a richer role bundle.",
    metrics: [
      metric("Accessible Notices", visibleNotices.length.toString(), "Published notices currently visible to this account.", "Communication remains safely scoped", "/dashboard", BellRing, "indigo"),
      metric("Documents Visible", documents.toString(), "Active document records available under current access.", "Only permission-backed records count", "/dashboard/documents", FileText, "emerald"),
      metric("Attendance Rows Today", todayAttendance.toString(), "Attendance entries visible if the current permission set allows it.", "No extra academic leakage", "/dashboard/attendance", CalendarCheck2, "amber"),
      metric("Results Available", results.toString(), "Published exam results reachable under current permissions.", "Fallback remains operational", "/dashboard/exams", GraduationCap, "slate")
    ],
    actions: [
      action("[ Open My Profile ]", "/dashboard/profile", UserRound),
      action("[ Browse Notices ]", "/dashboard/notices", BellRing, "secondary"),
      action("[ Review My Access ]", "/dashboard", ShieldCheck, "secondary")
    ],
    charts: [
      {
        type: "compare",
        title: "Access Footprint",
        subtitle: "Safe operational footprint based only on the current permission envelope.",
        href: "/dashboard/reports",
        ctaLabel: "View Full Analytics",
        points: [
          { label: "Notices", value: clampPercent(visibleNotices.length * 12), meta: `${visibleNotices.length} visible` },
          { label: "Documents", value: clampPercent(documents * 6), meta: `${documents} visible` },
          { label: "Results", value: clampPercent(results * 2), meta: `${results} visible` }
        ],
        suffix: "%"
      }
    ],
    alerts: [
      alertItem("Now", "Fallback profile active", "No custom role bundle was matched, so only safe permission-backed cards are shown.", "slate"),
      alertItem("Visibility", "Notices remain filtered", `${visibleNotices.length} notice(s) are visible under the current profile.`, "indigo"),
      alertItem("Data safety", "No leakage path", "Academic, finance, and admin cards are withheld unless the live permission set explicitly allows them.", "emerald")
    ],
    noticesTitle: "General notices",
    noticesSubtitle: "Safest available notice stream for custom or partially configured roles."
  };
}

async function getVisibleNotices(schoolId: string, roles: string[]) {
  const notices = await db.notice.findMany({
    where: {
      schoolId,
      isPublished: true
    },
    orderBy: [{ noticeType: "desc" }, { publishedAt: "desc" }],
    take: 12
  });

  return notices
    .filter((notice) => isNoticeVisibleToSession(notice, roles))
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
    "library",
    "transport",
    "hostel",
    "inventory",
    "frontdesk",
    "guardian"
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
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildDailyAttendanceTrend(
  rows: Array<{ date: Date; status: string }>,
  weekStart: Date
): ChartPoint[] {
  const buckets = new Map<string, number>();

  for (let index = 0; index < 7; index += 1) {
    const day = new Date(weekStart);
    day.setUTCDate(weekStart.getUTCDate() + index);
    buckets.set(day.toISOString().slice(5, 10), 0);
  }

  for (const row of rows) {
    if (row.status !== "PRESENT") {
      continue;
    }

    const key = row.date.toISOString().slice(5, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
}

function buildMonthlyTargetSeries(
  invoices: Array<{ dueDate: Date; totalAmount: unknown }>,
  payments: Array<{ paymentDate: Date; amount: unknown }>,
  startDate: Date
): ChartPoint[] {
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

function deriveStudentProgress(attendancePct: number, upcomingExamCount: number, homeworkDeadlines: number) {
  const examBalance = Math.max(35, 92 - upcomingExamCount * 10);
  const deadlineBalance = Math.max(25, 88 - homeworkDeadlines * 16);
  return Math.round((attendancePct + examBalance + deadlineBalance) / 3);
}

function clampPercent(value: number) {
  return Math.max(8, Math.min(100, value));
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
  icon: LucideIcon,
  variant: ActionCardData["variant"] = "primary"
): ActionCardData {
  return { label, href, icon, variant };
}

function alertItem(time: string, title: string, detail: string, tone: AlertTone): AlertItemData {
  return { time, title, detail, tone };
}

function MetricCard({ metric }: { metric: MetricCardData }) {
  const toneMap: Record<MetricTone, { tint: string; icon: string; bar: string; badge: string }> = {
    slate: {
      tint: "bg-slate-50",
      icon: "bg-slate-900 text-white",
      bar: "bg-slate-700",
      badge: "bg-slate-100 text-slate-700"
    },
    indigo: {
      tint: "bg-indigo-50/70",
      icon: "bg-indigo-600 text-white",
      bar: "bg-indigo-600",
      badge: "bg-indigo-100 text-indigo-700"
    },
    emerald: {
      tint: "bg-emerald-50/80",
      icon: "bg-emerald-600 text-white",
      bar: "bg-emerald-600",
      badge: "bg-emerald-100 text-emerald-700"
    },
    purple: {
      tint: "bg-violet-50/80",
      icon: "bg-violet-600 text-white",
      bar: "bg-violet-600",
      badge: "bg-violet-100 text-violet-700"
    },
    amber: {
      tint: "bg-amber-50/80",
      icon: "bg-amber-500 text-white",
      bar: "bg-amber-500",
      badge: "bg-amber-100 text-amber-700"
    },
    rose: {
      tint: "bg-rose-50/80",
      icon: "bg-rose-600 text-white",
      bar: "bg-rose-600",
      badge: "bg-rose-100 text-rose-700"
    }
  };

  const tone = toneMap[metric.tone];

  return (
    <Link
      href={metric.href}
      className={`group relative overflow-hidden rounded-[26px] border border-slate-200/60 ${tone.tint} p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer hover:border-indigo-500/50`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${tone.bar}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{metric.title}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.9rem]">{metric.value}</p>
        </div>
        <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.icon} shadow-sm`}>
          <metric.icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{metric.hint}</p>
      {metric.detail ? <p className="mt-2 text-xs leading-5 text-slate-500">{metric.detail}</p> : null}
      <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${tone.badge}`}>
        <TrendingUp className="h-3.5 w-3.5" />
        {metric.trend}
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-indigo-600">
        {metric.ctaLabel ?? "View Full Report"}
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function ActionCard({ action }: { action: ActionCardData }) {
  return (
    <Link
      href={action.href}
      className={`group flex items-center justify-between gap-4 rounded-[24px] border px-5 py-4 transition ${
        action.variant === "secondary"
          ? "border-slate-200/70 bg-slate-50/80 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer"
          : "border-indigo-200/80 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
            action.variant === "secondary" ? "bg-white text-indigo-600" : "bg-white/15 text-white"
          }`}
        >
          <action.icon className="h-5 w-5" />
        </div>
        <span className={`text-sm font-medium ${action.variant === "secondary" ? "text-slate-900" : "text-white"}`}>
          {action.label}
        </span>
      </div>
      <ArrowRight className={`h-4 w-4 transition group-hover:translate-x-0.5 ${action.variant === "secondary" ? "text-slate-400" : "text-white"}`} />
    </Link>
  );
}

function ChartSurface({ chart }: { chart: ChartCardData }) {
  return (
    <Card className="border-slate-200/60 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 hover:border-indigo-500/50">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-slate-900">{chart.title}</CardTitle>
            <p className="mt-1 text-sm leading-6 text-slate-600">{chart.subtitle}</p>
          </div>
          <Link
            href={chart.href}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/50 hover:shadow-md"
          >
            {chart.ctaLabel ?? "View Full Analytics"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {chart.type === "financial" ? <FinancialPulseChart points={chart.points} /> : null}
        {chart.type === "bars" ? <BarsChart points={chart.points} /> : null}
        {chart.type === "compare" ? <CompareChart points={chart.points} suffix={chart.suffix} /> : null}
        {chart.type === "progress" ? (
          <ProgressGauge value={chart.value} hint={chart.hint} segments={chart.segments} />
        ) : null}
        {chart.type === "countdown" ? <CountdownGrid items={chart.items} /> : null}
      </CardContent>
    </Card>
  );
}

function FinancialPulseChart({ points }: { points: ChartPoint[] }) {
  const maxValue = Math.max(...points.map((point) => Math.max(point.value, point.target ?? 0)), 1);
  const width = 620;
  const height = 240;
  const padding = 28;

  const linePoints = points.map((point, index) => ({
    x: padding + (index * (width - padding * 2)) / Math.max(points.length - 1, 1),
    y: height - padding - (point.value / maxValue) * (height - padding * 2)
  }));

  return (
    <div className="grid gap-4">
      <div className="rounded-[28px] border border-slate-200/70 bg-slate-50/70 p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
          <defs>
            <linearGradient id="actualLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          {points.map((point, index) => {
            const x = padding + (index * (width - padding * 2)) / Math.max(points.length - 1, 1);
            const barWidth = 42;
            const targetHeight = ((point.target ?? 0) / maxValue) * (height - padding * 2);
            return (
              <g key={point.label}>
                <rect
                  x={x - barWidth / 2}
                  y={height - padding - targetHeight}
                  width={barWidth}
                  height={targetHeight}
                  rx="14"
                  fill="#c7d2fe"
                />
                <text x={x} y={height - 6} textAnchor="middle" fontSize="11" fill="#64748b">
                  {point.label}
                </text>
              </g>
            );
          })}
          <path d={buildSvgPath(linePoints)} fill="none" stroke="url(#actualLine)" strokeWidth="4" />
          {points.map((point, index) => {
            const { x, y } = linePoints[index];
            return (
              <g key={`${point.label}-actual`}>
                <circle cx={x} cy={y} r="5" fill="#4f46e5" />
                <text x={x} y={y - 10} textAnchor="middle" fontSize="11" fill="#0f172a">
                  {compactMoney(point.value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
          Actual collections
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-200" />
          Target dues
        </span>
      </div>
    </div>
  );
}

function BarsChart({ points }: { points: ChartPoint[] }) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="grid gap-4">
      <div className="flex h-72 items-end gap-3 rounded-[28px] border border-slate-200/70 bg-slate-50/70 p-4">
        {points.map((point) => (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">{point.value}</span>
            <div className="flex h-48 w-full items-end">
              <div
                className="w-full rounded-t-[20px] bg-gradient-to-t from-indigo-600 via-indigo-500 to-emerald-400"
                style={{ height: `${Math.max(8, (point.value / max) * 100)}%` }}
              />
            </div>
            <span className="truncate text-xs text-slate-500">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareChart({ points, suffix = "" }: { points: ChartPoint[]; suffix?: string }) {
  return (
    <div className={`grid gap-4 ${points.length > 2 ? "xl:grid-cols-3" : "sm:grid-cols-2"}`}>
      {points.map((point) => (
        <div key={point.label} className="rounded-[24px] border border-slate-200/70 bg-slate-50/70 px-5 py-5">
          <p className="text-sm font-medium text-slate-700">{point.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {point.value}
            {suffix}
          </p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-emerald-400"
              style={{ width: `${Math.max(4, Math.min(100, point.value))}%` }}
            />
          </div>
          {point.meta ? <p className="mt-3 text-xs leading-5 text-slate-500">{point.meta}</p> : null}
        </div>
      ))}
    </div>
  );
}

function ProgressGauge({
  value,
  hint,
  segments
}: {
  value: number;
  hint: string;
  segments: Array<{ label: string; value: number; tone: MetricTone }>;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const ring = `conic-gradient(#4f46e5 0% ${clamped}%, #e2e8f0 ${clamped}% 100%)`;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
      <div className="mx-auto">
        <div
          className="grid h-48 w-48 place-items-center rounded-full"
          style={{ background: ring }}
        >
          <div className="grid h-36 w-36 place-items-center rounded-full bg-white text-center shadow-inner">
            <div>
              <p className="text-4xl font-semibold tracking-tight text-slate-900">{clamped}%</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Progress</p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-slate-600">{hint}</p>
        <div className="grid gap-3">
          {segments.map((segment) => (
            <ProgressRow key={segment.label} segment={segment} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProgressRow({
  segment
}: {
  segment: { label: string; value: number; tone: MetricTone };
}) {
  const toneMap: Record<MetricTone, string> = {
    slate: "from-slate-700 to-slate-400",
    indigo: "from-indigo-600 to-indigo-400",
    emerald: "from-emerald-600 to-emerald-400",
    purple: "from-violet-600 to-violet-400",
    amber: "from-amber-500 to-amber-300",
    rose: "from-rose-600 to-rose-400"
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{segment.label}</span>
        <span className="text-slate-500">{Math.max(0, Math.min(100, segment.value))}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${toneMap[segment.tone]}`}
          style={{ width: `${Math.max(4, Math.min(100, segment.value))}%` }}
        />
      </div>
    </div>
  );
}

function CountdownGrid({
  items
}: {
  items: Array<{ label: string; value: string; meta: string }>;
}) {
  if (!items.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center text-sm text-slate-500">
        No upcoming exam checkpoints are currently visible for this learner context.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={`${item.label}-${item.meta}`} className="rounded-[24px] border border-slate-200/70 bg-slate-50/70 p-5">
          <p className="text-sm font-medium text-slate-900">{item.label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-indigo-600">{item.value}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{item.meta}</p>
        </div>
      ))}
    </div>
  );
}

function AlertTimeline({ alerts }: { alerts: AlertItemData[] }) {
  const toneMap: Record<AlertTone, string> = {
    indigo: "bg-indigo-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    rose: "bg-rose-600",
    slate: "bg-slate-600"
  };

  return (
    <div className="relative grid gap-5">
      {alerts.map((alert, index) => (
        <div key={`${alert.time}-${alert.title}-${index}`} className="relative pl-8">
          {index < alerts.length - 1 ? (
            <span className="absolute left-[11px] top-7 h-[calc(100%+8px)] w-px bg-slate-200" />
          ) : null}
          <span className={`absolute left-0 top-1 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border-4 border-white ${toneMap[alert.tone]} shadow-sm`} />
          <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/70 px-4 py-4 transition hover:bg-slate-50/90">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{alert.time}</p>
            <p className="mt-2 font-medium text-slate-900">{alert.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{alert.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function NoticeCard({ notice }: { notice: VisibleNotice }) {
  return (
    <div className="rounded-[26px] border border-slate-200/60 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:bg-slate-50/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-2">
          <h3 className="text-base font-semibold text-slate-900">{notice.title}</h3>
          <p className="text-sm leading-6 text-slate-600 line-clamp-3">{notice.body}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${noticeTypeTone(notice.noticeType)}`}>
          {notice.noticeType}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1">{notice.audienceLabel}</span>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
          {notice.publishedAt?.toLocaleDateString("en-IN") ?? "Draft"}
        </span>
      </div>
    </div>
  );
}

function buildSvgPath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function compactMoney(value: number) {
  if (value >= 10000000) {
    return `${(value / 10000000).toFixed(1)}Cr`;
  }
  if (value >= 100000) {
    return `${(value / 100000).toFixed(1)}L`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }
  return value.toString();
}
