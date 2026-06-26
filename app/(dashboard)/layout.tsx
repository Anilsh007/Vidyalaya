import type { ReactNode } from "react";

import { AppShell } from "@/components/shared/app-shell";
import { db } from "@/lib/db";
import { getRequiredSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await getRequiredSession();
  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { school: true }
  });

  return (
    <AppShell
      roleSummary={session.roles.join(", ")}
      schoolName={user?.school.name ?? "School"}
      userLabel={user?.fullName ?? "Staff account"}
    >
      {children}
    </AppShell>
  );
}
