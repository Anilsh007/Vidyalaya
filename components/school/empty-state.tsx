import { FileSearch } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="grid gap-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center sm:px-6">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200/80">
        <FileSearch className="h-6 w-6" />
      </div>
      <div className="grid gap-2">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="mx-auto max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action ? <div className="flex justify-center">{action}</div> : null}
    </div>
  );
}
