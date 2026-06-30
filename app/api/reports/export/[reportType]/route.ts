import { NextResponse } from "next/server";

import { recordAuditLog } from "@/lib/audit";
import { recordSecurityAuditEvent } from "@/lib/audit/audit.service";
import { getOptionalSession } from "@/lib/auth/session";
import { rowsToCsv } from "@/lib/reports";
import {
  assertCanAccessReport,
  getReportRows,
  type ReportType
} from "@/lib/services/reports.service";
import { reportTypeSchema, reportsFilterSchema } from "@/lib/validations/reports";

type Params = Promise<{ reportType: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportType: rawReportType } = await params;
  const parsedType = reportTypeSchema.safeParse(rawReportType);
  if (!parsedType.success) {
    return NextResponse.json({ error: "Unknown report type" }, { status: 404 });
  }

  const reportType = parsedType.data as ReportType;

  try {
    assertCanAccessReport(session, reportType, "export");
  } catch (error) {
    await recordSecurityAuditEvent({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "auth.api.forbidden",
      entityType: "Route",
      entityId: `api.reports.export.${reportType}`,
      metadata: { url: request.url, reportType }
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Forbidden" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const parsedFilters = reportsFilterSchema.safeParse({
    classId: url.searchParams.get("classId") ?? "",
    sectionId: url.searchParams.get("sectionId") ?? "",
    examId: url.searchParams.get("examId") ?? "",
    startDate: url.searchParams.get("startDate") ?? "",
    endDate: url.searchParams.get("endDate") ?? ""
  });
  const safeFilters = parsedFilters.success ? parsedFilters.data : {};

  const rows = await getReportRows(session, reportType, {
    schoolId: session.schoolId,
    classId: safeFilters.classId || undefined,
    sectionId: safeFilters.sectionId || undefined,
    examId: safeFilters.examId || undefined,
    startDate: safeFilters.startDate ? new Date(`${safeFilters.startDate}T00:00:00.000Z`) : undefined,
    endDate: safeFilters.endDate ? new Date(`${safeFilters.endDate}T23:59:59.999Z`) : undefined
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "report.exported",
    entityType: "Report",
    metadata: {
      reportType,
      classId: safeFilters.classId ?? null,
      sectionId: safeFilters.sectionId ?? null,
      examId: safeFilters.examId ?? null,
      startDate: safeFilters.startDate ?? null,
      endDate: safeFilters.endDate ?? null,
      rowCount: rows.length
    }
  });

  const csv = rowsToCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${reportType}-report.csv"`
    }
  });
}
