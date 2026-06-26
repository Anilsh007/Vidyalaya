# Phase 19 - Payroll Management

Phase 19 adds a payroll operations workspace for monthly salary processing.

## Scope

- Monthly payroll run generation from active staff salary references
- Staff-wise payroll slips with gross pay, allowances, deductions, and net pay
- Payroll run status tracking: draft, finalized, paid, or cancelled
- Payroll slip status tracking: draft, approved, or paid
- Payroll KPIs for salary staff, monthly payroll value, draft slips, and paid salary tracking
- Payroll run table with period, payment date, status, slips, and net total
- Payslip register with staff, designation, salary components, net pay, and payment status
- Role-based payroll permissions and sidebar navigation
- Payroll CSV export in the reports workspace
- Demo seed payroll run and payslips

## Main Files

- `prisma/schema.prisma`
- `prisma/migrations/20260531181000_phase_19_payroll_management/migration.sql`
- `lib/payroll.ts`
- `components/payroll/payroll-forms.tsx`
- `app/(dashboard)/dashboard/payroll/page.tsx`
- `app/(dashboard)/dashboard/payroll/actions.ts`
- `lib/report-queries.ts`
- `app/api/reports/export/[reportType]/route.ts`
- `prisma/seed.ts`

## Roles

- Admin and Principal can view and manage payroll.
- Accountant can view and manage payroll.
- Teacher can view payroll records.
- Super Admin inherits all permissions.

## Reporting

The reports workspace now includes a Payroll report with payroll period, staff details, gross pay, allowances, deductions, net pay, payment status, payment date, and remarks. CSV export is available through `/api/reports/export/payroll`.
