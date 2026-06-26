# Phase 14: Library Management

Phase 14 adds a persistent library module for book catalogue and circulation workflows.

## Scope

- Library workspace at `/dashboard/library`
- Book catalogue with accession number, title, author, category, publisher, ISBN, shelf, total copies, and available copies
- Book create, edit, and archive workflow
- Book issue workflow for student, staff, and other borrowers
- Book return workflow with optional fine amount and remarks
- Copy availability adjustment during issue and return
- Active circulation view with overdue highlighting
- Recent library activity table
- Library report in the reports workspace
- CSV export at `/api/reports/export/library`

## Permissions

- `library.view`: Allows access to the library workspace.
- `library.manage`: Allows catalogue, issue, return, and archive operations.

Default seeded access:

- Super Admin: view and manage
- Admin: view and manage
- Principal: view and manage
- Teacher: view

## Database Changes

- `LibraryBook`
- `LibraryIssue`
- `LibraryIssueStatus`

The migration is stored in `prisma/migrations/20260531172000_phase_14_library/migration.sql`.
