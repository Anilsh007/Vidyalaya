import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SummaryCardProps = {
  title: string;
  value: string;
  icon?: ReactNode;
  description?: string;
  className?: string;
  iconClassName?: string;
  valueClassName?: string;
};

export function SummaryCard({
  title,
  value,
  icon,
  description,
  className,
  iconClassName,
  valueClassName
}: SummaryCardProps) {
  return (
    <Card className={cn("border-slate-200/80 shadow-panel", className)}>
      <CardContent className="flex items-center justify-between gap-4 pt-6">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{title}</p>
          <p className={cn("mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl", valueClassName)}>
            {value}
          </p>
          {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {icon ? (
          <div className={cn("rounded-2xl bg-brand-50 p-3 text-brand-700", iconClassName)}>
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

type InfoPanelProps = {
  title: string;
  description: string;
  value?: string;
  icon?: ReactNode;
  className?: string;
};

export function InfoPanel({ title, description, value, icon, className }: InfoPanelProps) {
  return (
    <div className={cn("rounded-[24px] border border-slate-200 bg-white p-5 shadow-panel", className)}>
      {icon ? <div className="mb-4 inline-flex rounded-2xl bg-slate-100 p-3 text-slate-700">{icon}</div> : null}
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {value ? <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p> : null}
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

type StatusBadgeProps = {
  status: string;
  toneMap?: Record<string, string>;
  className?: string;
};

export function StatusBadge({ status, toneMap, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        toneMap?.[status] ?? "bg-slate-100 text-slate-700",
        className
      )}
    >
      {status}
    </span>
  );
}

type TableFrameProps = {
  children: ReactNode;
  className?: string;
};

export function TableFrame({ children, className }: TableFrameProps) {
  return <div className={cn("overflow-hidden rounded-2xl border border-slate-200", className)}>{children}</div>;
}

type DetailStatProps = {
  label: string;
  value: string;
  className?: string;
};

export function DetailStat({ label, value, className }: DetailStatProps) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
