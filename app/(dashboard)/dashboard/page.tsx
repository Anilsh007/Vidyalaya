import Link from "next/link";
import { ArrowRight, ShieldCheck, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRequiredSession } from "@/lib/auth/session";
import { canAccessRoute } from "@/lib/modules/module-access";
import { noticeTypeTone } from "@/lib/notices";
import {
  getDashboardOverview,
  type ActionCardData,
  type AlertItemData,
  type AlertTone,
  type ChartCardData,
  type ChartPoint,
  type MetricCardData,
  type MetricTone
} from "@/lib/services/dashboard.service";

type VisibleNotice = Awaited<ReturnType<typeof getDashboardOverview>>["visibleNotices"][number];

export default async function DashboardPage() {
  const session = await getRequiredSession();
  const overview = await getDashboardOverview({ session });
  const { user, variant, visibleNotices } = overview;
  const visibleMetrics = variant.metrics.filter((metric) => canAccessRoute(session, metric.href));
  const visibleActions = variant.actions.filter((action) => canAccessRoute(session, action.href));
  const visibleCharts = variant.charts.filter((chart) => canAccessRoute(session, chart.href));
  const canOpenNoticeCenter = canAccessRoute(session, "/dashboard/notices");

  return (
    <div className="grid gap-6 bg-slate-50/50">
      <section className="overflow-hidden rounded-[30px] border border-slate-200/60 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(135deg,#ffffff_0%,#f8fafc_45%,#eef2ff_100%)] px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="grid gap-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700 shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                {variant.label}
              </div>
              <div className="grid gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.15rem]">
                  {variant.title}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-600">{variant.subtitle}</p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm">
                {variant.heroNote}
              </div>
            </div>

            <div className="min-w-[270px] rounded-[26px] border border-slate-200/70 bg-white/85 p-5 shadow-sm backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Access Snapshot
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{user.fullName}</p>
              <p className="mt-1 text-sm text-slate-600">{session.roles.join(", ") || "No role assigned"}</p>
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
            {visibleMetrics.map((metric) => (
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
              {visibleActions.length ? (
                visibleActions.map((item) => <ActionCard key={item.label} action={item} />)
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-3">
                  No quick actions available for your role yet.
                </div>
              )}
            </CardContent>
          </Card>

          {visibleCharts.length ? (
            <div className={`grid gap-6 ${visibleCharts.length > 1 ? "2xl:grid-cols-2" : ""}`}>
              {visibleCharts.map((chart) => (
                <ChartSurface key={chart.title} chart={chart} />
              ))}
            </div>
          ) : null}
        </div>

        <Card className="border-slate-200/60 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <CardHeader>
            <CardTitle className="text-slate-900">Operational alert hub</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Recent timeline events come only from live audit and published notice records.
            </p>
          </CardHeader>
          <CardContent>
            {variant.alerts.length ? (
              <AlertTimeline alerts={variant.alerts} />
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center text-sm text-slate-500">
                No activity yet
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{variant.noticesTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{variant.noticesSubtitle}</p>
          </div>
          {canOpenNoticeCenter ? (
            <Link href="/dashboard/notices" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600">
              Open notice center
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
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
  if (!points.length) {
    return <EmptyChartState message="No chart data available yet." />;
  }

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
  if (!points.length) {
    return <EmptyChartState message="No chart data available yet." />;
  }

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
  if (!points.length) {
    return <EmptyChartState message="No chart data available yet." />;
  }

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
        <div className="grid h-48 w-48 place-items-center rounded-full" style={{ background: ring }}>
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
        No chart data available yet.
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

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center text-sm text-slate-500">
      {message}
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
