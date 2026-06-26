import { CheckCircle2, CircleAlert } from "lucide-react";

import type { ActionFormState } from "@/lib/forms";

export function FormStateMessage({ state }: { state: ActionFormState }) {
  if (!state.message || state.status === "idle") {
    return null;
  }

  const toneClass =
    state.status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-red-200 bg-red-50 text-red-900";
  const Icon = state.status === "success" ? CheckCircle2 : CircleAlert;

  return (
    <p
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${toneClass}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{state.message}</span>
    </p>
  );
}
