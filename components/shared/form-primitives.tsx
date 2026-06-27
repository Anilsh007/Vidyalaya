import type { ReactNode } from "react";

type FormSectionProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

export function FormSection({ children, title, description }: FormSectionProps) {
  return (
    <section className="grid gap-5 rounded-[24px] border border-slate-200 bg-white p-6 shadow-panel">
      {title || description ? (
        <div className="grid gap-2">
          {title ? <h2 className="text-xl font-semibold text-slate-950">{title}</h2> : null}
          {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

type FieldStackProps = {
  children: ReactNode;
  className?: string;
};

export function FieldStack({ children, className }: FieldStackProps) {
  return <div className={className ? `grid gap-2 ${className}` : "grid gap-2"}>{children}</div>;
}

type FormActionsProps = {
  children: ReactNode;
  align?: "start" | "end";
};

export function FormActions({ children, align = "end" }: FormActionsProps) {
  return <div className={`flex ${align === "start" ? "justify-start" : "justify-end"}`}>{children}</div>;
}

type FormNoticeProps = {
  children: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "indigo";
};

export function FormNotice({ children, icon, tone = "neutral" }: FormNoticeProps) {
  const wrapperClass =
    tone === "indigo"
      ? "rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm text-slate-700"
      : "rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm text-slate-700";
  const iconClass =
    tone === "indigo"
      ? "inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"
      : "inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700";

  if (!icon) {
    return <div className={wrapperClass}>{children}</div>;
  }

  return (
    <div className={wrapperClass}>
      <div className="flex items-start gap-3">
        <div className={iconClass}>{icon}</div>
        <div className="grid gap-1">{children}</div>
      </div>
    </div>
  );
}
