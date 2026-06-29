import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOptionalSession } from "@/lib/auth/session";
import {
  canAccessRoute,
  getDefaultDashboardRoute,
  normalizePathname
} from "@/lib/modules/module-access";

type ForbiddenPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function ForbiddenPage({ searchParams }: ForbiddenPageProps) {
  const session = await getOptionalSession();
  const resolved = await searchParams;
  const requestedNext = normalizePathname(resolved.next);
  const allowedRoute = session ? getDefaultDashboardRoute(session) : null;
  const safeAllowedRoute =
    session && allowedRoute && allowedRoute !== "/forbidden" && canAccessRoute(session, allowedRoute)
      ? allowedRoute
      : null;
  const nextHref =
    session &&
    requestedNext !== "/forbidden" &&
    canAccessRoute(session, requestedNext)
      ? requestedNext
      : safeAllowedRoute;

  return (
    <main className="min-h-screen bg-slate-50/60 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <Card className="w-full border-slate-200/70 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              This page is not available for your current account. Use an allowed workspace instead.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {nextHref ? (
              <Link
                href={nextHref}
                className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                Go to allowed dashboard
              </Link>
            ) : null}
            <Link
              href={session ? "/dashboard/profile" : "/login"}
              className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {session ? "Open profile" : "Return to login"}
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
