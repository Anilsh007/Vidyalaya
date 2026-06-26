# Phase 13: Staff Management

Phase 13 adds a practical staff administration workspace to the school ERP.

## Scope

- Staff register at `/dashboard/staff`
- Staff create and edit workflow
- Staff archive workflow
- Teaching and non-teaching classification
- Department, designation, qualification, joining date, contact, gender, and salary reference fields
- Class-teacher assignment visibility from existing section setup
- Staff KPI cards for active staff, teaching staff, class teachers, and monthly payroll reference
- Staff search, type filter, department filter, and sort controls
- Staff CSV export from the reports workspace

## Permissions

- `staff.view`: Allows access to the staff workspace and staff report visibility.
- `staff.manage`: Allows create, edit, and archive actions for staff records.

Default seeded access:

- Super Admin: view and manage
- Admin: view and manage
- Principal: view

## Files Added Or Updated

- `app/(dashboard)/dashboard/staff/page.tsx`
- `app/(dashboard)/dashboard/staff/actions.ts`
- `app/(dashboard)/dashboard/staff/loading.tsx`
- `components/staff/staff-form.tsx`
- `lib/school.ts`
- `lib/permissions.ts`
- `lib/copy.ts`
- `lib/report-queries.ts`
- `app/api/reports/export/[reportType]/route.ts`
- `app/(dashboard)/dashboard/reports/page.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `components/shared/app-shell.tsx`

## Notes

This phase uses the existing Prisma `Staff` model, so no new database migration is required. New permissions are created by the existing seed flow because permissions are generated from `lib/permissions.ts`.
