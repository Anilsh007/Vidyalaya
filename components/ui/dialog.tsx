"use client";

import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DialogProps = {
  title: string;
  description?: string;
  triggerLabel?: string;
  triggerVariant?: "primary" | "secondary" | "ghost" | "danger";
  triggerClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  widthClassName?: string;
};

export function Dialog({
  title,
  description,
  triggerLabel,
  triggerVariant = "secondary",
  triggerClassName,
  children,
  footer,
  open,
  onOpenChange,
  widthClassName
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function setOpenState(nextOpen: boolean) {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  }

  function handleOpen() {
    setOpenState(true);
  }

  function handleClose() {
    setOpenState(false);
  }

  return (
    <>
      {triggerLabel ? (
        <Button variant={triggerVariant} className={triggerClassName} onClick={handleOpen}>
          {triggerLabel}
        </Button>
      ) : null}
      {isOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onClick={handleClose} >
          <div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
            className={cn("max-h-[90vh] w-[min(92vw,720px)] overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-0 shadow-2xl",
              widthClassName)} onClick={(event) => event.stopPropagation()} >
            <div className="grid gap-4 p-6 sm:p-7">
              <div className="flex justify-between gap-1">
                <div>
                  <h3 id={titleId} className="text-lg font-semibold text-slate-950">
                    {title}
                  </h3>
                  {description ? (
                    <p id={descriptionId} className="text-sm text-slate-600">
                      {description}
                    </p>
                  ) : null}
                </div>

                <Button variant="secondary" onClick={handleClose}>
                  Close
                </Button>
              </div>
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
