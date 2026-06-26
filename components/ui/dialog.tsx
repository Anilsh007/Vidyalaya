"use client";

import { useId } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DialogProps = {
  title: string;
  description?: string;
  triggerLabel: string;
  children: ReactNode;
};

export function Dialog({ title, description, triggerLabel, children }: DialogProps) {
  const dialogId = useId();

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          const dialog = document.getElementById(dialogId) as HTMLDialogElement | null;
          dialog?.showModal();
        }}
      >
        {triggerLabel}
      </Button>
      <dialog
        id={dialogId}
        className={cn(
          "w-[min(92vw,720px)] rounded-[28px] border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm"
        )}
      >
        <div className="grid gap-4 p-6 sm:p-7">
          <div className="grid gap-1">
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            {description ? <p className="text-sm text-slate-600">{description}</p> : null}
          </div>
          {children}
          <div className="flex justify-end border-t border-slate-200 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                const dialog = document.getElementById(dialogId) as HTMLDialogElement | null;
                dialog?.close();
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
