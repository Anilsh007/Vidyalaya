# Phase 21 - Documents and Certificates

Phase 21 adds a document register for school, student, staff, and user records.

## Scope

- Document record creation with title, file name, file path or URL, MIME type, and file size
- Ownership support for school, student, staff, and user records
- Student/staff/user owner lookup while creating document records
- Archive workflow for document records
- Document KPIs for active, student, staff, and archived records
- Ownership summary panel
- Active document register and archived document register
- Document permissions and sidebar navigation
- Document CSV export in the reports workspace
- Demo seed student and staff documents

## Main Files

- `lib/documents.ts`
- `components/documents/document-forms.tsx`
- `app/(dashboard)/dashboard/documents/page.tsx`
- `app/(dashboard)/dashboard/documents/actions.ts`
- `lib/report-queries.ts`
- `app/api/reports/export/[reportType]/route.ts`
- `prisma/seed.ts`

## Roles

- Admin and Principal can view and manage documents.
- Accountant can view and manage documents.
- Teacher can view document records.
- Super Admin inherits all permissions.

## Reporting

The reports workspace now includes a Document report with title, owner type, owner name, owner code, class, section, file name, file path, MIME type, file size, status, upload date, and archive date. CSV export is available through `/api/reports/export/documents`.
