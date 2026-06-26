import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Mail, PencilLine, Phone, UserCog } from "lucide-react";
import type { ReactNode } from "react";

import { archiveStaffAction } from "@/app/(dashboard)/dashboard/staff/actions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";

type Params = Promise<{ staffId: string }>;

export default async function StaffProfilePage({ params }: { params: Params }) {
  const session = await requirePermission(PERMISSIONS.viewStaff);
  const { staffId } = await params;
  const staff = await db.staff.findFirst({
    where: { id: staffId, schoolId: session.schoolId },
    include: {
      academicYear: true,
      user: {
        include: {
          roles: { include: { role: true } }
        }
      },
      classTeacherFor: {
        include: { class: true },
        orderBy: [{ class: { displayOrder: "asc" } }, { name: "asc" }]
      }
    }
  });

  if (!staff) {
    notFound();
  }

  const auditLogs = await db.auditLog.findMany({
    where: {
      schoolId: session.schoolId,
      entityType: "Staff",
      entityId: staff.id,
      action: { in: ["staff.created", "staff.updated", "staff.archived"] }
    },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  const canManageStaff = session.permissions.includes(PERMISSIONS.manageStaff);
  const roleSummary = staff.user?.roles.map((item) => item.role.name).join(", ") || "No login role linked";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Staff profile"
        title={staff.fullName}
        description={`${staff.employeeCode} • ${staff.designation} • ${staff.isTeachingStaff ? "Teaching staff" : "Non-teaching staff"}`}
        actions={
          canManageStaff ? (
            <div className="flex flex-wrap gap-3">
              <Link href={`/dashboard/staff/${staff.id}/edit`}>
                <Button>
                  <PencilLine className="h-4 w-4" />
                  Edit staff
                </Button>
              </Link>
              {!staff.isArchived ? (
                <form action={archiveStaffAction}>
                  <input type="hidden" name="staffId" value={staff.id} />
                  <Button variant="danger">
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null
        }
      />

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-brand-700">
                <UserCog className="h-5 w-5" />
              </div>
              <div className="grid gap-1">
                <CardTitle>Employment summary</CardTitle>
                <p className="text-sm text-slate-600">Core staff record and linked access details.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="Employee code" value={staff.employeeCode} />
            <InfoRow label="Designation" value={staff.designation} />
            <InfoRow label="Department" value={staff.department ?? "Not set"} />
            <InfoRow label="Staff type" value={staff.isTeachingStaff ? "Teaching" : "Non-teaching"} />
            <InfoRow label="Academic year" value={staff.academicYear.name} />
            <InfoRow label="Joining date" value={staff.joiningDate.toLocaleDateString("en-IN")} />
            <InfoRow label="Login role" value={roleSummary} />
            <InfoRow label="Status" value={staff.isArchived ? "Archived" : "Active"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact and HR details</CardTitle>
            <p className="text-sm text-slate-600">Useful references for office, principal, and administration teams.</p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ContactTile icon={<Phone className="h-4 w-4" />} label="Phone" value={staff.phone ?? "Not provided"} />
              <ContactTile icon={<Mail className="h-4 w-4" />} label="Email" value={staff.email ?? "Not provided"} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Gender" value={staff.gender ?? "Not set"} />
              <InfoRow label="Qualification" value={staff.qualification ?? "Not set"} />
              <InfoRow label="Salary reference" value={staff.salaryAmount ? formatCurrency(Number(staff.salaryAmount)) : "Not set"} />
              <InfoRow label="Class teacher for" value={staff.classTeacherFor.length ? staff.classTeacherFor.map((item) => `${item.class.name}-${item.name}`).join(", ") : "No sections assigned"} />
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Staff activity</CardTitle>
          <p className="text-sm text-slate-600">Recent changes made to this staff profile.</p>
        </CardHeader>
        <CardContent>
          {auditLogs.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>Action</TH>
                  <TH>By</TH>
                  <TH>When</TH>
                </tr>
              </THead>
              <TBody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <TD>{log.action}</TD>
                    <TD>{log.actor?.fullName ?? "System"}</TD>
                    <TD>{log.createdAt.toLocaleString("en-IN")}</TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No staff activity has been recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
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

function ContactTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-brand-700">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
