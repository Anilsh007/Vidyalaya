import type { Prisma } from "@prisma/client";

const ACTION_LABELS: Record<string, string> = {
  "auth.login.success": "Successful sign in",
  "auth.login.failed": "Failed sign in",
  "auth.logout": "Signed out",
  "school.settings.updated": "School settings updated",
  "class.created": "Class created",
  "class.updated": "Class updated",
  "section.created": "Section created",
  "section.updated": "Section updated",
  "subject.created": "Subject created",
  "subject.updated": "Subject updated",
  "student.created": "Student created",
  "student.updated": "Student updated",
  "student.archived": "Student archived",
  "staff.created": "Staff created",
  "staff.updated": "Staff updated",
  "staff.archived": "Staff archived",
  "document.created": "Document created",
  "document.updated": "Document updated",
  "document.archived": "Document archived",
  "attendance.marked": "Attendance marked",
  "fee.head.created": "Fee head created",
  "fee.structure.created": "Fee structure created",
  "fee.invoice.created": "Fee invoice created",
  "fee.payment.recorded": "Fee payment recorded",
  "exam.created": "Exam created",
  "exam.updated": "Exam updated",
  "exam.archived": "Exam archived",
  "exam.marks.saved": "Exam marks saved",
  "exam.results.generated": "Exam results generated",
  "notice.created": "Notice created",
  "notice.updated": "Notice updated",
  "notice.archived": "Notice archived"
};

export function auditActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action.replaceAll(".", " ");
}

export function auditToneClass(action: string) {
  if (action.includes("failed") || action.includes("archived")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (action.includes("created") || action.includes("recorded") || action.includes("generated")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (action.includes("updated") || action.includes("saved") || action.includes("marked")) {
    return "border-blue-200 bg-blue-50 text-brand-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function auditMetadataSummary(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "No metadata";
  }

  const entries = Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 4)
    .map(([key, value]) => `${toLabel(key)}: ${formatValue(value)}`);

  return entries.length ? entries.join(" | ") : "No metadata";
}

function toLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replaceAll("_", " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (typeof value === "object" && value) {
    return "details";
  }

  return String(value);
}
