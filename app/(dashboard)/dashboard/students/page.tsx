import Link from "next/link";
import { Plus, Search, UserRound } from "lucide-react";

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

export default async function StudentsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const session = await requirePermission(PERMISSIONS.viewStudents);
  const params = await searchParams;
  const query = asSingle(params.q)?.trim() ?? "";
  const classId = asSingle(params.classId) ?? "";
  const sectionId = asSingle(params.sectionId) ?? "";
  const status = asSingle(params.status) ?? "";
  const sort = asSingle(params.sort) ?? "name-asc";

  const [classes, sections, students] = await Promise.all([
    db.schoolClass.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    }),
    db.section.findMany({
      where: { schoolId: session.schoolId },
      include: { class: true },
      orderBy: [{ class: { displayOrder: "asc" } }, { name: "asc" }]
    }),
    db.student.findMany({
      where: {
        schoolId: session.schoolId,
        ...(classId ? { classId } : {}),
        ...(sectionId ? { sectionId } : {}),
        ...(status ? { status } : {}),
        ...(query
          ? {
              OR: [
                { fullName: { contains: query, mode: "insensitive" } },
                { admissionNumber: { contains: query, mode: "insensitive" } },
                { rollNumber: { contains: query, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        class: true,
        section: true,
        guardians: {
          where: { isPrimary: true },
          include: { parent: true },
          take: 1
        }
      },
      orderBy:
        sort === "recent"
          ? { createdAt: "desc" }
          : sort === "admission-asc"
            ? { admissionNumber: "asc" }
            : { fullName: "asc" }
    })
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 2"
        title="Student management"
        description="Manage admissions, guardian contacts, class placement, and lifecycle status from one responsive register."
        actions={
          hasManageStudents(session.permissions) ? (
            <Link href="/dashboard/students/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add student
              </Button>
            </Link>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Search and filters</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            Filter the register by class, section, status, or sort order to find records quickly.
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_180px] lg:items-end">
            <FormField label="Search" htmlFor="q">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input id="q" name="q" defaultValue={query} className="pl-9" placeholder="Name, admission no., roll no." />
              </div>
            </FormField>
            <FormField label="Class" htmlFor="classId">
              <Select id="classId" name="classId" defaultValue={classId}>
                <option value="">All classes</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Section" htmlFor="sectionId">
              <Select id="sectionId" name="sectionId" defaultValue={sectionId}>
                <option value="">All sections</option>
                {sections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.class.name} - {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={status}>
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </FormField>
            <FormField label="Sort" htmlFor="sort">
              <Select id="sort" name="sort" defaultValue={sort}>
                <option value="name-asc">Name A-Z</option>
                <option value="admission-asc">Admission no.</option>
                <option value="recent">Recently added</option>
              </Select>
            </FormField>
            <div className="flex flex-wrap gap-3 lg:col-span-5">
              <Button type="submit">Apply filters</Button>
              <Link href="/dashboard/students">
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
              <UserRound className="h-5 w-5" />
            </div>
            <div className="grid gap-1">
              <CardTitle>Student list</CardTitle>
              <p className="text-sm leading-6 text-slate-600">
                {students.length} record{students.length === 1 ? "" : "s"} found.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {students.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <TH>Student</TH>
                    <TH>Admission no.</TH>
                    <TH>Roll no.</TH>
                    <TH>Class</TH>
                    <TH>Guardian</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Profile</TH>
                  </tr>
                </THead>
                <TBody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <TD>
                        <div className="grid gap-1">
                          <span className="font-medium text-slate-950">{student.fullName}</span>
                          <span className="text-xs text-slate-500">
                            Added {student.createdAt.toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </TD>
                      <TD>{student.admissionNumber}</TD>
                      <TD>{student.rollNumber ?? "Not assigned"}</TD>
                      <TD>
                        {[student.class?.name, student.section?.name].filter(Boolean).join(" - ") || "Not assigned"}
                      </TD>
                      <TD>
                        {student.guardians[0]?.parent.guardianName ?? "Not linked"}
                      </TD>
                      <TD>
                        <span className={statusPillClass(student.status)}>{student.status}</span>
                      </TD>
                      <TD className="text-right">
                        <Link href={`/dashboard/students/${student.id}`}>
                          <Button variant="secondary" size="sm">
                            View
                          </Button>
                        </Link>
                      </TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No students match the current filters"
              description="Try broadening the search or add the first student record to start the admissions register."
              action={
                hasManageStudents(session.permissions) ? (
                  <Link href="/dashboard/students/new">
                    <Button>
                      <Plus className="h-4 w-4" />
                      Add student
                    </Button>
                  </Link>
                ) : null
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function hasManageStudents(permissions: string[]) {
  return permissions.includes(PERMISSIONS.manageStudents);
}

function statusPillClass(status: string) {
  if (status === "ACTIVE") {
    return "rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700";
  }

  if (status === "ARCHIVED") {
    return "rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700";
  }

  return "rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700";
}
