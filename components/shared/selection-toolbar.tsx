import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type SelectionToolbarProps = {
  count: number;
  description: string;
  actionLabel: string;
  onActionToggle: () => void;
  onClear: () => void;
  children?: ReactNode;
};

export function SelectionToolbar({
  count,
  description,
  actionLabel,
  onActionToggle,
  onClear,
  children
}: SelectionToolbarProps) {
  return (
    <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-slate-900">{count} row(s) selected</p>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onActionToggle}>
            {actionLabel}
          </Button>
          <Button variant="secondary" onClick={onClear}>
            Clear selection
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
