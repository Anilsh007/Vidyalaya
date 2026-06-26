import Link from "next/link";
import { Activity, CalendarDays, History, Search, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/school/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { auditActionLabel, auditMetadataSummary, auditToneClass } from "@/lib/audit-display";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePermission(PERMISSIONS.viewAuditLogs);
  const params = await searchParams;
  const query = asSingle(params.q)?.trim() ?? "";
  const action = asSingle(params.action) ?? "";
  const entityType = asSingle(params.entityType) ?? "";
  const actorUserId = asSingle(params.actorUserId) ?? "";
  const startDate = asSingle(params.startDate) ?? "";
  const endDate = asSingle(params.endDate) ?? "";

  const dateFilter = buildDateFilter(startDate, endDate);

  const [auditLogs, actionOptions, entityOptions, actorOptions, totalCount, todayCount, failedLoginCount] =
    await Promise.all([
      db.auditLog.findMany({
        where: {
          schoolId: session.schoolId,
          ...(action ? { action } : {}),
          ...(entityType ? { entityType } : {}),
          ...(actorUserId ? { actorUserId } : {}),
          ...(dateFilter ? { createdAt: dateFilter } : {}),
          ...(query
            ? {
                OR: [
                  { action: { contains: query, mode: "insensitive" } },
                  { entityType: { contains: query, mode: "insensitive" } },
                  { entityId: { contains: query, mode: "insensitive" } },
                  { actor: { is: { fullName: { contains: query, mode: "insensitive" } } } },
                  { actor: { is: { email: { contains: query, mode: "insensitive" } } } }
                ]
              }
            : {})
        },
        include: { actor: true },
        orderBy: { createdAt: "desc" },
        take: 100
      }),
      db.auditLog.findMany({
        where: { schoolId: session.schoolId },
        distinct: ["action"],
        select: { action: true },
        orderBy: { action: "asc" }
      }),
      db.auditLog.findMany({
        where: { schoolId: session.schoolId },
        distinct: ["entityType"],
        select: { entityType: true },
        orderBy: { entityType: "asc" }
      }),
      db.user.findMany({
        where: { schoolId: session.schoolId },
        select: { id: true, fullName: true, email: true },
        orderBy: { fullName: "asc" }
      }),
      db.auditLog.count({ where: { schoolId: session.schoolId } }),
      db.auditLog.count({
        where: {
          schoolId: session.schoolId,
          createdAt: buildTodayFilter()
        }
      }),
      db.auditLog.count({
        where: {
          schoolId: session.schoolId,
          action: "auth.login.failed"
        }
      })
    ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 26"
        title="Audit activity center"
        description="Review sign-ins, record changes, finance activity, document updates, and academic operations from one searchable audit log."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={<History className="h-5 w-5" />} label="Total audit entries" value={totalCount.toString()} />
        <SummaryCard icon={<CalendarDays className="h-5 w-5" />} label="Entries today" value={todayCount.toString()} />
        <SummaryCard icon={<ShieldCheck className="h-5 w-5" />} label="Failed sign-ins" value={failedLoginCount.toString()} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Search and filters</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            Narrow the audit trail by action, entity, actor, date range, or keyword.
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr_1fr_160px_160px] xl:items-end">
            <FormField label="Search" htmlFor="q">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input id="q" name="q" defaultValue={query} className="pl-9" placeholder="Action, entity, actor" />
              </div>
            </FormField>
            <FormField label="Action" htmlFor="action">
              <Select id="action" name="action" defaultValue={action}>
                <option value="">All actions</option>
                {actionOptions.map((item) => (
                  <option key={item.action} value={item.action}>
                    {auditActionLabel(item.action)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Entity" htmlFor="entityType">
              <Select id="entityType" name="entityType" defaultValue={entityType}>
                <option value="">All entities</option>
                {entityOptions.map((item) => (
                  <option key={item.entityType} value={item.entityType}>
                    {item.entityType}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Actor" htmlFor="actorUserId">
              <Select id="actorUserId" name="actorUserId" defaultValue={actorUserId}>
                <option value="">All actors</option>
                {actorOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fullName} ({item.email})
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Start date" htmlFor="startDate">
              <Input id="startDate" name="startDate" type="date" defaultValue={startDate} />
            </FormField>
            <FormField label="End date" htmlFor="endDate">
              <Input id="endDate" name="endDate" type="date" defaultValue={endDate} />
            </FormField>
            <div className="flex flex-wrap gap-3 xl:col-span-6">
              <Button type="submit">Apply filters</Button>
              <Link href="/dashboard/audit">
                <Button variant="secondary">Reset</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-brand-700">
              <Activity className="h-5 w-5" />
            </div>
            <div className="grid gap-1">
              <CardTitle>Activity log</CardTitle>
              <p className="text-sm leading-6 text-slate-600">
                Showing the latest {auditLogs.length} matching entr{auditLogs.length === 1 ? "y" : "ies"}.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {auditLogs.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <TH>Action</TH>
                    <TH>Entity</TH>
                    <TH>Actor</TH>
                    <TH>Metadata</TH>
                    <TH>When</TH>
                  </tr>
                </THead>
                <TBody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <TD>
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${auditToneClass(log.action)}`}>
                          {auditActionLabel(log.action)}
                        </span>
                        <p className="mt-2 text-xs text-slate-500">{log.action}</p>
                      </TD>
                      <TD>
                        <p className="font-medium text-slate-950">{log.entityType}</p>
                        <p className="mt-1 break-all text-xs text-slate-500">{log.entityId ?? "No entity id"}</p>
                      </TD>
                      <TD>
                        <p className="font-medium text-slate-950">{log.actor?.fullName ?? "System"}</p>
                        <p className="mt-1 text-xs text-slate-500">{log.actor?.email ?? "No actor account"}</p>
                      </TD>
                      <TD className="max-w-[280px] text-sm leading-6 text-slate-600">
                        {auditMetadataSummary(log.metadata)}
                      </TD>
                      <TD>{log.createdAt.toLocaleString("en-IN")}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="No audit entries found" description="No activity matched the current filters." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function buildDateFilter(startDate: string, endDate: string) {
  if (!startDate && !endDate) {
    return null;
  }

  return {
    ...(startDate ? { gte: new Date(`${startDate}T00:00:00.000Z`) } : {}),
    ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {})
  };
}

function buildTodayFilter() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);

  return { gte: start, lte: end };
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-panel">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-brand-700">
        {icon}
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
