import { NextResponse } from "next/server";

import { getOptionalSession } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getAttendanceReport,
  getExamResultReport,
  getFeeCollectionReport,
  getPendingDuesReport,
  getStudentReport
} from "@/lib/report-queries";
import { rowsToCsv } from "@/lib/reports";

type Params = Promise<{ reportType: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.permissions.includes(PERMISSIONS.viewReports)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reportType } = await params;
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

  const filters = {
    schoolId: session.schoolId,
    classId,
    sectionId,
    examId,
    startDate,
    endDate
  };

  const rows =
    reportType === "student"
      ? await getStudentReport(filters)
      : reportType === "attendance"
        ? await getAttendanceReport(filters)
        : reportType === "fees"
          ? await getFeeCollectionReport(filters)
          : reportType === "dues"
            ? await getPendingDuesReport(filters)
            : reportType === "results"
              ? await getExamResultReport(filters)
              : null;

  if (!rows) {
    return NextResponse.json({ error: "Unknown report type" }, { status: 404 });
  }

  const csv = rowsToCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${reportType}-report.csv"`
    }
  });
}
