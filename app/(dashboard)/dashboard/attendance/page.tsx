import { AttendanceStatus } from "@prisma/client";
import Link from "next/link";
import { CalendarDays, ClipboardCheck, Clock3, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { AttendanceSheetForm } from "@/components/school/attendance-sheet-form";
import { EmptyState } from "@/components/school/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import {
  attendanceLabel,
  getMonthBounds,
  toDateInput,
  toDayBounds,
  toMonthInput
} from "@/lib/attendance";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AttendancePage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const session = await requirePermission(PERMISSIONS.viewAttendance);
  const params = await searchParams;

  const classes = await db.schoolClass.findMany({
    where: { schoolId: session.schoolId },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
  });

  const classId = asSingle(params.classId) ?? classes[0]?.id ?? "";
  const sections = await db.section.findMany({
    where: {
      schoolId: session.schoolId,
      ...(classId ? { classId } : {})
    },
    orderBy: { name: "asc" }
  });

  const sectionId = asSingle(params.sectionId) ?? sections[0]?.id ?? "";
  const date = asSingle(params.date) ?? toDateInput();
  const month = asSingle(params.month) ?? toMonthInput();

  if (!classes.length) {
    return (
      <div className="grid gap-6">
        <PageHeader
          eyebrow="Phase 3"
          title="Attendance management"
          description="Class-wise attendance needs the academic structure from school setup before staff can begin daily marking."
        />
        <EmptyState
          title="No classes found"
          description="Create classes and sections in school setup first, then come back here to mark attendance."
          action={
            <Link href="/dashboard/settings">
              <Button>Open school setup</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const selectedClass = classes.find((item) => item.id === classId) ?? classes[0];
  const selectedSection = sections.find((item) => item.id === sectionId) ?? sections[0];

  const students = selectedSection
    ? await db.student.findMany({
        where: {
          schoolId: session.schoolId,
          classId: selectedClass.id,
          sectionId: selectedSection.id,
          status: { not: "ARCHIVED" }
        },
        orderBy: [{ rollNumber: "asc" }, { fullName: "asc" }]
      })
    : [];

  const dayBounds = toDayBounds(date);
  const monthBounds = getMonthBounds(month);
  const dayAttendances = students.length
    ? await db.attendance.findMany({
        where: {
          schoolId: session.schoolId,
          studentId: { in: students.map((student) => student.id) },
          date: {
            gte: dayBounds.start,
            lte: dayBounds.end
          }
        }
      })
    : [];

  const monthlyAttendances = students.length
    ? await db.attendance.findMany({
        where: {
          schoolId: session.schoolId,
          studentId: { in: students.map((student) => student.id) },
          date: {
            gte: monthBounds.start,
            lte: monthBounds.end
          }
        },
        orderBy: [{ date: "asc" }]
      })
    : [];

  const attendanceMap = new Map(dayAttendances.map((item) => [item.studentId, item]));
  const studentRows = students.map((student) => ({
    id: student.id,
    fullName: student.fullName,
    admissionNumber: student.admissionNumber,
    rollNumber: student.rollNumber,
    status: attendanceMap.get(student.id)?.status ?? AttendanceStatus.PRESENT,
    remarks: attendanceMap.get(student.id)?.remarks ?? ""
  }));

  const reportCounts = {
    total: students.length,
    marked: dayAttendances.length,
    present: dayAttendances.filter((item) => item.status === AttendanceStatus.PRESENT).length,
    absent: dayAttendances.filter((item) => item.status === AttendanceStatus.ABSENT).length,
    late: dayAttendances.filter((item) => item.status === AttendanceStatus.LATE).length,
    leave: dayAttendances.filter((item) => item.status === AttendanceStatus.LEAVE).length
  };

  const monthlySummary = students.map((student) => {
    const entries = monthlyAttendances.filter((item) => item.studentId === student.id);
    const present = entries.filter((item) => item.status === AttendanceStatus.PRESENT).length;
    const absent = entries.filter((item) => item.status === AttendanceStatus.ABSENT).length;
    const late = entries.filter((item) => item.status === AttendanceStatus.LATE).length;
    const leave = entries.filter((item) => item.status === AttendanceStatus.LEAVE).length;
    const attendanceRate = entries.length ? Math.round((present / entries.length) * 100) : 0;

    return {
      student,
      present,
      absent,
      late,
      leave,
      markedDays: entries.length,
      attendanceRate
    };
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 3"
        title="Attendance management"
        description="Mark daily class attendance, review same-day class reports, and track monthly patterns without leaving the attendance workspace."
      />

      <Card>
        <CardHeader>
          <CardTitle>Class and date selector</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            Choose the teaching group and date, then mark attendance in bulk on the next section.
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-[1fr_1fr_200px_200px_auto] lg:items-end">
            <FormField label="Class" htmlFor="classId">
              <Select id="classId" name="classId" defaultValue={selectedClass.id}>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Section" htmlFor="sectionId">
              <Select id="sectionId" name="sectionId" defaultValue={selectedSection?.id ?? ""}>
                {sections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Date" htmlFor="date">
              <Input id="date" name="date" type="date" defaultValue={date} />
            </FormField>
            <FormField label="Month" htmlFor="month">
              <Input id="month" name="month" type="month" defaultValue={month} />
            </FormField>
            <Button type="submit">Load sheet</Button>
          </form>
        </CardContent>
      </Card>

      {selectedSection ? (
        <>
          {studentRows.length ? (
            <AttendanceSheetForm
              students={studentRows}
              classId={selectedClass.id}
              className={selectedClass.name}
              sectionId={selectedSection.id}
              sectionName={selectedSection.name}
              date={date}
            />
          ) : (
            <EmptyState
              title="No active students in this section"
              description="Assign students to the selected class and section, then return here to mark attendance."
            />
          )}

          <section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Class-wise daily report</CardTitle>
                <p className="text-sm leading-6 text-slate-600">
                  Same-day attendance coverage and status mix for the selected class and section.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4">
                <ReportStat
                  icon={<UsersRound className="h-5 w-5" />}
                  label="Students in section"
                  value={String(reportCounts.total)}
                />
                <ReportStat
                  icon={<ClipboardCheck className="h-5 w-5" />}
                  label="Marked today"
                  value={`${reportCounts.marked}/${reportCounts.total}`}
                />
                <ReportStat
                  icon={<CalendarDays className="h-5 w-5" />}
                  label="Present"
                  value={String(reportCounts.present)}
                />
                <ReportStat
                  icon={<Clock3 className="h-5 w-5" />}
                  label="Late or leave"
                  value={String(reportCounts.late + reportCounts.leave)}
                />
                <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p>Absent: {reportCounts.absent}</p>
                  <p>Late: {reportCounts.late}</p>
                  <p>Leave: {reportCounts.leave}</p>
                  <p>Unmarked: {reportCounts.total - reportCounts.marked}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly attendance summary</CardTitle>
                <p className="text-sm leading-6 text-slate-600">
                  Student-wise monthly totals for the currently selected class and section.
                </p>
              </CardHeader>
              <CardContent>
                {monthlySummary.length ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <Table>
                      <THead>
                        <tr>
                          <TH>Student</TH>
                          <TH>Marked days</TH>
                          <TH>Present</TH>
                          <TH>Absent</TH>
                          <TH>Late</TH>
                          <TH>Leave</TH>
                          <TH>Rate</TH>
                        </tr>
                      </THead>
                      <TBody>
                        {monthlySummary.map((item) => (
                          <tr key={item.student.id}>
                            <TD className="font-medium text-slate-950">{item.student.fullName}</TD>
                            <TD>{item.markedDays}</TD>
                            <TD>{item.present}</TD>
                            <TD>{item.absent}</TD>
                            <TD>{item.late}</TD>
                            <TD>{item.leave}</TD>
                            <TD>{item.attendanceRate}%</TD>
                          </tr>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                    No attendance rows have been marked for {month} yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Today's sheet preview</CardTitle>
              <p className="text-sm leading-6 text-slate-600">
                Quick review of the current class-wise daily report before staff move to the next section.
              </p>
            </CardHeader>
            <CardContent>
              {studentRows.length ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <Table>
                    <THead>
                      <tr>
                        <TH>Student</TH>
                        <TH>Roll no.</TH>
                        <TH>Status</TH>
                        <TH>Remarks</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {studentRows.map((item) => (
                        <tr key={item.id}>
                          <TD className="font-medium text-slate-950">{item.fullName}</TD>
                          <TD>{item.rollNumber ?? "Not assigned"}</TD>
                          <TD>
                            {attendanceMap.get(item.id)
                              ? attendanceLabel(attendanceMap.get(item.id)!.status)
                              : "Unmarked"}
                          </TD>
                          <TD>{attendanceMap.get(item.id)?.remarks || "No remarks"}</TD>
                        </tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  No students are available for the selected section.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState
          title="No sections found for this class"
          description="Create at least one section under the selected class before marking attendance."
          action={
            <Link href="/dashboard/settings">
              <Button>Open school setup</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}

function ReportStat({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-700">
          {icon}
        </div>
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className="text-lg font-semibold text-slate-950">{value}</span>
    </div>
  );
}
