import Link from "next/link";
import { Plus, Search, UserCog } from "lucide-react";

import { EmptyState } from "@/components/school/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StaffPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePermission(PERMISSIONS.viewStaff);
  const params = await searchParams;
  const query = asSingle(params.q)?.trim() ?? "";
  const department = asSingle(params.department) ?? "";
  const staffType = asSingle(params.staffType) ?? "";
  const status = asSingle(params.status) ?? "active";
  const sort = asSingle(params.sort) ?? "name-asc";

  const [departments, staff] = await Promise.all([
    db.staff.findMany({
      where: {
        schoolId: session.schoolId,
        department: { not: null }
      },
      distinct: ["department"],
      select: { department: true },
      orderBy: { department: "asc" }
    }),
    db.staff.findMany({
      where: {
        schoolId: session.schoolId,
        ...(status === "archived" ? { isArchived: true } : status === "all" ? {} : { isArchived: false }),
        ...(department ? { department } : {}),
        ...(staffType === "teaching" ? { isTeachingStaff: true } : {}),
        ...(staffType === "non-teaching" ? { isTeachingStaff: false } : {}),
        ...(query
          ? {
              OR: [
                { fullName: { contains: query, mode: "insensitive" } },
                { employeeCode: { contains: query, mode: "insensitive" } },
                { designation: { contains: query, mode: "insensitive" } },
                { phone: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        user: {
          include: {
            roles: { include: { role: true } }
          }
        }
      },
      orderBy:
        sort === "recent"
          ? { createdAt: "desc" }
          : sort === "employee-asc"
            ? { employeeCode: "asc" }
            : { fullName: "asc" }
    })
  ]);

  const canManageStaff = session.permissions.includes(PERMISSIONS.manageStaff);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 24"
        title="Staff management"
        description="Maintain employee records, teaching and non-teaching classifications, contact details, salary references, and archive status."
        actions={
          canManageStaff ? (
            <Link href="/dashboard/staff/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add staff
              </Button>
            </Link>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Search and filters</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            Find staff by name, employee code, designation, phone, email, department, or staff type.
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_180px] lg:items-end">
            <FormField label="Search" htmlFor="q">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input id="q" name="q" defaultValue={query} className="pl-9" placeholder="Name, code, phone, email" />
              </div>
            </FormField>
            <FormField label="Department" htmlFor="department">
              <Select id="department" name="department" defaultValue={department}>
                <option value="">All departments</option>
                {departments.map((item) =>
                  item.department ? (
                    <option key={item.department} value={item.department}>
                      {item.department}
                    </option>
                  ) : null
                )}
              </Select>
            </FormField>
            <FormField label="Staff type" htmlFor="staffType">
              <Select id="staffType" name="staffType" defaultValue={staffType}>
                <option value="">All types</option>
                <option value="teaching">Teaching</option>
                <option value="non-teaching">Non-teaching</option>
              </Select>
            </FormField>
            <FormField label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={status}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="all">All records</option>
              </Select>
            </FormField>
            <FormField label="Sort" htmlFor="sort">
              <Select id="sort" name="sort" defaultValue={sort}>
                <option value="name-asc">Name A-Z</option>
                <option value="employee-asc">Employee code</option>
                <option value="recent">Recently added</option>
              </Select>
            </FormField>
            <div className="flex flex-wrap gap-3 lg:col-span-5">
              <Button type="submit">Apply filters</Button>
              <Link href="/dashboard/staff">
                <Button variant="secondary">Reset</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-brand-700">
              <UserCog className="h-5 w-5" />
            </div>
            <div className="grid gap-1">
              <CardTitle>Staff register</CardTitle>
              <p className="text-sm leading-6 text-slate-600">
                {staff.length} record{staff.length === 1 ? "" : "s"} found.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {staff.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <TH>Staff</TH>
                    <TH>Employee code</TH>
                    <TH>Designation</TH>
                    <TH>Department</TH>
                    <TH>Type</TH>
                    <TH>Contact</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <TBody>
                  {staff.map((item) => {
                    const roleSummary = item.user?.roles.map((role) => role.role.name).join(", ");

                    return (
                      <tr key={item.id}>
                        <TD>
                          <Link href={`/dashboard/staff/${item.id}`} className="font-semibold text-brand-700 hover:text-brand-900">
                            {item.fullName}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">{roleSummary || "No login role linked"}</p>
                        </TD>
                        <TD>{item.employeeCode}</TD>
                        <TD>{item.designation}</TD>
                        <TD>{item.department ?? "-"}</TD>
                        <TD>{item.isTeachingStaff ? "Teaching" : "Non-teaching"}</TD>
                        <TD>
                          <div className="grid gap-1 text-sm">
                            <span>{item.phone ?? "-"}</span>
                            <span className="text-xs text-slate-500">{item.email ?? "No email"}</span>
                          </div>
                        </TD>
                        <TD>
                          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${item.isArchived ? "border-slate-200 bg-slate-100 text-slate-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                            {item.isArchived ? "Archived" : "Active"}
                          </span>
                        </TD>
                      </tr>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="No staff records found" description="Add staff records or adjust the filters to see employees here." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
