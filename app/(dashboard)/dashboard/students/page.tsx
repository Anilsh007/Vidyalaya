import Link from "next/link";
import { Plus, Search, UserRound } from "lucide-react";

import { EmptyState } from "@/components/school/empty-state";
import { ActionRow, CountLabel, FilterCard, SectionHeaderCard } from "@/components/shared/listing-primitives";
import { StatusBadge, TableFrame } from "@/components/shared/dashboard-primitives";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requireAnyPermission } from "@/lib/rbac/guards";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { getStudentsPageData } from "@/lib/services/students.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const session = await requireAnyPermission([RBAC_PERMISSIONS.studentsRead]);
  const params = await searchParams;
  const query = asSingle(params.q)?.trim() ?? "";
  const classId = asSingle(params.classId) ?? "";
  const sectionId = asSingle(params.sectionId) ?? "";
  const status = asSingle(params.status) ?? "";
  const sort = asSingle(params.sort) ?? "name-asc";

  const { classes, sections, students } = await getStudentsPageData({
    schoolId: session.schoolId,
    viewer: session,
    query,
    classId,
    sectionId,
    status,
    sort
  });

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

      <FilterCard description="Filter the register by class, section, status, or sort order to find records quickly.">
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
                    {item.name}
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
            <ActionRow className="lg:col-span-5">
              <Button type="submit">Apply filters</Button>
              <Link href="/dashboard/students">
                <Button variant="secondary">Reset</Button>
              </Link>
            </ActionRow>
          </form>
      </FilterCard>

      <SectionHeaderCard
        icon={<UserRound className="h-5 w-5" />}
        title="Student list"
        description={<CountLabel count={students.length} singular="record" />}
      >
          {students.length ? (
            <TableFrame>
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
                        <StatusBadge
                          status={student.status}
                          toneMap={{
                            ACTIVE: "bg-emerald-50 text-emerald-700",
                            ARCHIVED: "bg-slate-200 text-slate-700",
                            INACTIVE: "bg-amber-50 text-amber-700"
                          }}
                          className="px-3"
                        />
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
            </TableFrame>
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
      </SectionHeaderCard>
    </div>
  );
}

function hasManageStudents(permissions: string[]) {
  return permissions.includes(RBAC_PERMISSIONS.studentsCreate) || permissions.includes(RBAC_PERMISSIONS.studentsUpdate);
}
