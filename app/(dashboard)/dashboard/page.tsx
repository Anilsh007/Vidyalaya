import {
  BarChart3,
  BookOpenCheck,
  CalendarCheck2,
  ClipboardList,
  FileBadge2,
  IndianRupee,
  ShieldCheck,
  Users
} from "lucide-react";
import type { ReactNode } from "react";

import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { db } from "@/lib/db";
import { getRequiredSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/access";
import { isNoticeVisibleToSession, noticeTypeTone } from "@/lib/notices";
import { PERMISSIONS } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getRequiredSession();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  const canViewStudents = hasPermission(session, PERMISSIONS.viewStudents);
  const canViewStaff = hasPermission(session, PERMISSIONS.viewStaff);
  const canViewDocuments = hasPermission(session, PERMISSIONS.viewDocuments);
  const canViewAttendance = hasPermission(session, PERMISSIONS.viewAttendance);
  const canViewExams = hasPermission(session, PERMISSIONS.viewExams);
  const canManageFees = hasPermission(session, PERMISSIONS.manageFees);
  const canViewAudit = hasPermission(session, PERMISSIONS.viewAuditLogs);
  const canViewReports = hasPermission(session, PERMISSIONS.viewReports);
  const canManageNotices = hasPermission(session, PERMISSIONS.manageNotices);

  const [
    latestNotices,
    studentCount,
    staffCount,
    invoiceAggregate,
    todayAttendanceCount,
    todayPresentCount,
    todayAbsentCount,
    todayCollectionAmount,
    totalOutstandingAggregate,
    documentCount,
    auditCount,
    resultCount
  ] = await Promise.all([
    db.notice.findMany({
      where: {
        schoolId: session.schoolId,
        isPublished: true
      },
      orderBy: [{ noticeType: "desc" }, { publishedAt: "desc" }],
      take: 12
    }),
    canViewStudents ? db.student.count({ where: { schoolId: session.schoolId } }) : Promise.resolve(null),
    canViewStaff ? db.staff.count({ where: { schoolId: session.schoolId } }) : Promise.resolve(null),
    canManageFees
      ? db.feeInvoice.aggregate({
          where: { schoolId: session.schoolId },
          _sum: { totalAmount: true, paidAmount: true }
        })
      : Promise.resolve(null),
    canViewAttendance
      ? db.attendance.count({
          where: {
            schoolId: session.schoolId,
            date: {
              gte: todayStart,
              lte: todayEnd
            }
          }
        })
      : Promise.resolve(null),
    canViewAttendance
      ? db.attendance.count({
          where: {
            schoolId: session.schoolId,
            status: "PRESENT",
            date: {
              gte: todayStart,
              lte: todayEnd
            }
          }
        })
      : Promise.resolve(null),
    canViewAttendance
      ? db.attendance.count({
          where: {
            schoolId: session.schoolId,
            status: "ABSENT",
            date: {
              gte: todayStart,
              lte: todayEnd
            }
          }
        })
      : Promise.resolve(null),
    canManageFees
      ? db.feePayment.aggregate({
          where: {
            schoolId: session.schoolId,
            paymentDate: {
              gte: todayStart,
              lte: todayEnd
            }
          },
          _sum: { amount: true }
        })
      : Promise.resolve(null),
    canManageFees
      ? db.feeInvoice.aggregate({
          where: { schoolId: session.schoolId },
          _sum: { totalAmount: true, paidAmount: true }
        })
      : Promise.resolve(null),
    canViewDocuments
      ? db.document.count({
          where: { schoolId: session.schoolId, isArchived: false }
        })
      : Promise.resolve(null),
    canViewAudit
      ? db.auditLog.count({
          where: { schoolId: session.schoolId }
        })
      : Promise.resolve(null),
    canViewExams
      ? db.examResult.count({
          where: { exam: { schoolId: session.schoolId } }
        })
      : Promise.resolve(null)
  ]);

  const visibleNotices = latestNotices
    .filter((notice) => isNoticeVisibleToSession(notice, session.roles))
    .sort((a, b) => {
      if (a.noticeType === b.noticeType) {
        return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
      }
      return a.noticeType === "IMPORTANT" ? -1 : 1;
    })
    .slice(0, 5);

  const totalBilled = Number(invoiceAggregate?._sum.totalAmount ?? 0);
  const totalPaid = Number(invoiceAggregate?._sum.paidAmount ?? 0);
  const todayCollection = Number(todayCollectionAmount?._sum.amount ?? 0);
  const totalOutstanding = Math.max(
    0,
    Number(totalOutstandingAggregate?._sum.totalAmount ?? 0) -
      Number(totalOutstandingAggregate?._sum.paidAmount ?? 0)
  );

  const metricCards = [
    canViewStudents && studentCount !== null
      ? {
          icon: <ClipboardList className="h-5 w-5" />,
          label: "Students",
          value: studentCount.toString()
        }
      : null,
    canViewStaff && staffCount !== null
      ? {
          icon: <Users className="h-5 w-5" />,
          label: "Staff",
          value: staffCount.toString()
        }
      : null,
    canManageFees
      ? {
          icon: <IndianRupee className="h-5 w-5" />,
          label: "Fees collected",
          value: formatCurrency(totalPaid)
        }
      : null,
    canViewAttendance && todayAttendanceCount !== null
      ? {
          icon: <CalendarCheck2 className="h-5 w-5" />,
          label: "Attendance today",
          value: todayAttendanceCount.toString()
        }
      : null,
    canViewDocuments && documentCount !== null
      ? {
          icon: <FileBadge2 className="h-5 w-5" />,
          label: "Documents",
          value: documentCount.toString()
        }
      : null,
    canViewExams && resultCount !== null
      ? {
          icon: <BarChart3 className="h-5 w-5" />,
          label: "Results published",
          value: resultCount.toString()
        }
      : null
  ].filter(Boolean) as Array<{ icon: ReactNode; label: string; value: string }>;

  const summaryRows = [
    { label: "Active roles", value: session.roles.join(", ") || "No role assigned" },
    {
      label: "Reports access",
      value: canViewReports ? "Allowed for this account" : "Not granted for this account"
    },
    { label: "Visible notices", value: visibleNotices.length.toString() },
    canManageNotices ? { label: "Notice workspace", value: "Manage access available" } : null,
    canManageFees ? { label: "Invoices raised", value: formatCurrency(totalBilled) } : null,
    canViewAttendance && todayPresentCount !== null && todayAbsentCount !== null
      ? {
          label: "Present today",
          value: `${todayPresentCount} present, ${todayAbsentCount} absent`
        }
      : null,
    canManageFees ? { label: "Collected today", value: formatCurrency(todayCollection) } : null,
    canManageFees ? { label: "Outstanding dues", value: formatCurrency(totalOutstanding) } : null,
    canViewAudit && auditCount !== null ? { label: "Audit entries", value: auditCount.toString() } : null
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const hasSchoolWideAccess = metricCards.length > 0;

  return (
    <div className="grid gap-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-white shadow-panel">
          <div className="grid gap-5 bg-[linear-gradient(135deg,#0f172a_0%,#1d3b8b_100%)] px-5 py-6 sm:px-6">
            <div className="grid gap-3">
              <h2 className="max-w-3xl text-balance text-2xl font-semibold leading-tight">
                {hasSchoolWideAccess
                  ? "Your dashboard now reflects the permissions granted to this account."
                  : "Your account is active. This dashboard shows only the areas allowed for your role."}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-blue-100">
                {hasSchoolWideAccess
                  ? "Counts and shortcuts below are now permission-aware, so users only see school-wide data for the modules they are allowed to access."
                  : "If more modules are needed for this role, an administrator can update the assigned permissions and the next request will use the latest access rules."}
              </p>
            </div>

            {metricCards.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {metricCards.map((card) => (
                  <MetricCard key={card.label} icon={card.icon} label={card.label} value={card.value} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <p className="text-sm text-blue-100">Restricted account</p>
                <p className="mt-1 text-base font-semibold text-white">
                  School-wide operational metrics are hidden for this role.
                </p>
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <p className="text-sm leading-6 text-slate-600">
              Current access summary for this signed-in account.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3">
            {summaryRows.map((row) => (
              <InfoRow key={row.label} label={row.label} value={row.value} />
            ))}
            <Dialog
              title="How access now behaves"
              description="Dashboard metrics, sidebar visibility, and page protection all use the same permission set."
              triggerLabel="View access notes"
            >
              <div className="grid gap-2 text-sm text-slate-600">
                <p>1. Sidebar items appear only when the account has access to that workspace.</p>
                <p>2. Dashboard metrics are hidden when the role is not allowed to view that module's data.</p>
                <p>3. Page guards still block direct URL access when a permission is missing.</p>
                <p>4. Session permissions are refreshed from the database on each request.</p>
              </div>
            </Dialog>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent notices</CardTitle>
            <p className="text-sm text-slate-600">
              Only notices visible to the current role are listed here.
            </p>
          </CardHeader>
          <CardContent>
            {visibleNotices.length ? (
              <Table>
                <THead>
                  <tr>
                    <TH>Title</TH>
                    <TH>Type</TH>
                    <TH>Audience</TH>
                    <TH>Published</TH>
                  </tr>
                </THead>
                <TBody>
                  {visibleNotices.map((notice) => (
                    <tr key={notice.id}>
                      <TD className="font-medium text-slate-950">{notice.title}</TD>
                      <TD>
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${noticeTypeTone(notice.noticeType)}`}>
                          {notice.noticeType}
                        </span>
                      </TD>
                      <TD>{notice.audienceLabel}</TD>
                      <TD>{notice.publishedAt?.toLocaleDateString("en-IN") ?? "Draft"}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            ) : (
              <div className="grid gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                <p>No notices are available for this role yet.</p>
                <p>Admins and principals can publish audience-specific notices from the notice workspace.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access behavior</CardTitle>
            <p className="text-sm text-slate-600">
              What this account can expect when opening dashboard modules.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <AccessHint
              title="Navigation is filtered"
              description="The sidebar now hides modules that this account cannot open."
              icon={<ShieldCheck className="h-5 w-5" />}
            />
            <AccessHint
              title="Direct links are still protected"
              description="Even if someone opens a saved URL manually, page guards will deny access without permission."
              icon={<BookOpenCheck className="h-5 w-5" />}
            />
            <AccessHint
              title="Role updates apply on the next request"
              description="Permissions are rebuilt from the database whenever the user loads a new page."
              icon={<Users className="h-5 w-5" />}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
        {icon}
      </div>
      <p className="text-sm text-blue-100">{label}</p>
      <p className="mt-1 break-words text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-950">{value}</span>
    </div>
  );
}

function AccessHint({
  title,
  description,
  icon
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-panel">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-brand-700">
        {icon}
      </div>
      <p className="font-medium text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
