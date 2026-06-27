import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FilterCardProps = {
  description: string;
  children: ReactNode;
  title?: string;
};

export function FilterCard({ title = "Search and filters", description, children }: FilterCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

type SectionHeaderCardProps = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  children: ReactNode;
  iconClassName?: string;
};

export function SectionHeaderCard({
  icon,
  title,
  description,
  children,
  iconClassName = "bg-blue-50 text-brand-700"
}: SectionHeaderCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${iconClassName}`}>{icon}</div>
          <div className="grid gap-1">
            <CardTitle>{title}</CardTitle>
            <p className="text-sm leading-6 text-slate-600">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

type CountLabelProps = {
  count: number;
  singular: string;
  plural?: string;
};

export function CountLabel({ count, singular, plural }: CountLabelProps) {
  const label = count === 1 ? singular : plural ?? `${singular}s`;
  return (
    <>
      {count} {label} found.
    </>
  );
}

type ActionRowProps = {
  children: ReactNode;
  className?: string;
};

export function ActionRow({ children, className }: ActionRowProps) {
  return <div className={className ? `flex flex-wrap gap-3 ${className}` : "flex flex-wrap gap-3"}>{children}</div>;
}

type TableActionGroupProps = {
  children: ReactNode;
};

export function TableActionGroup({ children }: TableActionGroupProps) {
  return <div className="flex flex-wrap justify-end gap-2">{children}</div>;
}
