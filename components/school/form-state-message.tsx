"use client";

import { useEffect, useRef } from "react";

import { useToast } from "@/components/ui/toast";
import type { ActionFormState } from "@/lib/forms";

export function FormStateMessage({ state }: { state: ActionFormState }) {
  const { pushToast } = useToast();
  const lastToastKeyRef = useRef<string>("");

  useEffect(() => {
    if (!state.message || state.status === "idle") {
      return;
    }

    const nextKey = `${state.status}:${state.message}`;
    if (lastToastKeyRef.current === nextKey) {
      return;
    }

    pushToast({
      title: state.status === "success" ? "Action completed" : "Action failed",
      description: state.message,
      tone: state.status === "success" ? "success" : "error"
    });
    lastToastKeyRef.current = nextKey;
  }, [pushToast, state.message, state.status]);

  if (!state.message || state.status === "idle") {
    return null;
  }

  return (
    <p role="status" aria-live="polite" className="sr-only">
      {state.message}
    </p>
  );
}
