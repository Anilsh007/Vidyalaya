import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="grid gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-panel sm:px-6">
      <div className="h-1 w-16 rounded-full bg-brand-500/80" aria-hidden="true" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-2">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
              {eyebrow}
            </p>
          ) : null}
          <div className="grid gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
