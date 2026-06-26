import { DocumentForm } from "@/components/school/document-form";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export default async function NewDocumentPage() {
  const session = await requirePermission(PERMISSIONS.manageDocuments);
  const [students, staff, users] = await getOwnerOptions(session.schoolId);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Document center"
        title="Add document record"
        description="Create a document reference for school files, student records, staff files, or user account documents."
      />
      <DocumentForm
        title="Document details"
        description="This phase stores document metadata and references. Use the file reference field for the local path, LAN share, or storage key used by the office."
        submitLabel="Create document"
        students={students}
        staff={staff}
        users={users}
        values={{
          ownerType: "SCHOOL",
          studentId: "",
          staffId: "",
          userId: "",
          title: "",
          fileName: "",
          filePath: "",
          mimeType: "application/pdf",
          fileSizeBytes: ""
        }}
      />
    </div>
  );
}

async function getOwnerOptions(schoolId: string) {
  return Promise.all([
    db.student.findMany({
      where: { schoolId, isArchived: false },
      select: { id: true, fullName: true, admissionNumber: true },
      orderBy: { fullName: "asc" }
    }).then((items) => items.map((item) => ({ id: item.id, label: `${item.fullName} (${item.admissionNumber})` }))),
    db.staff.findMany({
      where: { schoolId, isArchived: false },
      select: { id: true, fullName: true, employeeCode: true },
      orderBy: { fullName: "asc" }
    }).then((items) => items.map((item) => ({ id: item.id, label: `${item.fullName} (${item.employeeCode})` }))),
    db.user.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: "asc" }
    }).then((items) => items.map((item) => ({ id: item.id, label: `${item.fullName} (${item.email})` })))
  ]);
}
