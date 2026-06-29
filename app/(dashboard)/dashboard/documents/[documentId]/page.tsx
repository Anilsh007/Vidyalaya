import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Archive, FileText, FolderOpen, PencilLine } from "lucide-react";
import type { ReactNode } from "react";

import { archiveDocumentSubmitAction } from "@/app/(dashboard)/dashboard/documents/actions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requireAnyPermission } from "@/lib/rbac/guards";
import { db } from "@/lib/db";
import { documentOwnerLabel, documentOwnerTypeLabel, formatFileSize } from "@/lib/documents";
import { RBAC_PERMISSIONS } from "@/lib/rbac/permissions";
import { parentCanAccessDocument, studentCanAccessDocument } from "@/lib/rbac/scope";

type Params = Promise<{ documentId: string }>;

export default async function DocumentProfilePage({ params }: { params: Params }) {
  const session = await requireAnyPermission([
    RBAC_PERMISSIONS.documentsRead,
    RBAC_PERMISSIONS.documentsReadOwn,
    RBAC_PERMISSIONS.documentsReadChild,
    RBAC_PERMISSIONS.documentsUpdate,
    RBAC_PERMISSIONS.documentsArchive
  ]);
  const { documentId } = await params;
  const document = await db.document.findFirst({
    where: { id: documentId, schoolId: session.schoolId },
    include: { student: true, staff: true, user: true }
  });

  if (!document) {
    notFound();
  }

  const hasBroadDocumentAccess =
    session.permissions.includes(RBAC_PERMISSIONS.documentsRead) ||
    session.permissions.includes(RBAC_PERMISSIONS.documentsUpdate) ||
    session.permissions.includes(RBAC_PERMISSIONS.documentsArchive) ||
    session.permissions.includes(RBAC_PERMISSIONS.documentsUpload);

  if (!hasBroadDocumentAccess) {
    const allowed =
      session.roles.includes("STUDENT")
        ? await studentCanAccessDocument(session, document.id)
        : session.roles.includes("PARENT")
          ? await parentCanAccessDocument(session, document.id)
          : false;

    if (!allowed) {
      redirect("/forbidden");
    }
  }

  const auditLogs = await db.auditLog.findMany({
    where: {
      schoolId: session.schoolId,
      entityType: "Document",
      entityId: document.id,
      action: { in: ["document.created", "document.updated", "document.archived"] }
    },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  const canManageDocuments =
    session.permissions.includes(RBAC_PERMISSIONS.documentsUpdate) ||
    session.permissions.includes(RBAC_PERMISSIONS.documentsArchive);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Document profile"
        title={document.title}
        description={`${documentOwnerTypeLabel(document.ownerType)} • ${documentOwnerLabel(document)}`}
        actions={
          canManageDocuments ? (
            <div className="flex flex-wrap gap-3">
              <Link href={`/dashboard/documents/${document.id}/edit`}>
                <Button>
                  <PencilLine className="h-4 w-4" />
                  Edit document
                </Button>
              </Link>
              {!document.isArchived ? (
                <form action={archiveDocumentSubmitAction}>
                  <input type="hidden" name="documentId" value={document.id} />
                  <Button variant="danger">
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null
        }
      />

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-brand-700">
                <FileText className="h-5 w-5" />
              </div>
              <div className="grid gap-1">
                <CardTitle>Document summary</CardTitle>
                <p className="text-sm text-slate-600">Owner and status details for this record.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow label="Owner type" value={documentOwnerTypeLabel(document.ownerType)} />
            <InfoRow label="Owner" value={documentOwnerLabel(document)} />
            <InfoRow label="Uploaded" value={document.uploadedAt.toLocaleDateString("en-IN")} />
            <InfoRow label="Last updated" value={document.updatedAt.toLocaleDateString("en-IN")} />
            <InfoRow label="Status" value={document.isArchived ? "Archived" : "Active"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>File reference</CardTitle>
            <p className="text-sm text-slate-600">Metadata for locating and identifying the stored file.</p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FileTile icon={<FolderOpen className="h-4 w-4" />} label="File name" value={document.fileName} />
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="MIME type" value={document.mimeType ?? "Not set"} />
              <InfoRow label="File size" value={formatFileSize(document.fileSizeBytes)} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">File reference</p>
              <p className="mt-2 break-all text-sm font-medium text-slate-950">{document.filePath}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Document activity</CardTitle>
          <p className="text-sm text-slate-600">Recent changes made to this document record.</p>
        </CardHeader>
        <CardContent>
          {auditLogs.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>Action</TH>
                  <TH>By</TH>
                  <TH>When</TH>
                </tr>
              </THead>
              <TBody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <TD>{log.action}</TD>
                    <TD>{log.actor?.fullName ?? "System"}</TD>
                    <TD>{log.createdAt.toLocaleString("en-IN")}</TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No document activity has been recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-950">{value}</span>
    </div>
  );
}

function FileTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-brand-700">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
