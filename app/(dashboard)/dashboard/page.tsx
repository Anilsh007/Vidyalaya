import {
  BarChart3,
  BookOpenCheck,
  CalendarCheck2,
  ClipboardList,
  FileBadge2,
  IndianRupee,
  ShieldCheck
} from "lucide-react";
import type { ReactNode } from "react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { db } from "@/lib/db";
import { getRequiredSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/access";
import { isNoticeVisibleToSession, noticeTypeTone } from "@/lib/notices";
import { PERMISSIONS } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";

const quickLinks = [
  {
    title: "Audit activity center",
    note: "Phase 26 adds searchable activity logs for logins, record changes, finance actions, documents, and academic operations."
  },
  {
    title: "Document center",
    note: "Phase 25 adds school, student, staff, and user document references with owner filters and archive controls."
  },
  {
    title: "Staff register",
    note: "Phase 24 adds employee profiles, teaching and non-teaching filters, contact lookup, and archive controls."
  },
  {
    title: "Student register",
    note: "Admissions, profile editing, guardian links, and archive controls are now active."
  },
  {
    title: "Attendance workspace",
    note: "Mark daily class attendance, review class-wise reports, and track monthly summaries."
  },
  {
    title: "Exams and report cards",
    note: "Exam setup, marks entry, grading, result summaries, and printable report cards are now active."
  }
];

export default async function DashboardPage() {
  const session = await getRequiredSession();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  const [
    studentCount,
    staffCount,
    noticeCount,
    invoiceAggregate,
    latestNotices,
    todayAttendanceCount,
    todayPresentCount,
    todayAbsentCount,
    todayCollectionAmount,
    totalOutstandingAggregate,
    documentCount,
    auditCount,
    examCount,
    resultCount
  ] =
    await Promise.all([
      db.student.count({ where: { schoolId: session.schoolId } }),
      db.staff.count({ where: { schoolId: session.schoolId } }),
      db.notice.count({ where: { schoolId: session.schoolId } }),
      db.feeInvoice.aggregate({
        where: { schoolId: session.schoolId },
        _sum: { totalAmount: true, paidAmount: true }
      }),
      db.notice.findMany({
        where: {
          schoolId: session.schoolId,
          isPublished: true
        },
        orderBy: [{ noticeType: "desc" }, { publishedAt: "desc" }],
        take: 12
      }),
      db.attendance.count({
        where: {
          schoolId: session.schoolId,
          date: {
            gte: todayStart,
            lte: todayEnd
          }
        }
      }),
      db.attendance.count({
        where: {
          schoolId: session.schoolId,
          status: "PRESENT",
          date: {
            gte: todayStart,
            lte: todayEnd
          }
        }
      }),
      db.attendance.count({
        where: {
          schoolId: session.schoolId,
          status: "ABSENT",
          date: {
            gte: todayStart,
            lte: todayEnd
          }
        }
      }),
      db.feePayment.aggregate({
        where: {
          schoolId: session.schoolId,
          paymentDate: {
            gte: todayStart,
            lte: todayEnd
          }
        },
        _sum: { amount: true }
      }),
      db.feeInvoice.aggregate({
        where: { schoolId: session.schoolId },
        _sum: { totalAmount: true, paidAmount: true }
      }),
      db.document.count({
        where: { schoolId: session.schoolId, isArchived: false }
      }),
      db.auditLog.count({
        where: { schoolId: session.schoolId }
      }),
      db.exam.count({
        where: { schoolId: session.schoolId }
      }),
      db.examResult.count({
        where: { exam: { schoolId: session.schoolId } }
      })
    ]);

  const canViewReports = hasPermission(session, PERMISSIONS.viewReports);
  const visibleNotices = latestNotices
    .filter((notice) => isNoticeVisibleToSession(notice, session.roles))
    .sort((a, b) => {
      if (a.noticeType === b.noticeType) {
        return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
      }
      return a.noticeType === "IMPORTANT" ? -1 : 1;
    })
    .slice(0, 5);
  const totalBilled = Number(invoiceAggregate._sum.totalAmount ?? 0);
  const totalPaid = Number(invoiceAggregate._sum.paidAmount ?? 0);
  const todayCollection = Number(todayCollectionAmount._sum.amount ?? 0);
  const totalOutstanding = Math.max(
    0,
    Number(totalOutstandingAggregate._sum.totalAmount ?? 0) -
      Number(totalOutstandingAggregate._sum.paidAmount ?? 0)
  );

  return (
    <div className="grid gap-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-white shadow-panel">
          <div className="grid gap-5 bg-[linear-gradient(135deg,#0f172a_0%,#1d3b8b_100%)] px-5 py-6 sm:px-6">
            <div className="grid gap-3">
              <p className="text-xs uppercase tracking-[0.14em] text-blue-200">
                Phase 26 operations
              </p>
              <h2 className="max-w-3xl text-balance text-2xl font-semibold leading-tight">
                The ERP now covers audit visibility, document records, staff records, school setup, student records, and day-to-day academic operations.
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-blue-100">
                This screen stays operational, not promotional. It gives staff a fast starting point
                for activity review, document lookup, staff records, admissions, daily attendance, finance visibility, and exam workflows.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={<ClipboardList className="h-5 w-5" />}
                label="Students"
                value={studentCount.toString()}
              />
              <MetricCard
                icon={<BookOpenCheck className="h-5 w-5" />}
                label="Staff"
                value={staffCount.toString()}
              />
              <MetricCard
                icon={<IndianRupee className="h-5 w-5" />}
                label="Fees collected"
                value={formatCurrency(totalPaid)}
              />
              <MetricCard
                icon={<CalendarCheck2 className="h-5 w-5" />}
                label="Attendance today"
                value={todayAttendanceCount.toString()}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                icon={<FileBadge2 className="h-5 w-5" />}
                label="Documents"
                value={documentCount.toString()}
              />
              <MetricCard
                icon={<BarChart3 className="h-5 w-5" />}
                label="Results published"
                value={resultCount.toString()}
              />
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Control summary</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Current access, finance totals, and next implementation tracks for this starter.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="Active roles" value={session.roles.join(", ")} />
            <InfoRow label="Notices published" value={noticeCount.toString()} />
            <InfoRow label="Invoices raised" value={formatCurrency(totalBilled)} />
            <InfoRow
              label="Present today"
              value={`${todayPresentCount} present, ${todayAbsentCount} absent`}
            />
            <InfoRow label="Collected today" value={formatCurrency(todayCollection)} />
            <InfoRow label="Outstanding dues" value={formatCurrency(totalOutstanding)} />
            <InfoRow label="Audit entries" value={auditCount.toString()} />
            <InfoRow
              label="Reports access"
              value={canViewReports ? "Allowed for this account" : "Not yet granted"}
            />
            <Dialog
              title="What this foundation includes"
              description="This is the first clean layer of the product so future modules can be added without rework."
              triggerLabel="View phase scope"
            >
              <div className="grid gap-2 text-sm text-slate-600">
                <p>1. Next.js App Router structure with protected dashboard routes.</p>
                <p>2. Custom credentials authentication with signed cookies and role checks.</p>
                <p>3. Prisma schema for the core school ERP domain.</p>
                <p>4. Docker and PostgreSQL self-hosting setup with local deployment guides.</p>
              </div>
            </Dialog>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Implementation queue</CardTitle>
            <p className="text-sm text-slate-600">
              Recommended next tracks after the foundation installs cleanly.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3">
            {quickLinks.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <p className="font-medium text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent notices</CardTitle>
            <p className="text-sm text-slate-600">
              Seeded notices or live school notices will appear here for admins and principals.
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
                <p>No notices have been published yet.</p>
                <p>Create admin and principal notice workflows in the next content phase.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SupportCard
          title="Protected routes"
          icon={<ShieldCheck className="h-5 w-5" />}
          description="Private dashboard pages are guarded by route proxy and server-side session checks."
        />
        <SupportCard
          title="Server-first data"
          icon={<BarChart3 className="h-5 w-5" />}
          description="Prisma access stays on the server so database credentials never reach the client."
        />
        <SupportCard
          title="Reusable UI"
          icon={<ClipboardList className="h-5 w-5" />}
          description="Buttons, forms, tables, receipts, reports, and attendance sheets reuse the same shared patterns."
        />
        <SupportCard
          title="LAN deployment"
          icon={<IndianRupee className="h-5 w-5" />}
          description="Docker Compose, persistent volumes, and local network guidance are included."
        />
      </section>

      <div className="flex justify-end">
        <Button variant="secondary" disabled>
          Next module coming in the following phase
        </Button>
      </div>
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

function SupportCard({
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
