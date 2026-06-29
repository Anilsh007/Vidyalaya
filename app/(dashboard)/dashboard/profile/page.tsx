import { Shield, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { AccountProfileForm, PasswordChangeForm } from "@/components/school/profile-forms";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRequiredSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getRequiredSession();
  const params = await searchParams;
  const saved = asSingle(params.saved) === "1";

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: {
      roles: { include: { role: true } },
      staffProfile: {
        include: {
          academicYear: true
        }
      },
      studentProfile: {
        include: {
          class: true,
          section: true
        }
      },
      parentProfile: true
    }
  });

  if (!user) {
    notFound();
  }

  const roleSummary = user.roles.map((entry) => entry.role.name).join(", ") || "-";
  const linkedProfile = user.staffProfile
    ? `Staff: ${user.staffProfile.fullName}`
    : user.studentProfile
      ? `Student: ${user.studentProfile.fullName}`
    : user.parentProfile
      ? `Parent: ${user.parentProfile.guardianName}`
      : "No linked profile";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="My account"
        title="Profile and security"
        description="Update your contact details, keep your login information current, and change your password whenever needed."
      />

      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Your changes were saved successfully.
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <AccountProfileForm
          values={{
            fullName: user.fullName,
            email: user.email,
            phone: user.phone ?? ""
          }}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-brand-700">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="grid gap-1">
                <CardTitle>Account summary</CardTitle>
                <p className="text-sm leading-6 text-slate-600">
                  This is the login identity used across the school dashboard.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Phone" value={user.phone ?? "Not set"} />
            <InfoRow label="Role(s)" value={roleSummary} />
            <InfoRow label="Linked profile" value={linkedProfile} />
            <InfoRow label="Access" value={user.isActive ? "Active" : "Inactive"} />
            {user.staffProfile ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Staff profile
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {user.staffProfile.fullName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {user.staffProfile.designation} • {user.staffProfile.employeeCode}
                </p>
              </div>
            ) : null}
            {user.parentProfile ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Parent profile
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {user.parentProfile.guardianName}
                </p>
                <p className="mt-1 text-sm text-slate-600">{user.parentProfile.phonePrimary}</p>
              </div>
            ) : null}
            {user.studentProfile ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Student profile
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {user.studentProfile.fullName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {[user.studentProfile.class?.name, user.studentProfile.section?.name].filter(Boolean).join(" - ") || "Class not assigned"}
                </p>
              </div>
            ) : null}
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
              <div className="flex items-center gap-2 font-medium">
                <Shield className="h-4 w-4" />
                Self-service reminder
              </div>
              <p className="mt-2 leading-6">
                After you update your password here, use the new one for the next sign-in.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <PasswordChangeForm />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-950">{value}</span>
    </div>
  );
}
