"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, LockKeyhole, School, ShieldCheck } from "lucide-react";

import { loginAction, type LoginActionState } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { LOGIN_COPY } from "@/lib/copy";

const initialState: LoginActionState = {
  status: "idle"
};

type LoginFormProps = {
  next?: string;
};

export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const { pushToast } = useToast();
  const lastMessageRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.status === "error" && state.message && lastMessageRef.current !== state.message) {
      pushToast({
        title: "Login failed",
        description: state.message,
        tone: "error"
      });
      lastMessageRef.current = state.message;
    }
  }, [pushToast, state.message, state.status]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="relative overflow-hidden rounded-[28px] border border-white/60 bg-brand-700 px-6 py-8 text-white shadow-panel sm:px-8 lg:px-10 lg:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),linear-gradient(140deg,rgba(10,37,112,0.3),transparent_65%)]" />
        <div className="relative grid gap-10">
          <div className="grid gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/90">
              <School className="h-4 w-4" />
              LAN-first school operations
            </div>
            <div className="grid gap-3">
              <h1 className="max-w-xl text-balance text-3xl font-semibold leading-tight sm:text-4xl">
                Secure access for school staff, with local hosting as the default.
              </h1>
              <p className="max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
                Run the dashboard on the school server, open it over the campus network, and
                enable internet access later with a tunnel only if the school needs it.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-blue-50 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/12 bg-white/10 p-4">
              <ShieldCheck className="mb-3 h-5 w-5" />
              Signed sessions, route protection, role checks, and audit logs are built into
              the foundation.
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/10 p-4">
              <LockKeyhole className="mb-3 h-5 w-5" />
              Passwords use strong one-way hashing so they are never stored in plain text.
            </div>
          </div>
        </div>
      </section>

      <Card className="border-white/70 bg-white/90 backdrop-blur">
        <CardHeader>
          <CardTitle>{LOGIN_COPY.title}</CardTitle>
          <p className="text-sm leading-6 text-slate-600">{LOGIN_COPY.subtitle}</p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="next" value={next ?? ""} />
            <FormField label={LOGIN_COPY.emailLabel} htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="admin@school.local"
                required
              />
            </FormField>
            <FormField label={LOGIN_COPY.passwordLabel} htmlFor="password">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
            </FormField>
            <Button type="submit" className="mt-2" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {LOGIN_COPY.submitLabel}
            </Button>

            <p className="text-sm leading-6 text-slate-500">{LOGIN_COPY.helper}</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
