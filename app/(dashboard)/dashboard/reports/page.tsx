import Link from "next/link";

import { recordAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/access";
import { EmptyState } from "@/components/school/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ReportShell } from "@/components/shared/report-shell";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PrintButton } from "@/components/ui/print-button";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { PERMISSIONS } from "@/lib/permissions";
import { toPlainShareText } from "@/lib/reports";
import {
  getAttendanceReport,
  getAvailableReportDefinitions,
  getExamResultReport,
  getFeeCollectionReport,
  getPendingDuesReport,
  getReportsPageMeta,
  getStudentReport,
  hasReportExportAccess,
  type ReportType
} from "@/lib/services/reports.service";
import { formatCurrency } from "@/lib/utils";
import { reportsFilterSchema } from "@/lib/validations/reports";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildExportUrl(type: ReportType, params: URLSearchParams) {
  return `/api/reports/export/${type}?${params.toString()}`;
}

export default async function ReportsPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const session = await requirePermission(PERMISSIONS.viewReports);
  const params = await searchParams;
  const classId = asSingle(params.classId) ?? "";
  const sectionId = asSingle(params.sectionId) ?? "";
  const examId = asSingle(params.examId) ?? "";
  const startDate = asSingle(params.startDate) ?? "";
  const endDate = asSingle(params.endDate) ?? "";
  const parsedFilters = reportsFilterSchema.safeParse({
    classId,
    sectionId,
    examId,
    startDate,
    endDate
  });
  const safeFilters = parsedFilters.success ? parsedFilters.data : {};

  const [meta, availableReports] = await Promise.all([
    getReportsPageMeta(session),
    Promise.resolve(getAvailableReportDefinitions(session))
  ]);
  const visibleReportKeys = new Set(availableReports.map((report) => report.key));

  const filters = {
    schoolId: session.schoolId,
    classId: safeFilters.classId || undefined,
    sectionId: safeFilters.sectionId || undefined,
    examId: safeFilters.examId || undefined,
    startDate: safeFilters.startDate ? new Date(`${safeFilters.startDate}T00:00:00.000Z`) : undefined,
    endDate: safeFilters.endDate ? new Date(`${safeFilters.endDate}T23:59:59.999Z`) : undefined
  };

  const [studentRows, attendanceRows, feeRows, duesRows, resultRows] = await Promise.all([
    visibleReportKeys.has("student") ? getStudentReport(session, filters) : Promise.resolve([]),
    visibleReportKeys.has("attendance") ? getAttendanceReport(session, filters) : Promise.resolve([]),
    visibleReportKeys.has("fees") ? getFeeCollectionReport(session, filters) : Promise.resolve([]),
    visibleReportKeys.has("dues") ? getPendingDuesReport(session, filters) : Promise.resolve([]),
    visibleReportKeys.has("results") ? getExamResultReport(session, filters) : Promise.resolve([])
  ]);

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "report.viewed",
    entityType: "Report",
    metadata: {
      visibleReports: availableReports.map((report) => report.key),
      classId: filters.classId ?? null,
      sectionId: filters.sectionId ?? null,
      examId: filters.examId ?? null,
      startDate: safeFilters.startDate ?? null,
      endDate: safeFilters.endDate ?? null
    }
  });

  const exportParams = new URLSearchParams();
  if (classId) exportParams.set("classId", classId);
  if (sectionId) exportParams.set("sectionId", sectionId);
  if (examId) exportParams.set("examId", examId);
  if (startDate) exportParams.set("startDate", startDate);
  if (endDate) exportParams.set("endDate", endDate);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 9"
        title="Reports"
        description="Review student, attendance, finance, dues, and result reports from one print-friendly workspace. Every visible section is scoped by the current role and school."
        actions={<PrintButton />}
      />

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
        <form className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_180px_180px_auto] lg:items-end">
          <FormField label="Class" htmlFor="classId">
            <Select id="classId" name="classId" defaultValue={classId}>
              <option value="">All classes</option>
              {meta.classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Section" htmlFor="sectionId">
            <Select id="sectionId" name="sectionId" defaultValue={sectionId}>
              <option value="">All sections</option>
              {meta.sections.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.class.name} - {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Exam" htmlFor="examId">
            <Select id="examId" name="examId" defaultValue={examId}>
              <option value="">All exams</option>
              {meta.exams.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Start date" htmlFor="startDate">
            <Input id="startDate" name="startDate" type="date" defaultValue={startDate} />
          </FormField>
          <FormField label="End date" htmlFor="endDate">
            <Input id="endDate" name="endDate" type="date" defaultValue={endDate} />
          </FormField>
          <Button type="submit">Load reports</Button>
        </form>
      </section>

      {visibleReportKeys.has("student") ? (
        <ReportShell
          title="Student report"
          description="Student register export with class, section, status, and guardian contact."
        >
          <ReportActions
            exportHref={hasReportExportAccess(session, "student") ? buildExportUrl("student", exportParams) : null}
            copyText={toPlainShareText(
              "Student report",
              studentRows
                .slice(0, 10)
                .map((row) => `${row.studentName} | ${row.class}-${row.section} | ${row.status}`)
            )}
          />
          {studentRows.length ? (
            <ReportTable
              headers={["Student", "Admission", "Class", "Section", "Status", "Guardian", "Phone"]}
              rows={studentRows.map((row) => [
                row.studentName,
                row.admissionNumber,
                row.class,
                row.section,
                row.status,
                row.guardian,
                row.phone
              ])}
            />
          ) : (
            <EmptyState title="No student rows" description="No students matched the current filters." />
          )}
        </ReportShell>
      ) : null}

      {visibleReportKeys.has("attendance") ? (
        <ReportShell
          title="Attendance report"
          description="Attendance rows by date, student, class, section, status, and remarks."
        >
          <ReportActions
            exportHref={
              hasReportExportAccess(session, "attendance") ? buildExportUrl("attendance", exportParams) : null
            }
            copyText={toPlainShareText(
              "Attendance report",
              attendanceRows.slice(0, 10).map((row) => `${row.date} | ${row.studentName} | ${row.status}`)
            )}
          />
          {attendanceRows.length ? (
            <ReportTable
              headers={["Date", "Student", "Class", "Section", "Status", "Remarks"]}
              rows={attendanceRows.map((row) => [
                row.date,
                row.studentName,
                row.class,
                row.section,
                row.status,
                row.remarks
              ])}
            />
          ) : (
            <EmptyState title="No attendance rows" description="No attendance matched the current filters." />
          )}
        </ReportShell>
      ) : null}

      {visibleReportKeys.has("fees") ? (
        <ReportShell
          title="Fee collection report"
          description="Receipt-wise collections with invoice, student, mode, and amount."
        >
          <ReportActions
            exportHref={hasReportExportAccess(session, "fees") ? buildExportUrl("fees", exportParams) : null}
            copyText={toPlainShareText(
              "Fee collection report",
              feeRows
                .slice(0, 10)
                .map((row) => `${row.receiptNumber} | ${row.studentName} | ${formatCurrency(row.amount)}`)
            )}
          />
          {feeRows.length ? (
            <ReportTable
              headers={["Receipt", "Date", "Student", "Invoice", "Mode", "Amount"]}
              rows={feeRows.map((row) => [
                row.receiptNumber,
                row.paymentDate,
                row.studentName,
                row.invoiceNumber,
                row.paymentMode,
                formatCurrency(row.amount)
              ])}
            />
          ) : (
            <EmptyState title="No collection rows" description="No fee collections matched the current filters." />
          )}
        </ReportShell>
      ) : null}

      {visibleReportKeys.has("dues") ? (
        <ReportShell
          title="Pending dues report"
          description="Outstanding invoices with due date, paid amount, and balance due."
        >
          <ReportActions
            exportHref={hasReportExportAccess(session, "dues") ? buildExportUrl("dues", exportParams) : null}
            copyText={toPlainShareText(
              "Pending dues report",
              duesRows
                .slice(0, 10)
                .map((row) => `${row.studentName} | ${row.invoiceNumber} | ${formatCurrency(row.balanceDue)}`)
            )}
          />
          {duesRows.length ? (
            <ReportTable
              headers={["Student", "Invoice", "Due date", "Total", "Paid", "Balance", "Status"]}
              rows={duesRows.map((row) => [
                row.studentName,
                row.invoiceNumber,
                row.dueDate,
                formatCurrency(row.totalAmount),
                formatCurrency(row.paidAmount),
                formatCurrency(row.balanceDue),
                row.status
              ])}
            />
          ) : (
            <EmptyState title="No dues rows" description="No pending dues matched the current filters." />
          )}
        </ReportShell>
      ) : null}

      {visibleReportKeys.has("results") ? (
        <ReportShell
          title="Exam result report"
          description="Exam result summary with class, section, percentage, grade, and result status."
        >
          <ReportActions
            exportHref={hasReportExportAccess(session, "results") ? buildExportUrl("results", exportParams) : null}
            copyText={toPlainShareText(
              "Exam result report",
              resultRows
                .slice(0, 10)
                .map((row) => `${row.exam} | ${row.studentName} | ${row.percentage}% | ${row.grade}`)
            )}
          />
          {resultRows.length ? (
            <ReportTable
              headers={["Exam", "Student", "Class", "Section", "Percentage", "Grade", "Result"]}
              rows={resultRows.map((row) => [
                row.exam,
                row.studentName,
                row.class,
                row.section,
                `${row.percentage}%`,
                row.grade,
                row.resultStatus
              ])}
            />
          ) : (
            <EmptyState title="No result rows" description="No exam results matched the current filters." />
          )}
        </ReportShell>
      ) : null}

      {!availableReports.length ? (
        <EmptyState
          title="No report workspaces available"
          description="This account does not currently have any report sections available for the active permission set."
        />
      ) : null}
    </div>
  );
}

function ReportActions({
  exportHref,
  copyText
}: {
  exportHref: string | null;
  copyText: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      {exportHref ? (
        <Link href={exportHref}>
          <Button variant="secondary">Export CSV</Button>
        </Link>
      ) : null}
      <CopyButton text={copyText} label="Copy summary" />
    </div>
  );
}

function ReportTable({
  headers,
  rows
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <Table>
        <THead>
          <tr>
            {headers.map((header) => (
              <TH key={header}>{header}</TH>
            ))}
          </tr>
        </THead>
        <TBody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <TD key={`${cellIndex}-${cell}`}>{cell}</TD>
              ))}
            </tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
