# Phase 18 - Leave Management

Phase 18 adds a student and staff leave workflow to Vidyalaya.

## Scope

- Leave request creation for students and staff
- Leave type, date range, inclusive day count, and reason tracking
- Pending approval queue for administrators and principals
- Approval, rejection, and cancellation decisions with review remarks
- Recent leave register with status and review history
- Leave dashboard counters for pending, approved, student, and staff requests
- Sidebar navigation and role-based permissions
- Leave CSV export in the reports workspace
- Demo seed data for one approved student leave and one pending staff leave

## Main Files

- `prisma/schema.prisma`
- `prisma/migrations/20260531180000_phase_18_leave_management/migration.sql`
- `lib/leaves.ts`
- `components/leaves/leave-forms.tsx`
- `app/(dashboard)/dashboard/leaves/page.tsx`
- `app/(dashboard)/dashboard/leaves/actions.ts`
- `lib/report-queries.ts`
- `app/api/reports/export/[reportType]/route.ts`
- `prisma/seed.ts`

## Roles

- Admin and Principal can view and manage leave requests.
- Teacher and Accountant can view leave records.
- Super Admin inherits all permissions.

## Reporting

The reports workspace now includes a Leave report with requester, requester type, leave type, start date, end date, total days, status, reason, reviewed date, and review remarks. CSV export is available through `/api/reports/export/leaves`.
