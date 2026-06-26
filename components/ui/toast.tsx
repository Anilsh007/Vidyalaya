"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  pushToast: (input: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-blue-200 bg-blue-50 text-blue-900"
};

const toneIcons = {
  success: CheckCircle2,
  error: CircleAlert,
  info: Info
} satisfies Record<ToastTone, typeof Info>;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (input: Omit<ToastItem, "id">) => {
      const id = crypto.randomUUID();
      setItems((current) => [...current, { ...input, id }]);

      window.setTimeout(() => {
        dismiss(id);
      }, 3500);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      pushToast
    }),
    [pushToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

function ToastViewport({
  items,
  onDismiss
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto grid max-w-md gap-3 px-4 sm:inset-x-auto sm:right-4 sm:top-4 sm:mx-0"
    >
      {items.map((item) => {
        const Icon = toneIcons[item.tone];

        return (
          <section
            key={item.id}
            className={cn(
              "pointer-events-auto rounded-2xl border px-4 py-4 shadow-panel backdrop-blur",
              toneStyles[item.tone]
            )}
          >
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-sm leading-6 opacity-90">{item.description}</p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-2 text-current hover:bg-black/5"
                onClick={() => onDismiss(item.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
