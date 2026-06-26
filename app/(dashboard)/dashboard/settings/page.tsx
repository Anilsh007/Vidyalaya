import { Layers3, School2, Settings2, UsersRound } from "lucide-react";

import {
  deleteClassAction,
  deleteSectionAction,
  deleteSubjectAction
} from "@/app/(dashboard)/dashboard/settings/actions";
import { EmptyState } from "@/components/school/empty-state";
import { ClassForm, SectionForm, SubjectForm } from "@/components/school/settings-crud-forms";
import { SchoolSettingsForm } from "@/components/school/school-settings-form";
import { PageHeader } from "@/components/shared/page-header";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { getSchoolSettingsBundle } from "@/lib/school";

export default async function SettingsPage() {
  const session = await requirePermission(PERMISSIONS.manageSchoolSettings);
  const [settingsBundle, classes, sections, subjects, teachers] = await Promise.all([
    getSchoolSettingsBundle(session.schoolId),
    db.schoolClass.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    }),
    db.section.findMany({
      where: { schoolId: session.schoolId },
      include: {
        class: true,
        classTeacher: true
      },
      orderBy: [{ class: { displayOrder: "asc" } }, { name: "asc" }]
    }),
    db.subject.findMany({
      where: { schoolId: session.schoolId },
      include: { class: true },
      orderBy: [{ class: { displayOrder: "asc" } }, { name: "asc" }]
    }),
    db.staff.findMany({
      where: {
        schoolId: session.schoolId,
        isTeachingStaff: true
      },
      select: {
        id: true,
        fullName: true
      },
      orderBy: { fullName: "asc" }
    })
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 2"
        title="School setup"
        description="Configure the school profile, current academic year, receipt rules, report card preferences, and the academic structure staff will use in admissions and classroom operations."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-brand-700">
              <School2 className="h-5 w-5" />
            </div>
            <div className="grid gap-1">
              <CardTitle>School settings</CardTitle>
              <p className="text-sm leading-6 text-slate-600">
                Keep the foundation details current before staff begin student intake, receipts, and report cards.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SchoolSettingsForm values={settingsBundle.values} />
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Layers3 className="h-5 w-5" />
              </div>
              <div className="grid gap-1">
                <CardTitle>Class management</CardTitle>
                <p className="text-sm leading-6 text-slate-600">
                  Create classes once and reuse them for sections, subjects, admissions, and reporting.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ClassForm />
            {classes.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Class</TH>
                      <TH>Order</TH>
                      <TH className="text-right">Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {classes.map((item) => (
                      <tr key={item.id}>
                        <TD className="font-medium text-slate-950">{item.name}</TD>
                        <TD>{item.displayOrder}</TD>
                        <TD>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Dialog
                              title={`Edit ${item.name}`}
                              description="Update the class label or sort order."
                              triggerLabel="Edit"
                            >
                              <ClassForm
                                defaultValues={{
                                  id: item.id,
                                  name: item.name,
                                  displayOrder: item.displayOrder
                                }}
                              />
                            </Dialog>
                            <form action={deleteClassAction}>
                              <input type="hidden" name="id" value={item.id} />
                              <Button type="submit" variant="ghost" size="sm" className="text-red-700">
                                Delete
                              </Button>
                            </form>
                          </div>
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                title="No classes yet"
                description="Create the first class so sections and subjects can be attached to it."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <UsersRound className="h-5 w-5" />
              </div>
              <div className="grid gap-1">
                <CardTitle>Section management</CardTitle>
                <p className="text-sm leading-6 text-slate-600">
                  Keep sections tied to a class and prepare class teacher assignment for future timetable work.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <SectionForm
              classes={classes.map((item) => ({ id: item.id, name: item.name }))}
              teachers={teachers}
            />
            {sections.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Class</TH>
                      <TH>Section</TH>
                      <TH>Teacher</TH>
                      <TH>Capacity</TH>
                      <TH className="text-right">Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {sections.map((item) => (
                      <tr key={item.id}>
                        <TD className="font-medium text-slate-950">{item.class.name}</TD>
                        <TD>{item.name}</TD>
                        <TD>{item.classTeacher?.fullName ?? "Not assigned"}</TD>
                        <TD>{item.capacity ?? "Not set"}</TD>
                        <TD>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Dialog
                              title={`Edit section ${item.class.name} - ${item.name}`}
                              description="Update the section, capacity, or class teacher assignment."
                              triggerLabel="Edit"
                            >
                              <SectionForm
                                classes={classes.map((entry) => ({ id: entry.id, name: entry.name }))}
                                teachers={teachers}
                                defaultValues={{
                                  id: item.id,
                                  classId: item.classId,
                                  name: item.name,
                                  capacity: item.capacity,
                                  classTeacherId: item.classTeacherId
                                }}
                              />
                            </Dialog>
                            <form action={deleteSectionAction}>
                              <input type="hidden" name="id" value={item.id} />
                              <Button type="submit" variant="ghost" size="sm" className="text-red-700">
                                Delete
                              </Button>
                            </form>
                          </div>
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                title="No sections yet"
                description="Create sections after the class list is ready so admissions can place students cleanly."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Settings2 className="h-5 w-5" />
            </div>
            <div className="grid gap-1">
              <CardTitle>Subject management</CardTitle>
              <p className="text-sm leading-6 text-slate-600">
                Build the subject list, assign class-specific subjects, and keep codes ready for exams and report cards.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SubjectForm classes={classes.map((item) => ({ id: item.id, name: item.name }))} />
          {subjects.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <TH>Subject</TH>
                    <TH>Code</TH>
                    <TH>Assigned class</TH>
                    <TH className="text-right">Actions</TH>
                  </tr>
                </THead>
                <TBody>
                  {subjects.map((item) => (
                    <tr key={item.id}>
                      <TD className="font-medium text-slate-950">{item.name}</TD>
                      <TD>{item.code}</TD>
                      <TD>{item.class?.name ?? "Common subject"}</TD>
                      <TD>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Dialog
                            title={`Edit ${item.name}`}
                            description="Update the subject code or class assignment."
                            triggerLabel="Edit"
                          >
                            <SubjectForm
                              classes={classes.map((entry) => ({ id: entry.id, name: entry.name }))}
                              defaultValues={{
                                id: item.id,
                                name: item.name,
                                code: item.code,
                                classId: item.classId
                              }}
                            />
                          </Dialog>
                          <form action={deleteSubjectAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <Button type="submit" variant="ghost" size="sm" className="text-red-700">
                              Delete
                            </Button>
                          </form>
                        </div>
                      </TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No subjects yet"
              description="Add subjects once the class structure is ready so teachers and exam setups can reuse them."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
