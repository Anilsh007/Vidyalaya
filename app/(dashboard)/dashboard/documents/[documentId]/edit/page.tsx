import { notFound } from "next/navigation";

import { DocumentForm } from "@/components/school/document-form";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

type Params = Promise<{ documentId: string }>;

export default async function EditDocumentPage({ params }: { params: Params }) {
  const session = await requirePermission(PERMISSIONS.manageDocuments);
  const { documentId } = await params;
  const [document, students, staff, users] = await Promise.all([
    db.document.findFirst({ where: { id: documentId, schoolId: session.schoolId } }),
    db.student.findMany({
      where: { schoolId: session.schoolId, isArchived: false },
      select: { id: true, fullName: true, admissionNumber: true },
      orderBy: { fullName: "asc" }
    }),
    db.staff.findMany({
      where: { schoolId: session.schoolId, isArchived: false },
      select: { id: true, fullName: true, employeeCode: true },
      orderBy: { fullName: "asc" }
    }),
    db.user.findMany({
      where: { schoolId: session.schoolId, isActive: true },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: "asc" }
    })
  ]);

  if (!document) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Document center"
        title={`Edit ${document.title}`}
        description="Update the document owner, title, file reference, or metadata."
      />
      <DocumentForm
        title="Edit document"
        description="Changes are written to the document record and captured in the audit trail."
        submitLabel="Save changes"
        students={students.map((item) => ({ id: item.id, label: `${item.fullName} (${item.admissionNumber})` }))}
        staff={staff.map((item) => ({ id: item.id, label: `${item.fullName} (${item.employeeCode})` }))}
        users={users.map((item) => ({ id: item.id, label: `${item.fullName} (${item.email})` }))}
        values={{
          id: document.id,
          ownerType: document.ownerType,
          studentId: document.studentId ?? "",
          staffId: document.staffId ?? "",
          userId: document.userId ?? "",
          title: document.title,
          fileName: document.fileName,
          filePath: document.filePath,
          mimeType: document.mimeType ?? "",
          fileSizeBytes: document.fileSizeBytes?.toString() ?? ""
        }}
      />
    </div>
  );
}
