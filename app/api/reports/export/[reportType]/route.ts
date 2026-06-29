import { NextResponse } from "next/server";

import { recordAuditLog } from "@/lib/audit";
import { recordSecurityAuditEvent } from "@/lib/audit/audit.service";
import { getOptionalSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/guards";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { rowsToCsv } from "@/lib/reports";
import { getReportRows } from "@/lib/services/reports.service";
import { reportTypeSchema } from "@/lib/validations/reports";

type Params = Promise<{ reportType: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, RBAC_PERMISSIONS.reportsExport)) {
    await recordSecurityAuditEvent({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "auth.api.forbidden",
      entityType: "Route",
      entityId: "api.reports.export",
      metadata: { url: request.url }
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reportType: rawReportType } = await params;
  const parsedType = reportTypeSchema.safeParse(rawReportType);
  if (!parsedType.success) {
    return NextResponse.json({ error: "Unknown report type" }, { status: 404 });
  }

  const url = new URL(request.url);
  const classId = url.searchParams.get("classId") || undefined;
  const sectionId = url.searchParams.get("sectionId") || undefined;
  const examId = url.searchParams.get("examId") || undefined;
  const startDate = url.searchParams.get("startDate")
    ? new Date(`${url.searchParams.get("startDate")}T00:00:00.000Z`)
    : undefined;
  const endDate = url.searchParams.get("endDate")
    ? new Date(`${url.searchParams.get("endDate")}T23:59:59.999Z`)
    : undefined;

  const rows = await getReportRows(parsedType.data, {
    schoolId: session.schoolId,
    classId,
    sectionId,
    examId,
    startDate,
    endDate
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "report.exported",
    entityType: "Report",
    metadata: {
      reportType: parsedType.data,
      classId: classId ?? null,
      sectionId: sectionId ?? null,
      examId: examId ?? null,
      startDate: startDate?.toISOString() ?? null,
      endDate: endDate?.toISOString() ?? null,
      rowCount: rows.length
    }
  });

  const csv = rowsToCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${parsedType.data}-report.csv"`
    }
  });
}
