"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { Bounce, toast, ToastContainer, type ToastOptions } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  pushToast: (input: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const pushToast = useCallback(
    ({ title, description, tone }: ToastItem) => {
      const content = description ? `${title}\n${description}` : title;
      const options: ToastOptions = {
        toastId: `${tone}:${title}:${description ?? ""}`,
        className:
          tone === "success"
            ? "border border-emerald-200 bg-emerald-50 text-emerald-950"
            : tone === "error"
              ? "border border-red-200 bg-red-50 text-red-950"
              : "border border-blue-200 bg-blue-50 text-blue-950"
      };

      if (tone === "success") {
        toast.success(content, options);
        return;
      }

      if (tone === "error") {
        toast.error(content, options);
        return;
      }

      toast.info(content, options);
    },
    []
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
      <ToastContainer
        position="top-right"
        autoClose={3500}
        closeOnClick
        pauseOnHover
        draggable
        newestOnTop
        theme="light"
        transition={Bounce}
        containerStyle={{ zIndex: 100 }}
        toastClassName={() => "rounded-2xl shadow-panel backdrop-blur"}
      />
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
