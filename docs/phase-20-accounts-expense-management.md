# Phase 20 - Accounts and Expense Management

Phase 20 adds a school expense and voucher workflow for day-to-day accounting.

## Scope

- Expense category master for utilities, maintenance, supplies, events, and other spending heads
- Expense voucher creation with date, paid-to details, vendor, amount, payment mode, reference, and description
- Voucher status workflow: draft, approved, paid, or cancelled
- Accounts dashboard KPIs for active categories, monthly expenses, draft vouchers, and paid expenses
- Approval queue for draft and approved vouchers needing action
- Expense register with recent voucher history
- Role-based accounts permissions and sidebar navigation
- Expense CSV export in the reports workspace
- Demo seed categories and vouchers

## Main Files

- `prisma/schema.prisma`
- `prisma/migrations/20260531182000_phase_20_expense_management/migration.sql`
- `lib/accounts.ts`
- `components/accounts/account-forms.tsx`
- `app/(dashboard)/dashboard/accounts/page.tsx`
- `app/(dashboard)/dashboard/accounts/actions.ts`
- `lib/report-queries.ts`
- `app/api/reports/export/[reportType]/route.ts`
- `prisma/seed.ts`

## Roles

- Admin and Principal can view and manage accounts.
- Accountant can view and manage accounts.
- Teacher can view accounts records.
- Super Admin inherits all permissions.

## Reporting

The reports workspace now includes an Expense report with voucher number, date, category, paid-to details, vendor, amount, payment mode, reference, status, approval date, paid date, and description. CSV export is available through `/api/reports/export/expenses`.
