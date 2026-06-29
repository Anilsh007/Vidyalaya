import { DocumentOwnerType } from "@prisma/client";
import Link from "next/link";
import { FileText, Plus, Search } from "lucide-react";

import { EmptyState } from "@/components/school/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { documentOwnerLabel, documentOwnerTypeLabel, formatFileSize } from "@/lib/documents";
import { PERMISSIONS } from "@/lib/permissions";
import { getDocumentsPageData } from "@/lib/services/documents.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePermission(PERMISSIONS.viewDocuments);
  const params = await searchParams;
  const query = asSingle(params.q)?.trim() ?? "";
  const ownerTypeParam = asSingle(params.ownerType) ?? "";
  const ownerType = isDocumentOwnerType(ownerTypeParam) ? ownerTypeParam : "";
  const status = asSingle(params.status) ?? "active";
  const sort = asSingle(params.sort) ?? "recent";

  const { documents } = await getDocumentsPageData({
    schoolId: session.schoolId,
    query,
    ownerType,
    status,
    sort
  });

  const canManageDocuments = session.permissions.includes(PERMISSIONS.manageDocuments);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 25"
        title="Document center"
        description="Track school, student, staff, and user account document references from one searchable register."
        actions={
          canManageDocuments ? (
            <Link href="/dashboard/documents/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add document
              </Button>
            </Link>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Search and filters</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            Find documents by title, file name, file reference, student, staff, or user account.
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_180px] lg:items-end">
            <FormField label="Search" htmlFor="q">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input id="q" name="q" defaultValue={query} className="pl-9" placeholder="Title, file, owner" />
              </div>
            </FormField>
            <FormField label="Owner type" htmlFor="ownerType">
              <Select id="ownerType" name="ownerType" defaultValue={ownerType}>
                <option value="">All owners</option>
                <option value="SCHOOL">School</option>
                <option value="STUDENT">Student</option>
                <option value="STAFF">Staff</option>
                <option value="USER">User account</option>
              </Select>
            </FormField>
            <FormField label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={status}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="all">All records</option>
              </Select>
            </FormField>
            <FormField label="Sort" htmlFor="sort">
              <Select id="sort" name="sort" defaultValue={sort}>
                <option value="recent">Recently uploaded</option>
                <option value="title-asc">Title A-Z</option>
                <option value="owner-asc">Owner type</option>
              </Select>
            </FormField>
            <div className="flex flex-wrap gap-3 lg:col-span-4">
              <Button type="submit">Apply filters</Button>
              <Link href="/dashboard/documents">
                <Button variant="secondary">Reset</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-brand-700">
              <FileText className="h-5 w-5" />
            </div>
            <div className="grid gap-1">
              <CardTitle>Document register</CardTitle>
              <p className="text-sm leading-6 text-slate-600">
                {documents.length} record{documents.length === 1 ? "" : "s"} found.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <Table>
                <THead>
                  <tr>
                    <TH>Document</TH>
                    <TH>Owner</TH>
                    <TH>File</TH>
                    <TH>Size</TH>
                    <TH>Uploaded</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <TBody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <TD>
                        <Link href={`/dashboard/documents/${document.id}`} className="font-semibold text-brand-700 hover:text-brand-900">
                          {document.title}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">{documentOwnerTypeLabel(document.ownerType)}</p>
                      </TD>
                      <TD>{documentOwnerLabel(document)}</TD>
                      <TD>
                        <div className="grid gap-1 text-sm">
                          <span>{document.fileName}</span>
                          <span className="break-all text-xs text-slate-500">{document.filePath}</span>
                        </div>
                      </TD>
                      <TD>{formatFileSize(document.fileSizeBytes)}</TD>
                      <TD>{document.uploadedAt.toLocaleDateString("en-IN")}</TD>
                      <TD>
                        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${document.isArchived ? "border-slate-200 bg-slate-100 text-slate-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                          {document.isArchived ? "Archived" : "Active"}
                        </span>
                      </TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="No document records found" description="Add a document reference or adjust the filters to see records here." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function isDocumentOwnerType(value: string): value is DocumentOwnerType {
  return [
    DocumentOwnerType.SCHOOL,
    DocumentOwnerType.STUDENT,
    DocumentOwnerType.STAFF,
    DocumentOwnerType.USER
  ].includes(value as DocumentOwnerType);
}
