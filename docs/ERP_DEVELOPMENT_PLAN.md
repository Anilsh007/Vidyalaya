# ERP Development Plan

Date: 2026-06-28  
Phase: 1 - Prisma Schema and Seed Repair

## Real Project Root

Confirmed real repository root:

- `C:\Dashboard\school-erp`

Confirmed key paths:

- `package.json`: `C:\Dashboard\school-erp\package.json`
- Prisma schema: `C:\Dashboard\school-erp\prisma\schema.prisma`
- App directory: `C:\Dashboard\school-erp\app`
- Auth layer: `C:\Dashboard\school-erp\lib\auth`
- Permission source: `C:\Dashboard\school-erp\lib\permissions.ts`
- Next config: `C:\Dashboard\school-erp\next.config.ts`
- TypeScript config: `C:\Dashboard\school-erp\tsconfig.json`
- Prisma migrations: `C:\Dashboard\school-erp\prisma\migrations`

## Package Scripts

Available scripts from the real root:

- `dev`
- `build`
- `build:prod`
- `start`
- `lint`
- `typecheck`
- `prisma:validate`
- `prisma:generate`
- `prisma:migrate`
- `prisma:migrate:deploy`
- `prisma:seed`
- `setup:local`

## Command Execution Status From Real Root

Commands were attempted from `C:\Dashboard\school-erp`.

Results:

- `npm run lint` failed
- `npm run build` failed
- `npx prisma validate` failed
- `npx prisma generate` failed

Exact environment issue:

- `npm` fails because `C:\Users\anils\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js` is missing
- `npx` fails because `C:\Users\anils\AppData\Roaming\npm\node_modules\npm\bin\npx-cli.js` is missing

This is now confirmed as an environment/bootstrap issue, not a wrong-root issue.

## Existing Modules

### App routes present

- Auth
  - `/login`
- Dashboard
  - `/dashboard`
- Core ERP modules
  - `/dashboard/users`
  - `/dashboard/staff`
  - `/dashboard/students`
  - `/dashboard/attendance`
  - `/dashboard/fees`
  - `/dashboard/exams`
  - `/dashboard/notices`
  - `/dashboard/reports`
  - `/dashboard/documents`
  - `/dashboard/audit`
  - `/dashboard/settings`
- Advanced modules
  - `/dashboard/accounts`
  - `/dashboard/payroll`
  - `/dashboard/leaves`
  - `/dashboard/library`
  - `/dashboard/inventory`
  - `/dashboard/transport`
  - `/dashboard/hostel`

### Core schema modules actually present in Prisma

- School
- AcademicYear
- User / Role / Permission / UserRole / RolePermission
- Student / Parent / StudentGuardian
- Staff
- Class / Section / Subject
- Attendance
- Fees
- Exams
- Notice
- Document
- AuditLog
- Setting

## Broken Modules

These routes/pages exist in the app, but their backing Prisma models are not present in the real `prisma/schema.prisma`:

- Accounts
  - uses `expenseCategory`, `expenseVoucher`
- Library
  - uses `libraryBook`, `libraryIssue`
- Inventory
  - uses `inventoryItem`, `inventoryMovement`
- Transport
  - uses `transportVehicle`, `transportRoute`, `transportStop`, `transportAssignment`
- Hostel
  - uses `hostel`, `hostelRoom`, `hostelAllocation`
- Leaves
  - uses `leaveRequest`
- Payroll
  - uses `payrollRun`, `payrollSlip`
- Dashboard homepage
  - references data from several of the missing operational modules above

Important:

- migration folders for many of these modules exist
- schema still does not currently contain those models
- this strongly indicates schema/migration drift or incomplete rollback/merge cleanup

## Missing Prisma Models Referenced By Code

- `libraryBook`
- `libraryIssue`
- `inventoryItem`
- `inventoryMovement`
- `transportVehicle`
- `transportRoute`
- `transportStop`
- `transportAssignment`
- `hostel`
- `hostelRoom`
- `hostelAllocation`
- `leaveRequest`
- `payrollRun`
- `payrollSlip`
- `expenseCategory`
- `expenseVoucher`

## Existing Roles

Actual backend `RoleCode` enum:

- `SUPER_ADMIN`
- `ADMIN`
- `PRINCIPAL`
- `TEACHER`
- `ACCOUNTANT`
- `STUDENT`
- `PARENT`

UI/experience role layer currently recognized in code:

- `SUPER_ADMIN`
- `ADMIN`
- `PRINCIPAL`
- `DIRECTOR`
- `TEACHER`
- `HOD`
- `EXAM_CONTROLLER`
- `ACCOUNTANT`
- `PROCUREMENT_MANAGER`
- `LIBRARIAN`
- `TRANSPORT_MANAGER`
- `HOSTEL_WARDEN`
- `FRONT_DESK`
- `SECURITY_GUARD`
- `PEON`
- `MAINTENANCE_TECHNICIAN`
- `NURSE`
- `STUDENT`
- `PARENT`

Additional alias-based experience roles also appear in `lib/dashboard-experience.ts`:

- `ACADEMIC_HEAD`
- `INSTRUCTOR`
- `CASHIER`
- `FINANCE_HEAD`
- `MEDIA_CENTER_MANAGER`
- `DRIVER_COORDINATOR`
- `RESIDENTIAL_IN_CHARGE`
- `RECEPTIONIST`
- `ADMISSION_COUNSELOR`
- `INVENTORY`
- `STORES`
- `INVENTORY_MANAGER`

## Missing Specific Backend Roles

These roles are used in UI logic but do not exist in the real Prisma `RoleCode` enum:

- `DIRECTOR`
- `HOD`
- `EXAM_CONTROLLER`
- `PROCUREMENT_MANAGER`
- `LIBRARIAN`
- `TRANSPORT_MANAGER`
- `HOSTEL_WARDEN`
- `FRONT_DESK`
- `SECURITY_GUARD`
- `PEON`
- `MAINTENANCE_TECHNICIAN`
- `NURSE`

## Current Permission Gaps

### 1. Dangerous broad permission inheritance

Current `DEFAULT_ROLE_PERMISSIONS` shows production-risky access:

- `SUPER_ADMIN` gets all permissions
- `ADMIN` gets all permissions
- `PRINCIPAL` gets almost every operational module including accounts, payroll, leaves, library, inventory, transport, hostel
- `TEACHER` still gets visibility into accounts, payroll, leaves, library, inventory, transport, hostel
- `ACCOUNTANT` gets inventory, transport, hostel visibility
- `STUDENT` and `PARENT` currently get no default permissions at all

This is not a limited-access ERP permission model.

### 2. UI role mapping compresses specialized roles into broad roles

Examples from `lib/user-management.ts`:

- `LIBRARIAN` -> `RoleCode.ADMIN`
- `TRANSPORT_MANAGER` -> `RoleCode.ADMIN`
- `HOSTEL_WARDEN` -> `RoleCode.ADMIN`
- `FRONT_DESK` -> `RoleCode.ADMIN`
- `SECURITY_GUARD` -> `RoleCode.ADMIN`
- `PEON` -> `RoleCode.ADMIN`
- `MAINTENANCE_TECHNICIAN` -> `RoleCode.ADMIN`
- `NURSE` -> `RoleCode.ADMIN`
- `HOD` -> `RoleCode.TEACHER`
- `EXAM_CONTROLLER` -> `RoleCode.TEACHER`
- `PROCUREMENT_MANAGER` -> `RoleCode.ACCOUNTANT`
- `DIRECTOR` -> `RoleCode.PRINCIPAL`

This causes role ambiguity, over-permission risk, and weak audit semantics.

### 3. Student and Parent portal permissions are incomplete

Current source confirms:

- `STUDENT: []`
- `PARENT: []`

So personalized portal permissions are not properly modeled yet.

### 4. Row-level access is not yet centrally enforced

Visible role and permission checks are present, but a central row-level policy layer is not yet evident for:

- teacher assigned classes / sections / subjects
- student own-only data
- parent linked-child-only data
- finance-only scoped records

### 5. Navigation is centrally influenced, but not yet production-safe

Positive:

- navigation and default routes are centrally shaped via `lib/dashboard-experience.ts`

Gap:

- route labels and landing behavior depend on alias roles that do not exist as first-class backend roles
- this introduces drift between auth truth and UI experience

## Build and Repository Health Issues

### 1. Prisma schema and migrations are inconsistent

Migrations exist for:

- library
- inventory
- transport
- hostel
- leave management
- payroll management
- expense management

But the current schema does not include those module models.

### 2. README has unresolved merge conflict text

`README.md` currently contains unresolved merge conflict text at the top and bottom of the file.

These markers must be removed so repository text and documentation remain clean.

This is a repository hygiene blocker.

### 3. App has advanced routes that are not schema-backed

This means:

- some pages will type-fail
- some routes will runtime-fail
- some dashboards may rely on missing delegates

## Static / Demo / Fake Business Data Audit

### Confirmed violations of the new dynamic-data rule

The repository currently contains fake/demo business data in `prisma/seed.ts`:

- `demoUsers`
- `DEMO_PASSWORD`
- seeded bootstrap school
- seeded sample class, section, subject
- seeded sample student
- seeded sample attendance
- seeded sample fee invoice/payment
- seeded sample notice
- seeded sample exam / marks / result
- seeded sample documents

This is acceptable only for local bootstrap/testing if explicitly isolated as development seed data. It is not acceptable as hidden production business content.

### Important nuance

Static business data was confirmed in seed/bootstrap data.  
The quick code scan did not prove widespread hardcoded dashboard counts inside the audited files yet, but Phase 1.5 must still do a stricter pass for:

- hardcoded dashboard metrics
- chart arrays
- fake recent activity feeds
- placeholder operational records

### Immediate rule going forward

If a module has no real DB table or no real data:

- show empty state
- show setup required state
- show permission denied state
- show module not configured state

Do not render fake production-looking records.

## Cleanup Candidates

- normalize backend roles before expanding more UI role families
- rebuild permission matrix with least privilege
- centralize row-level access policies
- remove or isolate demo seed content from production expectations
- remove broken advanced module routes from navigation until schema support is real
- resolve README merge conflict
- inspect whether advanced module migrations should be restored into schema or intentionally retired

## Recommended Next Phases

### Phase 1 - Prisma Schema and Migration Repair

- compare all Prisma model usage against schema
- reconcile schema with existing migration history
- either restore missing models or explicitly retire broken modules
- prevent pages from referencing non-existent delegates

### Phase 1.5 - Static Data Removal Audit

- eliminate hardcoded business metrics and fake operational arrays
- move dashboard data into centralized Prisma-backed services
- keep only labels/icons/route metadata/permission enums static

### Phase 2 - RBAC Normalization

- create real backend role model for professional operational roles
- replace broad fallback mapping
- rework permission matrix for least privilege
- properly model student and parent portal permissions

### Phase 3 - Row-Level Enforcement

- teacher-scoped academic data
- student own-only records
- parent linked-child-only records
- finance / operations scoped visibility

## Phase 0.5 Conclusion

The full repository context has now been recovered.

What is confirmed:

- `package.json` exists
- real Prisma schema exists
- app route tree exists
- auth layer exists
- permission source exists
- migration history exists

What remains blocked before Phase 1 implementation:

- npm/npx environment is broken on this machine
- schema and migration history are inconsistent
- specialized ERP modules are routed but not schema-backed
- RBAC is too broad for a professional ERP
- demo/sample business seed data exists and must not drive production UX

## Phase 1 Update

### Models restored in schema

The Phase 1 schema patch restores the advanced Prisma models already used by app routes and actions:

- `LibraryBook`
- `LibraryIssue`
- `InventoryItem`
- `InventoryMovement`
- `TransportVehicle`
- `TransportRoute`
- `TransportStop`
- `TransportAssignment`
- `Hostel`
- `HostelRoom`
- `HostelAllocation`
- `LeaveRequest`
- `PayrollRun`
- `PayrollSlip`
- `ExpenseCategory`
- `ExpenseVoucher`

### Enums restored in schema

- `LibraryIssueStatus`
- `InventoryMovementType`
- `TransportAssignmentStatus`
- `HostelAllocationStatus`
- `LeaveRequesterType`
- `LeaveRequestStatus`
- `PayrollRunStatus`
- `PayrollSlipStatus`
- `ExpenseVoucherStatus`

### Migration inspection result

Advanced module create-migrations already existed:

- `20260531172000_phase_14_library`
- `20260531173000_phase_15_inventory`
- `20260531174000_phase_16_transport`
- `20260531175000_phase_17_hostel`
- `20260531180000_phase_18_leave_management`
- `20260531181000_phase_19_payroll_management`
- `20260531182000_phase_20_expense_management`

Destructive drift was introduced later by:

- `20260627132112_add_staff_reporting_manager`

That migration adds staff reporting-line fields but also drops all advanced operational module tables and enums.  
Because current app routes still depend on those modules, a corrective migration is required instead of silently keeping the destructive drop.

### Seed cleanup completed

`prisma/seed.ts` was reduced to production-safe bootstrap setup only:

- default school bootstrap
- current academic year bootstrap
- permissions
- roles
- role-permission mappings
- one bootstrap super admin account

Removed from default seed flow:

- demo users
- sample students
- sample staff
- sample attendance
- sample fees
- sample exams
- sample notices
- sample documents
- sample audit business records

`ALLOW_DEMO_SEED=true` is now treated as an explicit warning only. Demo business records are intentionally not inserted.

### README and conflict status

- `README.md` was cleaned to remove unresolved merge-conflict text
- bootstrap seed documentation now describes system setup instead of demo data
- repository-wide conflict-marker search must return clean after syncing updated docs and README

### Static business data locations found

Confirmed business-data violations found in this phase:

- `prisma/seed.ts`

Non-business demo wording also found and cleaned in:

- `README.md`
- `scripts/docker-entrypoint.sh`

Follow-up static-data audit still required in Phase 1.5 for:

- dashboard metrics
- chart series
- recent activity feeds
- role dashboards
- report summaries

### Commands to attempt from real root

Required command set for this phase:

- `npm run lint`
- `npm run build`
- `npm run typecheck`
- `npm run prisma:validate`
- `npm run prisma:generate`

If global `npm` and `npx` remain broken, direct local binaries should be attempted from `node_modules/.bin` and failures documented exactly.

### Remaining risks before Phase 2

- Prisma validation and client generation are still blocked until command execution succeeds
- corrective migration must be applied against the real database before advanced modules can runtime safely work again
- RBAC remains overly broad and is not normalized yet
- Student and Parent permissions remain incomplete
- Phase 1.5 still needs a full database-driven dashboard/static-data replacement pass

## Phase 1A Update

### Prisma client lock status

- Direct `prisma validate` passes from the local binary.
- Prisma client generation originally failed because the generated client files were locked.
- Running School ERP-specific Node processes were identified:
  - `npm run dev`
  - `next dev`
  - `start-server.js`
  - `.next/dev/build/postcss.js`
- Those project-specific Node processes were stopped safely without touching Codex runtime Node processes.
- After stopping them, direct local `prisma generate` passed successfully.

Safe Windows fallback if this lock returns later:

- `taskkill /F /IM node.exe`

This fallback was documented but not used broadly because targeted process shutdown worked.

### LoadingSkeleton fix

- Added a centralized `LoadingSkeleton` export in `components/shared/loading-skeleton.tsx`.
- This resolved the build blocker for:
  - `accounts/loading.tsx`
  - `leaves/loading.tsx`
  - `payroll/loading.tsx`

### TypeScript blockers fixed

Fixed in this stabilization phase:

- settings action error-return typing via centralized `actionError(...)`
- document archive action signature mismatch for `useActionState`
- document detail page form action updated to use a simple submit wrapper
- toast container prop typing fixed by using supported `style`
- shared `UserSelectOption` type added and reused across user form / user control
- report-card settings JSON values now normalize through a typed string reader
- accounts voucher row typing updated to allow nullable descriptions

### Build status

- Direct local `next build` passes when run outside the sandbox.

### Typecheck status

- Direct local `tsc --noEmit --incremental false` passes when run outside the sandbox.
- Plain `tsc --noEmit` inside sandbox still tries to write `tsconfig.tsbuildinfo` and can fail with `EPERM`.
- The non-incremental run is currently the reliable local fallback while sandboxed.

### Lint status

- Direct local `eslint .` still fails.
- Remaining lint failures are pre-existing repository issues and were not all fixed in Phase 1A because they extend beyond the targeted stabilization blockers.
- Common remaining categories:
  - `_prevState` unused in many server actions
  - unused imports/variables in several dashboard pages/components
  - environment globals in `postcss.config.js` and `public/sw.js`

### Commands attempted

Direct local binaries from `C:\Dashboard\school-erp`:

- `.\node_modules\.bin\prisma.cmd validate` -> passed
- `.\node_modules\.bin\prisma.cmd generate` -> passed after stopping stale School ERP Node processes
- `.\node_modules\.bin\tsc.cmd --noEmit` -> blocked by sandbox write to `tsconfig.tsbuildinfo`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false` -> passed
- `.\node_modules\.bin\next.cmd build` -> passed when run outside the sandbox
- `.\node_modules\.bin\eslint.cmd .` -> still failing on pre-existing lint issues

Global npm/npx scripts:

- still blocked by broken Windows global npm bootstrap
- `npm-cli.js` and `npx-cli.js` are still missing from the user profile install path

### Remaining blockers

- repo lint is still not green
- migration file exists but actual database migration application still needs to be run against the target environment
- Phase 1.5 static business-data audit is still pending

### Data integrity confirmation

- No fake/static/demo business data was added in Phase 1A
- Only build/type/prisma stabilization fixes were applied

## Phase 1.5 Update

### Static-data audit scope

Repo-wide keyword audit was run across:

- `app/`
- `components/`
- `lib/`
- `prisma/`
- `scripts/`
- `public/`
- `README.md`
- `docs/`

Search keywords used:

- `mock`
- `demo`
- `sample`
- `fake`
- `static`
- `placeholder`
- `dummy`
- `recentActivities`
- `chartData`
- `dashboardStats`
- `studentsData`
- `staffData`
- `attendanceData`
- `feeData`
- `examData`
- `noticesData`
- `documentData`
- `libraryData`
- `transportData`
- `hostelData`
- `payrollData`
- `expenseData`

### Classification summary

#### A. Allowed config/static UI

These findings remain allowed because they are not business records:

- input placeholders in forms
- route and UI labels
- select placeholders such as `Select`
- empty-state copy
- permission and role labels
- table/form metadata

#### B. Not allowed business data

The main production-unsafe business-like static data found in the app layer was concentrated in:

- `app/(dashboard)/dashboard/page.tsx`

Violations found there before this phase:

- hardcoded trend copy attached to dashboard metrics
- hardcoded role-specific alert timeline entries with fake timestamps
- proxy metrics that simulated unsupported module data instead of returning empty/zero states
- chart and summary assembly logic embedded directly in the page instead of a centralized DB service

#### C. Development-only data

- `prisma/seed.ts` contains an `ALLOW_DEMO_SEED` environment check, but demo business record insertion is intentionally disabled

#### D. Documentation only

Documentation still references historical fake/demo data as audit history in:

- `docs/ERP_DEVELOPMENT_PLAN.md`
- `README.md`

These references are allowed because they document cleanup history, not runtime ERP data.

### Static business data removed

Dashboard homepage logic was refactored to eliminate fake production-looking data in touched files:

- hardcoded dashboard alert timeline entries were removed
- fallback fake activities were removed
- unsupported operational metrics no longer use proxy values from unrelated tables
- role dashboard data no longer lives as page-level static business arrays

### Centralized dashboard service added

Created:

- `lib/services/dashboard.service.ts`

This service now centralizes role-aware dashboard data loading and exposes:

- `getDashboardOverview(params)`
- `getAdminDashboardData(params)`
- `getPrincipalDashboardData(params)`
- `getTeacherDashboardData(params)`
- `getAccountantDashboardData(params)`
- `getStudentDashboardData(params)`
- `getParentDashboardData(params)`
- `getLibrarianDashboardData(params)`
- `getTransportDashboardData(params)`
- `getHostelDashboardData(params)`
- `getHrDashboardData(params)`
- `getFrontDeskDashboardData(params)`

### Dashboard data replacement result

`app/(dashboard)/dashboard/page.tsx` was rewritten to consume the centralized dashboard service instead of embedding business logic directly.

Current Phase 1.5 dashboard behavior:

- metrics come from real Prisma counts/aggregations
- charts come from real Prisma-backed aggregation helpers
- recent activity comes from live `AuditLog` and published `Notice` records only
- if no recent activity exists, the UI shows an empty state
- if a module-specific data source is not configured, the service returns `0` or `[]` with a truthful hint instead of fake records

### Seed confirmation

Confirmed again:

- no demo business records are seeded by default
- `ALLOW_DEMO_SEED=true` does not inject fake ERP data
- bootstrap remains limited to system setup concerns only

### Commands to attempt for this phase

Direct local binaries from `C:\Dashboard\school-erp`:

- `.\node_modules\.bin\prisma.cmd validate`
- `.\node_modules\.bin\prisma.cmd generate`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`
- `.\node_modules\.bin\next.cmd build`
- optional: `.\node_modules\.bin\eslint.cmd .`

### Remaining work before Phase 2

- repo-wide lint backlog still exists outside the touched dashboard service/page files
- some advanced operational domains still return empty/zero states until those modules capture real records
- broader RBAC tightening is still pending and belongs to Phase 2

### Data integrity confirmation

- No fake/static/demo business data remains in the touched Phase 1.5 runtime files
- Touched dashboard files now rely on Prisma/service-layer data or explicit empty states

## Phase 2 Update

### RBAC audit summary

Current centralized RBAC sources confirmed:

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `lib/rbac/roles.ts`
- `lib/rbac/permissions.ts`
- `lib/rbac/role-permissions.ts`
- `lib/rbac/guards.ts`
- `lib/rbac/scope.ts`
- `lib/permissions.ts`
- `lib/auth/session.ts`
- `lib/auth/access.ts`
- `lib/user-management.ts`

Current real `RoleCode` enum:

- `SUPER_ADMIN`
- `ADMIN`
- `PRINCIPAL`
- `DIRECTOR`
- `HOD`
- `TEACHER`
- `EXAM_CONTROLLER`
- `ACCOUNTANT`
- `PROCUREMENT_MANAGER`
- `LIBRARIAN`
- `TRANSPORT_MANAGER`
- `HOSTEL_WARDEN`
- `FRONT_DESK`
- `HR`
- `NURSE`
- `SECURITY_GUARD`
- `MAINTENANCE_TECHNICIAN`
- `PEON`
- `STUDENT`
- `PARENT`

Permission source:

- canonical permission keys already live in `lib/rbac/permissions.ts`
- `lib/permissions.ts` remains a compatibility layer for older page/action imports

Role-permission seed flow:

- `prisma/seed.ts` seeds permissions from `RBAC_PERMISSIONS`
- roles are seeded from `RBAC_ROLE_CODES`
- mappings are seeded from `DEFAULT_ROLE_PERMISSIONS`
- seed remains idempotent and production-safe

Where permissions are checked:

- server actions primarily use `requirePermission(...)`
- centralized guard helpers live in `lib/rbac/guards.ts`
- session hydration loads DB-backed role permissions in `lib/auth/session.ts`

Where roles are still used directly:

- `lib/dashboard-experience.ts`
- `lib/services/dashboard.service.ts`
- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/dashboard/users/page.tsx`
- `app/(dashboard)/dashboard/notices/actions.ts`

These direct role references are currently used for UX/view tailoring, not for replacing server-side permission checks.

### Role enum and migration status

Professional roles already exist in schema and are backed by migration:

- `prisma/migrations/20260628210000_expand_rbac_foundation/migration.sql`

This migration expands `RoleCode` without collapsing operational roles into `ADMIN`, `TEACHER`, or `ACCOUNTANT`.

### Centralized RBAC foundation status

Confirmed centralized files:

- `lib/rbac/roles.ts`
- `lib/rbac/permissions.ts`
- `lib/rbac/role-permissions.ts`
- `lib/rbac/guards.ts`
- `lib/rbac/scope.ts`
- `lib/rbac/types.ts`

Phase 2 improvements applied:

- added `requireSuperAdmin()` to `lib/rbac/guards.ts`
- kept permission strings centralized under `RBAC_PERMISSIONS`
- kept role assignment authority centralized through `lib/rbac/roles.ts` and `lib/user-management.ts`

### Role-permission matrix summary

Current matrix is centralized in `lib/rbac/role-permissions.ts` and now cleanly distinguishes:

- system admin
- school admin
- academic leadership
- classroom roles
- finance roles
- operational roles
- support roles
- student/parent self-service roles

Dangerous backend fallbacks such as:

- `LIBRARIAN -> ADMIN`
- `TRANSPORT_MANAGER -> ADMIN`
- `HOSTEL_WARDEN -> ADMIN`
- `FRONT_DESK -> ADMIN`
- `NURSE -> ADMIN`
- `SECURITY_GUARD -> ADMIN`
- `PEON -> ADMIN`
- `HOD -> TEACHER`
- `EXAM_CONTROLLER -> TEACHER`
- `PROCUREMENT_MANAGER -> ACCOUNTANT`

are no longer present in the real role model or seed matrix.

### Server-side hardening completed

Granular permission enforcement was tightened in high-risk actions:

- `app/(dashboard)/dashboard/users/actions.ts`
  - create/update now require user-management permissions through centralized RBAC keys
  - delete now requires `users.delete`
  - permanent delete is additionally restricted through `requireSuperAdmin()`
- `app/(dashboard)/dashboard/students/actions.ts`
  - create/update now use create-vs-update aware checks
  - archive now requires `students.delete`
- `app/(dashboard)/dashboard/staff/actions.ts`
  - create/update now use create-vs-update aware checks
  - archive now requires `staff.delete`
- `app/(dashboard)/dashboard/documents/actions.ts`
  - create/upload vs update now use document-specific permissions
  - archive now requires `documents.archive`
- `app/(dashboard)/dashboard/exams/actions.ts`
  - exam create/update is now split by action intent
  - grade configuration now requires moderation-grade authority
  - marks-sheet save now requires marks entry or moderation authority

### Scope helper foundation

Existing centralized scope helpers were confirmed in `lib/rbac/scope.ts`:

- `canAccessStudent()`
- `canAccessStaff()`
- `canAccessClass()`
- `canAccessSection()`
- `canAccessOwnData()`
- `parentCanAccessChild()`
- `teacherCanAccessAssignedClass()`
- `teacherCanAccessStudent()`

Security posture:

- scope denies by default when relationship proof is missing
- teacher scope currently depends on `classTeacherFor`
- parent scope depends on `studentGuardian`

### Remaining scope work

Scope helpers exist, but broader page/action adoption is still pending for:

- student detail self/child access flows
- document owner-specific scope checks
- exam result self/child scope checks
- fee self/child scope checks

This is intentionally deferred to later phases so Phase 2 does not destabilize working routes.

### User-management authority status

User management now works with real role values from Prisma `RoleCode`.

Current authority controls confirmed:

- assignable roles are centralized
- `SUPER_ADMIN` assignment remains restricted by current session authority
- user creation/edit no longer depends on legacy fake role values

### Commands to run for Phase 2

Direct local binaries from `C:\Dashboard\school-erp`:

- `.\node_modules\.bin\prisma.cmd validate`
- `.\node_modules\.bin\prisma.cmd generate`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`
- `.\node_modules\.bin\next.cmd build`

### Remaining risks before Phase 3

- `lib/dashboard-experience.ts` still contains legacy UX aliases for historical compatibility; these are not permission grants but should be cleaned during navigation/module-config work
- some older pages still consume compatibility aliases from `lib/permissions.ts`
- row-level scope is not yet enforced across every student/parent-facing route
- Prisma generate may still fail on Windows if `query_engine-windows.dll.node` is locked by a running Node process

### Data integrity confirmation

- No fake/static/demo business data was added in Phase 2
- Phase 2 changes focused on centralized RBAC hardening only

## Phase 3 Update

### Navigation audit summary

Current navigation/module sources found:

- `lib/copy.ts`
- `lib/dashboard-experience.ts`
- `components/shared/app-shell.tsx`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `lib/rbac/guards.ts`

Duplicate runtime navigation sources found before this phase:

- `NAV_ITEMS` in `lib/copy.ts`
- role-driven nav/default-route logic in `lib/dashboard-experience.ts`
- sidebar rendering in `components/shared/app-shell.tsx`
- dashboard quick-action links rendered without centralized route visibility filtering

Hardcoded role-navigation logic found before this phase:

- `getVisibleNavItems(...)`
- `getDefaultDashboardRoute(...)`
- `ROLE_ROUTE_ORDER`
- `ROLE_NAV_LABELS`
- role alias routing in `lib/dashboard-experience.ts`

Legacy UX aliases found:

- `ACADEMIC_HEAD`
- `INSTRUCTOR`
- `CASHIER`
- `FINANCE_HEAD`
- `MEDIA_CENTER_MANAGER`
- `DRIVER_COORDINATOR`
- `RESIDENTIAL_IN_CHARGE`
- `RECEPTIONIST`
- `ADMISSION_COUNSELOR`
- `INVENTORY`
- `STORES`
- `INVENTORY_MANAGER`

These were part of older UX heuristics and are no longer used for live navigation decisions in the touched files.

### Central module config created

Created:

- `lib/modules/module-config.ts`
- `lib/modules/module-access.ts`

This is now the centralized source for:

- module metadata
- module status
- module permissions
- route visibility
- default dashboard route selection
- primary modules by role

### Navigation updates applied

Updated:

- `components/shared/app-shell.tsx`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `lib/rbac/guards.ts`
- `lib/dashboard-experience.ts`
- `lib/copy.ts`

Result:

- sidebar navigation now derives from `getVisibleModules(...)`
- default redirect route now derives from centralized module access helpers
- dashboard quick actions, metrics, charts, and notice-center shortcut are filtered through centralized route access checks
- `lib/dashboard-experience.ts` remains UX/display-only for workspace copy, not permission grants

### Duplicate nav code removed

Removed from active runtime navigation logic:

- `NAV_ITEMS` in `lib/copy.ts`
- `getVisibleNavItems(...)`
- `ROLE_NAV_LABELS`
- `ROLE_ROUTE_ORDER`

This eliminates the duplicate navigation source and keeps module visibility centralized.

### Module status review

#### Active modules

- `dashboard`
- `students`
- `staff`
- `attendance`
- `fees`
- `exams`
- `documents`
- `notices`
- `reports`
- `users`
- `settings`
- `audit`

#### Beta modules

- `library`
- `inventory`
- `transport`
- `hostel`
- `leaves`
- `payroll`
- `accounts`

These routes exist and build, but remain better classified as controlled/beta operational modules until broader product hardening is finished.

#### Hidden modules

- `health`
- `reception`
- `maintenance`
- `security`
- `student-portal`
- `parent-portal`

These permissions can exist, but links stay hidden because route work is not ready for safe navigation exposure.

### Route access helper status

Implemented in `lib/modules/module-access.ts`:

- `getVisibleModules(user)`
- `getVisibleModuleChildren(user, module)`
- `canAccessModule(user, moduleKey)`
- `canAccessRoute(user, pathname)`
- `getDefaultDashboardRoute(user)`
- `getPrimaryModulesForRole(user)`
- `getModuleByKey(moduleKey)`

Important:

- this helper controls navigation visibility and route selection
- it does not replace server-side RBAC guards
- server actions remain protected by Phase 2 permission checks

### Remaining risks before Phase 4

- route-level denial middleware is still not centralized; current enforcement remains page/action based plus redirect helpers
- some existing pages still use `resolveExperienceRole(...)` for display copy
- hidden modules will need real routes before they can be safely exposed
- broader lint backlog is still intentionally out of scope

### Commands to run for Phase 3

Direct local binaries from `C:\Dashboard\school-erp`:

- `.\node_modules\.bin\prisma.cmd validate`
- `.\node_modules\.bin\prisma.cmd generate`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`
- `.\node_modules\.bin\next.cmd build`

### Data integrity confirmation

- No fake/static/demo business data was added in Phase 3
- Phase 3 changes centralized module and navigation visibility only

## Phase 4 Update

### Auth and session audit summary

Auth/session files audited:

- `lib/auth/session.ts`
- `lib/auth/actions.ts`
- `lib/auth/password.ts`
- `lib/auth/access.ts`
- `app/(auth)/login/actions.ts`
- `app/(auth)/login/page.tsx`
- `app/(dashboard)/layout.tsx`
- `app/api/reports/export/[reportType]/route.ts`
- `app/(dashboard)/dashboard/profile/actions.ts`
- `lib/rbac/guards.ts`
- `lib/modules/module-access.ts`
- `lib/audit.ts`
- `lib/env.ts`

Current login flow:

- login form posts to `app/(auth)/login/actions.ts`
- credentials are validated server-side
- password verification uses centralized hashing helper
- session payload is created server-side
- signed session cookie is stored as httpOnly

Current session strategy after hardening:

- session cookie payload is signed with HMAC
- cookie payload includes `userId`, `schoolId`, roles, permissions, and expiry
- cookie is never trusted blindly for sensitive DB work
- `getOptionalSession()` re-hydrates the current live session from DB using `userId`
- server actions and layouts still use DB-backed session hydration for authoritative access

### Centralized auth helpers added / hardened

Added:

- `lib/auth/security.ts`
- `lib/auth/rate-limit.ts`
- `lib/auth/current-user.ts`

Hardened:

- `lib/auth/session.ts`
- `lib/auth/actions.ts`
- `lib/auth/access.ts`

Available centralized helpers now include:

- `getCurrentSession()`
- `requireSession()`
- `getCurrentUser()`
- `requireCurrentUser()`
- `requireAuthenticatedUser()`
- `createSessionCookie()`
- `clearSessionCookie()`
- `verifySessionCookie()`
- `logout()`

### Cookie security status

Verified / improved:

- `httpOnly: true`
- `sameSite: "lax"`
- `path: "/"`
- explicit `expires`
- explicit `maxAge`
- `secure: true` in production or HTTPS deployments
- session cookie is signed

Environment requirement:

- `SESSION_SECRET` is validated in `lib/env.ts`
- current minimum enforced length is 32 characters

### Password security status

Verified:

- passwords are hashed with `scrypt`
- password verification is centralized
- plaintext passwords are not stored

Added:

- centralized password policy in `lib/auth/password.ts`
- minimum length of 8
- uppercase/lowercase/number requirement
- profile password change now validates centralized policy

Limitations:

- schema does not yet contain a dedicated force-reset or password-version field
- forced reset remains an application-layer workflow, not a schema-enforced auth control yet

### Login rate-limit foundation

Added:

- `lib/auth/rate-limit.ts`

Current strategy:

- in-memory per email+IP limiter
- repeated failures are blocked temporarily
- successful login clears the limiter state
- invalid login response remains generic and does not reveal whether the account exists

Limitation:

- current limiter is process-local and not distributed
- production multi-instance deployment would need Redis or a shared store later

### Route protection and direct URL access

Added:

- `proxy.ts`
- public forbidden page at `app/forbidden/page.tsx`

Protection strategy:

- proxy protects `/dashboard/:path*`
- unauthenticated requests redirect to `/login?next=...`
- proxy injects current pathname into a request header for server layout checks
- `app/(dashboard)/layout.tsx` uses `requireCurrentUser()` plus `canAccessRoute(...)`
- route access denies by default when centralized module access does not allow the path

This closes the direct URL access gap for the protected dashboard group in a centralized way.

### Forbidden / unauthorized experience

Added:

- `app/forbidden/page.tsx`

Behavior:

- no sensitive details are shown
- authenticated users get a safe link back to an allowed route
- unauthenticated users are guided to login

### Security audit logging

Added:

- `lib/audit/audit.service.ts`

Practical security events now recorded in touched flows:

- `auth.login.failed`
- `auth.login.succeeded`
- `auth.logout`
- `auth.route.forbidden`
- `auth.permission.denied`
- `auth.role.denied`
- `auth.api.forbidden`
- `auth.password_change.failed`

Existing entity audit events for user/settings/profile/module actions remain in place.

### Server action consistency update

Touched security-sensitive flows now rely on centralized auth helpers:

- login
- logout
- dashboard layout auth
- permission guards
- profile password change
- report export API access

Previously hardened module actions from Phase 2 continue using centralized RBAC guards.

### Environment security requirements

Confirmed:

- `DATABASE_URL` required
- `SESSION_SECRET` required and length-validated
- no secrets are hardcoded in runtime code

Bootstrap credentials remain configurable via env and are already documented to be changed immediately after first login.

### Remaining security risks before Phase 5

- middleware verifies signed cookie + expiry, but authoritative role/permission refresh still happens in server code after middleware
- route protection is centralized for dashboard routes, but not every API route has middleware-level handling
- login rate limiting is not yet distributed/shared-store based
- password reset enforcement is not schema-backed yet
- broader row-level scope adoption across every data route still remains for later phases

### Commands to run for Phase 4

Direct local binaries from `C:\Dashboard\school-erp`:

- `.\node_modules\.bin\prisma.cmd validate`
- `.\node_modules\.bin\prisma.cmd generate`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`
- `.\node_modules\.bin\next.cmd build`

### Data integrity confirmation

- No fake/static/demo business data was added in Phase 4
- Phase 4 changes focused on auth, session, and security hardening only

## Phase 5 - Core Admin Modules Stabilization

### Modules audited

Audited runtime modules and related code paths:

- `app/(dashboard)/dashboard/students`
- `app/(dashboard)/dashboard/staff`
- `app/(dashboard)/dashboard/attendance`
- `app/(dashboard)/dashboard/fees`
- `app/(dashboard)/dashboard/exams`
- `app/(dashboard)/dashboard/documents`
- `app/(dashboard)/dashboard/notices`
- `app/(dashboard)/dashboard/reports`
- `app/api/reports/export/[reportType]/route.ts`
- `lib/services/*`
- `lib/validations/*`
- `lib/report-queries.ts`

### Current module status after stabilization

- Students: service-backed list + centralized save/archive flow
- Staff: service-backed list + centralized save/archive flow
- Attendance: service-backed page data + centralized mark/update flow
- Fees: service-backed dashboard/workspace data + centralized head/structure/invoice/payment flow
- Exams: service-backed workspace data + centralized exam/grade/marks flow
- Documents: service-backed list + centralized save/archive flow
- Notices: service-backed list + centralized save/publish flow
- Reports: service-backed filters/data/export flow

### Service files created or updated

Added:

- `lib/services/students.service.ts`
- `lib/services/staff.service.ts`
- `lib/services/attendance.service.ts`
- `lib/services/fees.service.ts`
- `lib/services/exams.service.ts`
- `lib/services/documents.service.ts`
- `lib/services/notices.service.ts`
- `lib/services/reports.service.ts`

Updated:

- `lib/report-queries.ts`

Purpose:

- move Prisma access out of pages/actions
- enforce school-scoped queries centrally
- keep mutations reusable and typed

### Validation files created

Added:

- `lib/validations/students.ts`
- `lib/validations/staff.ts`
- `lib/validations/attendance.ts`
- `lib/validations/fees.ts`
- `lib/validations/exams.ts`
- `lib/validations/documents.ts`
- `lib/validations/notices.ts`
- `lib/validations/reports.ts`

Current pattern:

- legacy schemas remain in existing domain files
- new validation entrypoints centralize imports for touched modules
- actions now consume centralized validation paths instead of scattering schema lookups

### Server actions refactored

Refactored into thin action layers:

- `students/actions.ts`
- `staff/actions.ts`
- `attendance/actions.ts`
- `fees/actions.ts`
- `exams/actions.ts`
- `documents/actions.ts`
- `notices/actions.ts`

Each touched action now:

- uses centralized auth/RBAC helpers
- validates with centralized validation entrypoints
- calls centralized services for DB writes
- records audit logs for sensitive mutations
- revalidates routes only after success

### Permission checks added or tightened

Confirmed/tightened use of centralized RBAC permission guards:

- students: `students.create`, `students.update`, `students.delete`
- staff: `staff.create`, `staff.update`, `staff.delete`
- attendance: `attendance.mark`, `attendance.update`
- fees: `fees.update`, `fees.collect`
- exams: `exams.create`, `exams.update`, `exams.marks_entry`, `exams.marks_moderate`
- documents: `documents.upload`, `documents.update`, `documents.archive`
- notices: `notices.create`, `notices.update`, `notices.publish`
- reports export API: `reports.export`

### Scope controls applied

Applied where currently safe:

- attendance marking now restricts `TEACHER`, `HOD`, and `EXAM_CONTROLLER` to assigned classes through `teacherCanAccessAssignedClass(...)`
- exam create/marks entry now applies the same assigned-class restriction where class context exists
- all touched queries and mutations remain school-scoped via trusted session `schoolId`

Remaining scope limitation:

- reports still depend mainly on permission-level access; teacher-specific report row scoping needs a later broader pass

### Audit logs added or normalized

Touched flows now log:

- `student.created`
- `student.updated`
- `student.archived`
- `staff.created`
- `staff.updated`
- `staff.archived`
- `attendance.marked`
- `attendance.updated`
- `fees.collected`
- `fees.updated`
- `exam.created`
- `exam.updated`
- `exam.marks_saved`
- `document.uploaded`
- `document.updated`
- `document.archived`
- `notice.created`
- `notice.updated`
- `notice.published`
- `report.viewed`
- `report.exported`

Note:

- explicit fee concession/refund flows are not implemented in current touched runtime, so those audit events remain pending for later module work
- explicit exam publish-result workflow is still not present as a separate action

### Static or fake business data findings

Phase 5 touched runtime files were checked for fake business records.

Result:

- no fake/static/demo student rows added
- no fake/static/demo staff rows added
- no fake/static/demo attendance rows added
- no fake/static/demo fee summaries added
- no fake/static/demo exam rows added
- no fake/static/demo document rows added
- no fake/static/demo notice rows added
- no fake/static/demo report rows added

All touched runtime business views now load from DB-backed service functions or show empty states.

### Empty state and error handling status

Confirmed:

- empty DB now renders empty/setup states in touched pages
- actions return typed `ActionFormState`
- form validation errors remain field-aware
- services throw scoped domain errors which are converted into safe user-facing action messages

### Repeated code candidates reduced

Reduced duplication for:

- module page data loading
- save/archive mutation logic
- report query access
- validation imports
- school-scoped query composition in touched areas

Still pending later:

- broader normalization of page-level filter parsing helpers
- shared mutation helper patterns across remaining advanced modules

### Commands run for Phase 5

From `C:\Dashboard\school-erp` using direct local binaries:

- `.\node_modules\.bin\prisma.cmd validate`
- `.\node_modules\.bin\prisma.cmd generate`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`
- `.\node_modules\.bin\next.cmd build`

### Command results

- Prisma validate: passed
- TypeScript: passed
- Next build: passed
- Prisma generate: failed again due Windows file lock on `node_modules\\.prisma\\client\\query_engine-windows.dll.node`

Observed generate blocker:

- `EPERM: operation not permitted, rename ...query_engine-windows.dll.node.tmp... -> ...query_engine-windows.dll.node`

Safe local fix before retry:

- `taskkill /F /IM node.exe`
- `.\node_modules\.bin\prisma.cmd generate`

### Remaining module risks before Phase 6

- teacher-scoped reports still need a deeper row-level rollout beyond permission checks
- fee concession, approval, and refund workflows are not yet stabilized as dedicated services/actions
- explicit exam result publish workflow is not yet separated from marks save flow
- documents module still behaves as metadata/path tracking unless storage pipeline is implemented later
- notices audience rules are typed, but class/section-specific visibility enforcement outside touched authoring flows may still need deeper review
- advanced modules remain outside Phase 5 scope

### Phase 5 completion status

- Core admin modules touched in this phase now use centralized services and validation entrypoints
- Sensitive touched mutations are audit-logged
- School scoping is enforced in touched services
- No fake/static/demo business data was added

Phase 6 can start after approval.

## Phase 7 - Advanced Operational Modules Stabilization

### Health policy cleanup result

The immediate carry-over risk from Phase 6A was fixed first.

Changes applied:

- `health` module navigation is now `hidden` in `lib/modules/module-config.ts`
- `reception` remains `hidden` because the route folder is still missing
- `maintenance` and `security` remain `hidden`
- `STUDENT` no longer receives `health.records.read_own`
- `PARENT` no longer receives `health.records.read_child`

Chosen policy:

- Health stays hidden until a privacy-safe scoped route exists for `NURSE`, `ADMIN`, or `PRINCIPAL`
- Student and parent users do not see Health navigation in the current build

### Advanced modules audited

Audited route modules:

- `/dashboard/library`
- `/dashboard/inventory`
- `/dashboard/transport`
- `/dashboard/hostel`
- `/dashboard/leaves`
- `/dashboard/payroll`
- `/dashboard/accounts`

Audited hidden or missing operational modules:

- `/dashboard/health` - route missing, kept hidden
- `/dashboard/reception` - route missing, kept hidden
- `/dashboard/maintenance` - route missing, kept hidden
- `/dashboard/security` - route missing, kept hidden

### Services added or updated

Added centralized DB-backed service files:

- `lib/services/library.service.ts`
- `lib/services/inventory.service.ts`
- `lib/services/transport.service.ts`
- `lib/services/hostel.service.ts`
- `lib/services/leaves.service.ts`
- `lib/services/payroll.service.ts`
- `lib/services/accounts.service.ts`

These services now hold the main Prisma query and mutation logic for touched operational modules, including:

- page data loading
- create/update/archive flows
- schoolId scoping
- relation validation before mutation
- zero/empty results when data does not exist

### Validations added or updated

Added centralized validation files:

- `lib/validations/library.ts`
- `lib/validations/inventory.ts`
- `lib/validations/transport.ts`
- `lib/validations/hostel.ts`
- `lib/validations/leaves.ts`
- `lib/validations/payroll.ts`
- `lib/validations/accounts.ts`

Legacy helper entry points were reduced to compatibility re-exports so validation rules are no longer duplicated across module actions.

### Server actions and permissions enforced

Touched operational server actions were aligned to the centralized flow:

- `requirePermission(...)`
- validation schema parsing
- service-layer DB writes
- `recordAuditLog(...)`
- `revalidatePath(...)`

Updated action files:

- `app/(dashboard)/dashboard/library/actions.ts`
- `app/(dashboard)/dashboard/inventory/actions.ts`
- `app/(dashboard)/dashboard/transport/actions.ts`
- `app/(dashboard)/dashboard/hostel/actions.ts`
- `app/(dashboard)/dashboard/leaves/actions.ts`
- `app/(dashboard)/dashboard/payroll/actions.ts`
- `app/(dashboard)/dashboard/accounts/actions.ts`

Page-level direct Prisma queries were also removed from the touched advanced module pages and replaced with centralized service calls.

### Audit events added or confirmed

Operational audit coverage now includes:

- `library.book.created`
- `library.book.updated`
- `library.book.archived`
- `library.book.issued`
- `library.book.returned`
- `inventory.item.created`
- `inventory.item.updated`
- `inventory.item.archived`
- `inventory.movement.created`
- `transport.vehicle.created`
- `transport.vehicle.updated`
- `transport.route.created`
- `transport.route.updated`
- `transport.stop.created`
- `transport.stop.updated`
- `transport.assignment.created`
- `transport.assignment.updated`
- `hostel.created`
- `hostel.updated`
- `hostel.room.created`
- `hostel.room.updated`
- `hostel.allocation.created`
- `hostel.allocation.updated`
- `leave.request.created`
- `leave.request.reviewed`
- `payroll.run.created`
- `payroll.run.status.updated`
- `payroll.slip.status.updated`
- `expense.category.created`
- `expense.category.updated`
- `expense.voucher.created`
- `expense.voucher.status.updated`

### Module status review

Current safe navigation/module visibility:

- `library`: `beta`
- `inventory`: `beta`
- `transport`: `beta`
- `hostel`: `beta`
- `leaves`: `beta`
- `payroll`: `beta`
- `accounts`: `beta`
- `health`: `hidden`
- `reception`: `hidden`
- `maintenance`: `hidden`
- `security`: `hidden`

Interpretation:

- `beta` means route exists, builds, uses real DB-backed data, and is permission-protected, but deeper workflow polish is still pending
- `hidden` means route is missing, incomplete, or not yet privacy-safe enough for navigation exposure

### Static/demo business data status

No fake or static operational business records were added in Phase 7.

Touched advanced modules now use:

- Prisma-backed service queries
- empty state UI when there is no data
- permission denied or hidden-module behavior when the module is not ready

### Manual verification result

Manual browser verification for advanced operational personas is still pending because dedicated test accounts were not added to the production-safe default seed:

- `LIBRARIAN`
- `TRANSPORT_MANAGER`
- `HOSTEL_WARDEN`
- `PROCUREMENT_MANAGER`
- `NURSE`
- `FRONT_DESK`
- `SECURITY_GUARD`
- `MAINTENANCE_TECHNICIAN`

What is already confirmed from code and build safety:

- hidden modules no longer appear in centralized navigation
- student and parent users no longer receive Health navigation exposure
- active beta operational routes build successfully and remain permission-gated

### Commands run

From `C:\\Dashboard\\school-erp`:

- `.\node_modules\.bin\prisma.cmd validate`
- `.\node_modules\.bin\prisma.cmd generate`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`
- `.\node_modules\.bin\next.cmd build`

### Command results

- Prisma validate: passed
- Prisma generate: passed
- TypeScript: passed
- Next build: passed

### Remaining risks before Phase 8

- advanced operational persona browser verification is still pending until real non-demo accounts are created locally
- `health`, `reception`, `maintenance`, and `security` still need real scoped routes before they can move out of `hidden`
- some advanced modules are intentionally still `beta` because deeper approval or workflow orchestration belongs to a later phase

### Phase 7 conclusion

- Health visibility risk for student and parent users is fixed
- advanced operational modules touched in this phase are now centralized, DB-backed, and build-safe
- hidden modules are not exposed in navigation
- no broad admin fallback was introduced

Phase 8 can start after approval.

## Phase 6A - Persona Scope Verification and Portal Access Smoke Test

### Persona accounts checked

Verified live database-backed accounts for:

- `admin@school.local`
- `teacher@school.local`
- `student.portal@school.local`
- `parent@school.local`

Confirmed during verification:

- all four accounts are active
- roles are assigned correctly
- sessions are generated from the live RBAC role-permission mappings
- all tested accounts belong to the same school scope

### Relationship checks

Confirmed live relationship coverage for smoke testing:

- Teacher account is linked to a staff profile
- the linked staff profile is mapped as class teacher for Section `A`
- Section `A` contains the linked student used for the allowed teacher-scope test
- Student account is linked to `Student.userId`
- Parent account is linked through `StudentGuardian`

An unrelated student in another section was present and used for deny-by-default route checks.

### Bugs found and fixed

Two real access regressions were reproduced and fixed:

1. Portal navigation links were over-visible
   - `TEACHER` saw `Student Portal` and `Parent Portal`
   - `STUDENT` and `PARENT` could see the opposite portal entry
2. `STUDENT` could open `/dashboard/students` list route

Fixes applied:

- `lib/modules/module-config.ts`
  - added persona-bound role constraints for `student-portal` and `parent-portal`
- `lib/modules/module-access.ts`
  - added centralized role gating for module access
  - added navigation-only role filtering so portal links only render for the intended persona
- `app/(dashboard)/dashboard/students/page.tsx`
  - narrowed the list page guard to `students.read` only
  - student/parent own-or-child detail access remains enforced separately through scoped detail routes

### Admin verification result

Verified:

- `/dashboard` opens
- `/dashboard/users` opens
- admin navigation remains available
- portal links are no longer shown in the sidebar nav by default
- direct portal routes do not expose unrelated student/parent records; they resolve to setup-required states when no matching persona link exists

### Teacher verification result

Verified in the browser:

- `/dashboard` opens
- teacher dashboard shows only teacher-scoped academic widgets
- sidebar no longer shows `Student Portal` or `Parent Portal`
- `/dashboard/users` returns the forbidden experience
- `/dashboard/students` remains available
- assigned student detail route opens
- unrelated student detail route redirects to forbidden

No all-students or all-classes fallback was observed for the unrelated student route.

### Student verification result

Verified in the browser:

- `/dashboard` opens
- `/dashboard/student-portal` opens
- sidebar shows only student-safe links (`Dashboard`, `Health`, `Student Portal`)
- `/dashboard/students` now redirects to `/forbidden?next=%2Fdashboard`
- own student detail route remains accessible
- unrelated student detail route redirects to `/forbidden?next=%2Fdashboard%2Fstudents`
- `/dashboard/users` is forbidden

No unrelated student records were exposed.

### Parent verification result

Verified in the browser:

- `/dashboard` opens
- `/dashboard/parent-portal` opens
- sidebar shows only parent-safe links (`Dashboard`, `Health`, `Parent Portal`)
- linked child route opens with only linked child data
- unrelated child query route returns the forbidden experience
- `/dashboard/users` is forbidden

No all-students fallback was observed.

### Forbidden-route verification result

Verified for lower-privilege personas:

- forbidden page renders for denied routes
- \"Go to allowed dashboard\" resolves to an actually allowed route
- no forbidden redirect loop was observed

Observed examples:

- student list route -> `/forbidden?next=%2Fdashboard`
- student unrelated detail -> `/forbidden?next=%2Fdashboard%2Fstudents`
- parent unrelated child query -> forbidden with allowed dashboard recovery
- teacher `/dashboard/users` -> forbidden with allowed dashboard recovery

### Commands run

From `C:\\Dashboard\\school-erp`:

- `.\node_modules\.bin\prisma.cmd validate` -> passed
- `.\node_modules\.bin\prisma.cmd generate` -> initially hit Windows `EPERM` engine lock, then passed after `taskkill /F /IM node.exe`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false` -> passed
- `.\node_modules\.bin\next.cmd build` -> passed

Browser verification:

- local dev server started on `http://localhost:3000`
- browser smoke tests were run against real DB-backed sessions for admin, teacher, student, and parent personas

### Remaining risks

- `SUPER_ADMIN` still retains broad route visibility by design for root-user lockout protection; this is intentional and separate from lower-role portal scoping
- some non-portal modules such as `Health` still appear for student/parent because those permissions are currently granted in the RBAC seed and module config
- broader Phase 7 workflow refinement can further review whether additional primary-user modules should remain visible or be narrowed

### Phase 6A status

Phase 6A verification is complete.

Confirmed:

- admin dashboard still works
- teacher cannot access admin-only routes
- teacher cannot access unrelated student detail routes
- student sees only own data plus explicitly allowed student-detail view
- student cannot access the students list or unrelated student detail
- parent sees only linked child data
- parent cannot access unrelated child data
- forbidden flow is loop-safe
- no fake/static/demo business data was added

Phase 7 can start after approval.

## Phase 6 - Teacher, Student, and Parent Portal Stabilization

### Teacher portal status

- teacher-facing dashboard data remains DB-driven through `lib/services/dashboard.service.ts`
- teacher scoping continues to rely on real `Staff -> classTeacherFor -> Section/Class` relations
- if no class-teacher linkage exists, teacher-scoped attendance/student access returns empty results instead of exposing broader records
- direct teacher mutations such as attendance marking and marks entry still use centralized scope checks:
  - `teacherCanMarkAttendance(...)`
  - `teacherCanAccessAssignedClass(...)`
  - `teacherCanAccessStudent(...)`
  - `teacherCanAccessExam(...)`

### Student portal status

Updated `app/(dashboard)/dashboard/student-portal/page.tsx` to show only linked-student DB data:

- own class/section
- own attendance summary and recent attendance rows
- own fee due summary and recent invoices
- own result history
- own notices
- own documents
- own upcoming exams

If `Student.userId` is not linked for the current login, the page shows a setup-required state instead of fake content.

### Parent portal status

Updated `app/(dashboard)/dashboard/parent-portal/page.tsx` and `lib/services/portal.service.ts` so parent users now get:

- DB-backed linked-children overview
- child selector when multiple wards are linked
- selected-child attendance detail
- selected-child fee summary and invoice list
- selected-child result history
- selected-child documents
- selected-child upcoming exams
- parent-visible notices

If a parent manually supplies an unrelated `studentId` in the query string, access is denied and redirected to `/forbidden`.

### Scope helper improvements

Updated `lib/rbac/scope.ts` with reusable portal-link helpers:

- `getLinkedStudentProfileForUser(...)`
- `getParentLinkedStudentIds(...)`

These now centralize own-student and ward resolution so portal services do not duplicate relation queries.

Security behavior remains deny-by-default when links cannot be verified.

### Service updates

Updated:

- `lib/services/portal.service.ts`

Current portal service behavior:

- no fake portal metrics or records
- own/child data is fetched only from Prisma
- parent selected-child detail is resolved only after relationship verification
- empty arrays and empty states are returned when no real records exist

### Client-safe enum cleanup discovered during validation

Build verification exposed a separate browser-bundling issue:

- several client components imported Prisma enums directly from `@prisma/client`

Fixed by centralizing client-safe enum values in:

- `lib/constants/client-enums.ts`

Updated client components:

- `components/fees/fee-forms.tsx`
- `components/accounts/account-forms.tsx`
- `components/documents/document-forms.tsx`
- `components/notices/notice-form.tsx`
- `components/school/attendance-sheet-form.tsx`

This removed Prisma browser-import leakage and restored production build stability.

### Module config status

Portal visibility remains:

- `student-portal`: active
- `parent-portal`: active

No broad admin fallback was added for teacher, student, or parent users.

### Manual verification status

Code-level portal hardening is complete, but browser verification still depends on real teacher/student/parent accounts being present and linked in the local database.

Manual checks still recommended:

1. teacher login cannot access `/dashboard/users`
2. teacher sees only assigned class/section data
3. student sees only own portal data
4. parent sees only linked child data
5. unrelated student/document/report-card routes redirect to `/forbidden`

### Commands run

From `C:\\Dashboard\\school-erp`:

- `.\node_modules\.bin\prisma.cmd validate`
- `.\node_modules\.bin\prisma.cmd generate`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`
- `.\node_modules\.bin\next.cmd build`

### Command results

- Prisma validate: passed
- Prisma generate: passed
- TypeScript: passed
- Next build: passed

### Remaining risks before Phase 7

- teacher scope is still class/section based; subject-wise assignment relations can further tighten access later
- full browser verification for teacher/student/parent personas still depends on real linked non-admin users in the DB
- some legacy non-portal module pages still carry broader role-oriented UX copy, even though portal and route access are now scoped

### Phase 6 status

- teacher access foundation: stable
- student portal: DB-driven and own-data-only
- parent portal: DB-driven and child-data-only
- direct unrelated child selection in parent portal: blocked
- no fake/static/demo business data added

Phase 7 can start after approval.

## Phase 6 - Teacher, Student, and Parent Portal Stabilization

### Portal audit summary

- Teacher portal relied mainly on broad module pages with incomplete row-level scoping.
- Student portal route did not exist as a dedicated own-data workspace.
- Parent portal route did not exist as a dedicated child-data workspace.
- `User -> Student` login linkage was missing, so a student account could not be safely resolved to one admission record.
- Existing teacher relationship support was available through `Staff.userId` and `Section.classTeacherId`.
- Existing parent-child linkage was available through `Parent.userId` and `StudentGuardian`.

### Relationship and scope hardening

Updated and expanded:

- `prisma/schema.prisma`
- `lib/auth/current-user.ts`
- `lib/rbac/scope.ts`

Key changes:

- added `Student.userId` and `User.studentProfile` relation for secure student-login linkage
- expanded scope helpers for:
  - `canAccessStudent()`
  - `canAccessStaff()`
  - `canAccessClass()`
  - `canAccessSection()`
  - `canAccessOwnData()`
  - `parentCanAccessChild()`
  - `teacherCanAccessAssignedClass()`
  - `teacherCanMarkAttendance()`
  - `teacherCanAccessStudent()`
  - `teacherCanAccessExam()`
  - `studentCanAccessDocument()`
  - `parentCanAccessDocument()`
- all helpers deny by default when relationship or school scope cannot be verified

### Services updated

Updated:

- `lib/services/dashboard.service.ts`
- `lib/services/students.service.ts`
- `lib/services/attendance.service.ts`
- `lib/services/exams.service.ts`

Added:

- `lib/services/portal.service.ts`

Portal service now provides real DB-backed:

- `getStudentPortalData()`
- `getParentPortalData()`
- `getParentAccessibleStudent()`

No fake portal cards, notices, attendance, fee totals, results, or documents were added.

### Routes and pages updated

Updated:

- `app/(dashboard)/dashboard/students/page.tsx`
- `app/(dashboard)/dashboard/students/[studentId]/page.tsx`
- `app/(dashboard)/dashboard/attendance/page.tsx`
- `app/(dashboard)/dashboard/exams/page.tsx`
- `app/(dashboard)/dashboard/exams/report-cards/[examId]/[studentId]/page.tsx`
- `app/(dashboard)/dashboard/documents/[documentId]/page.tsx`
- `app/(dashboard)/dashboard/profile/page.tsx`
- `app/(dashboard)/dashboard/users/actions.ts`

Added:

- `app/(dashboard)/dashboard/student-portal/page.tsx`
- `app/(dashboard)/dashboard/parent-portal/page.tsx`

Behavior after Phase 6 changes:

- student portal shows only the logged-in student's own records
- parent portal shows only linked ward records
- student detail, report-card, and document detail routes now verify scope before rendering
- attendance and student list pages now pass the current viewer into scoped services
- exam workspace now narrows teacher access to assigned class/section scope where relationship exists
- user provisioning now supports actual student login linking via `Student.userId`

### Module config status

Updated:

- `lib/modules/module-config.ts`
- `lib/modules/module-access.ts`

Current portal visibility:

- `student-portal`: active
- `parent-portal`: active

Student and parent users now have dedicated portal entry routes instead of relying on broad administrative modules.

### Manual verification status

Code-level hardening was completed in this phase, but browser verification still depends on actual teacher, student, and parent accounts existing in the database with valid linked records.

Manual checks still required in the real repo after sync:

1. login as teacher and confirm `/dashboard/users` is blocked
2. login as teacher and confirm exam/student data is limited to assigned classes
3. login as student and confirm `/dashboard/student-portal` shows only own records
4. login as parent and confirm `/dashboard/parent-portal` shows only linked children
5. attempt unrelated student/document/report-card routes and confirm redirect to `/forbidden`

### Missing relationship limitations

- teacher subject-wise assignment relation is still limited; current teacher scoping primarily uses class-teacher section linkage
- if a teacher is not linked to any section, teacher-scoped lists intentionally return empty results
- parent portal depends on valid `StudentGuardian` records
- student portal depends on valid `Student.userId` linkage and therefore requires migration plus user-link sync

### Commands planned after repo sync

From `C:\\Dashboard\\school-erp`:

- `.\node_modules\.bin\prisma.cmd validate`
- `.\node_modules\.bin\prisma.cmd generate`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`
- `.\node_modules\.bin\next.cmd build`

### Migration and command results

- added migration: `prisma/migrations/20260629183000_phase6_student_user_portal_link/migration.sql`
- `.\node_modules\.bin\prisma.cmd migrate deploy`: passed
- `.\node_modules\.bin\prisma.cmd validate`: passed
- `.\node_modules\.bin\prisma.cmd generate`: passed
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`: passed
- `.\node_modules\.bin\next.cmd build`: passed

### Remaining risks before Phase 7

- teacher subject-level exam scope can be improved further when dedicated assignment relations are available
- document list page itself is still broader than the new portal routes; sensitive detail access is already locked
- browser-level manual verification for teacher, student, and parent accounts still depends on real linked users existing in the database

Phase 7 should wait until real repo sync, Prisma migration, and manual portal verification are completed.

## Phase 5A - Dashboard Access Regression Hotfix

### Root cause found

The `/dashboard -> /forbidden` regression came from a combination of access-flow issues:

1. `canAccessRoute(...)` used raw path strings without centralized normalization.
2. `getDefaultDashboardRoute(...)` had an unsafe fallback to `/dashboard` even when the user could not access `/dashboard`.
3. `app/forbidden/page.tsx` trusted `searchParams.next` too loosely and could link users back to a denied route, creating a forbidden loop.
4. login redirect logic sanitized `next`, but did not validate that the logged-in session could actually access that route.
5. stale DB RBAC mappings remain a deployment risk because session permissions are built from database role-permission links, not only from code.

### Files changed

- `lib/modules/module-access.ts`
- `app/(dashboard)/layout.tsx`
- `app/forbidden/page.tsx`
- `app/(auth)/login/actions.ts`
- `app/(auth)/login/page.tsx`
- `docs/ERP_DEVELOPMENT_PLAN.md`

### canAccessRoute normalization fix

Added centralized pathname normalization in `lib/modules/module-access.ts`:

- ensures path starts with `/`
- strips query string
- strips hash
- removes trailing slash except `/`
- treats empty input as `/`

Applied normalization to:

- `canAccessRoute(...)`
- route matching helpers
- `getDefaultDashboardRoute(...)`

Result:

- `/dashboard` and `/dashboard/` now resolve consistently
- nested routes like `/dashboard/students/123` match the correct module

### getDefaultDashboardRoute fix

Updated `getDefaultDashboardRoute(...)` to:

1. prefer `/dashboard` only when `canAccessRoute(user, "/dashboard")` is true
2. then try primary modules in role order
3. then try all visible modules
4. return only a route that `canAccessRoute(...)` allows
5. return `/forbidden` if no safe route exists

This removes the old broken fallback that returned `/dashboard` even when denied.

### Forbidden page loop fix

Updated `app/forbidden/page.tsx`:

- no session -> button goes to `/login`
- session -> uses `getDefaultDashboardRoute(session)`
- `searchParams.next` is only used if `canAccessRoute(session, next)` is true
- denied or loop-prone routes like `/forbidden` are ignored
- “Go to allowed dashboard” is hidden when no safe route exists

This prevents `/forbidden?next=/dashboard` loops.

### Login redirect safety fix

Updated `app/(auth)/login/actions.ts`:

- sanitize `next`
- only redirect to `next` if `canAccessRoute(session, next)` is true
- otherwise redirect to `getDefaultDashboardRoute(session)`
- if no safe route exists, redirect to `/forbidden`

Updated `app/(auth)/login/page.tsx`:

- already-authenticated users now redirect to a safe default route
- if no safe route exists, redirect to `/forbidden`

### Dashboard layout redirect-target fix

Updated `app/(dashboard)/layout.tsx`:

- normalizes `x-erp-pathname`
- defaults missing pathname header to `/dashboard`
- computes safe `allowedRoute = getDefaultDashboardRoute(session)`
- passes `next` only when the route is actually accessible
- otherwise redirects straight to `/forbidden`

This removes the old layout behavior that could send users to `/forbidden?next=/dashboard` even when `/dashboard` was not allowed.

### Super-admin lockout decision

Applied a narrow emergency root-user safety guard in `lib/modules/module-access.ts`:

- `SUPER_ADMIN` gets module visibility/access evaluation as allowed for non-hidden modules
- this is limited to module visibility and route selection only
- this does not grant `ADMIN` or operational roles broad fallback
- server actions remain protected by centralized RBAC guards

Reason:

- the application still builds session permissions from DB role-permission mappings
- if seed/migrations are stale, `SUPER_ADMIN` should not be locked out of the dashboard shell itself

### Session/seed permission sync note

Confirmed:

- session permissions are loaded from DB role-permission relations in `lib/auth/session.ts`
- seed is idempotent and production-safe
- seed does not add fake business data

Important operational note:

after RBAC enum/permission changes, developers must update DB schema and reseed before expecting DB-backed permissions to match code:

- `.\node_modules\.bin\prisma.cmd migrate dev`
- `.\node_modules\.bin\tsx.cmd prisma/seed.ts`

### Seed run result

Attempted:

- `.\node_modules\.bin\tsx.cmd prisma/seed.ts`

Result:

- failed

Observed blocker:

- Postgres enum mismatch: `invalid input value for enum "RoleCode": "DIRECTOR"`

Interpretation:

- current database has not yet applied the migration that expands `RoleCode` to the professional role set now used by code
- seed cannot complete until the DB schema is migrated first

### Proxy verification

Verified current `proxy.ts` remains appropriate:

- matcher includes `/dashboard/:path*`
- authenticated requests receive `x-erp-pathname`
- unauthenticated users redirect to `/login?next=...`
- no DB queries were added to proxy

### Access safety self-check

No formal module-access test setup was added in this phase.

Manual checks required:

1. stop dev server
2. run DB migration
3. rerun seed
4. clear cookies or logout/login
5. login as bootstrap super admin
6. open `/dashboard`
7. verify it does not redirect to `/forbidden`
8. open a denied route for a lower-privilege user
9. verify forbidden still renders
10. click forbidden-page button and verify it lands on an actually allowed route

### Commands run

From `C:\Dashboard\school-erp`:

- `.\node_modules\.bin\prisma.cmd validate`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`
- `.\node_modules\.bin\next.cmd build`
- `.\node_modules\.bin\tsx.cmd prisma/seed.ts`

### Command results

- Prisma validate: passed
- TypeScript: passed
- Next build: passed
- Seed: failed due DB enum schema mismatch

### Remaining risks

- if DB migrations are not applied, DB-backed permissions can still differ from code expectations
- lower-role route access still depends on correct seed state because only `SUPER_ADMIN` has emergency module visibility fallback
- no dedicated automated tests exist yet for module-access helpers

### Phase 5A completion status

- `/dashboard` access routing logic is now normalized and loop-safe in code
- forbidden-page redirect loop is fixed
- login redirect is access-aware
- no security checks were removed
- no broad admin fallback was added
- no fake/static/demo business data was added

Phase 6 should start only after DB migration + seed are brought in sync and the manual dashboard login check passes.

## Phase 5B - Required DB Migration + Seed Sync

### Scope

This phase only covered:

- DB migration status
- applying pending Prisma migrations
- Prisma client generation
- production-safe seed sync
- post-sync validation/build checks
- manual runtime dashboard access verification

No Phase 6 work was started.

### Migration status

Checked with:

- `.\node_modules\.bin\prisma.cmd migrate status`

Observed before applying:

- 2 pending migrations
  - `20260628150000_restore_advanced_erp_modules`
  - `20260628210000_expand_rbac_foundation`

### Migration result

Applied with:

- `.\node_modules\.bin\prisma.cmd migrate dev`

Result:

- both pending migrations applied successfully
- database is now in sync with current Prisma schema

### Prisma client result

Ran:

- `taskkill /F /IM node.exe`
- `.\node_modules\.bin\prisma.cmd generate`

Result:

- Prisma client generated successfully after stale Node processes were terminated

### Seed result

Ran:

- `.\node_modules\.bin\tsx.cmd prisma/seed.ts`

Result:

- seed completed successfully

Confirmed seed behavior:

- synced roles
- synced permissions
- synced role-permission mappings
- synced bootstrap school/admin
- did not insert fake students, staff, attendance, fees, exams, notices, or demo business data

Seed output:

- `Seed complete: school=DEFAULT, bootstrapAdmin=admin@school.local, academicYear=2026-2027`

### Validation and build results

Ran:

- `.\node_modules\.bin\prisma.cmd validate`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`
- `.\node_modules\.bin\next.cmd build`

Results:

- Prisma validate: passed
- TypeScript: passed
- Next build: passed

### Manual dashboard verification result

Runtime verification was attempted against the local dev server after migration + seed sync.

Verified:

- local dev server started successfully on `http://localhost:3000`
- bootstrap admin record exists and is active
- bootstrap credentials from current env are:
  - email: `admin@school.local`
  - password: env-backed and currently set to `123456789`

Observed behavior in isolated browser verification:

- login form submitted
- browser remained on `/login`
- no session cookie was stored
- direct `/dashboard/users` request redirected back to `/login?next=%2Fdashboard%2Fusers`

This means:

- DB migration and seed sync are fixed
- dashboard access regression from stale DB enum/permissions is resolved at the data layer
- but runtime login/session cookie behavior still has a separate environment/session issue

### Follow-up runtime finding

Current `.env` contains:

- `APP_URL=\"http://localhost:3000\"`
- `NODE_ENV=\"production\"`

Current session cookie logic in `lib/auth/session.ts` sets:

- `secure: true` when `NODE_ENV === \"production\"`

On plain `http://localhost:3000`, secure cookies are not stored by the browser.

Observed runtime symptom matches this:

- successful-looking login submission
- zero session cookies present afterward
- user remains effectively unauthenticated

### Commands run

From `C:\\Dashboard\\school-erp`:

- `taskkill /F /IM node.exe`
- `.\node_modules\.bin\prisma.cmd migrate status`
- `.\node_modules\.bin\prisma.cmd migrate dev`
- `.\node_modules\.bin\prisma.cmd generate`
- `.\node_modules\.bin\tsx.cmd prisma/seed.ts`
- `.\node_modules\.bin\prisma.cmd validate`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`
- `.\node_modules\.bin\next.cmd build`

### Remaining risks

- local login on HTTP can still fail while `NODE_ENV=production` forces secure cookies
- dashboard runtime verification is therefore blocked by environment/session settings, not by DB migration/seed anymore
- lower-role forbidden-route manual verification could not be completed until login session persistence works locally

### Phase 5B status

- DB schema: synced
- DB role enum: synced
- RBAC seed: synced
- Prisma client: generated
- Build/type/prisma validation: clean
- Manual dashboard login verification: blocked by secure-cookie/local-env issue

Phase 6 should not start yet. The next required step is a focused session/local-env fix so localhost login can persist cookies and `/dashboard` can be re-verified end-to-end.

## Phase 5C - Local/LAN Install Session Cookie Hotfix

### Product deployment model

This School ERP is designed for:

- local single-machine installs
- LAN school-server installs over Wi-Fi or Ethernet
- optional HTTPS deployments when a school configures TLS

Supported examples:

- `APP_URL="http://localhost:3000"`
- `APP_URL="http://192.168.1.10:3000"`
- `APP_URL="http://school-server:3000"`
- `APP_URL="https://your-school-domain-or-hostname"`

Important:

- `NODE_ENV=production` is valid for an optimized local or LAN build
- local and LAN installs may still run on plain HTTP
- secure cookies must follow the `APP_URL` protocol, not `NODE_ENV`

### Root cause

The session cookie logic used:

- `secure: true` when `NODE_ENV === "production"` or `APP_URL` started with `https://`

That broke local and LAN installs because browsers reject secure cookies on:

- `http://localhost:3000`
- `http://192.168.x.x:3000`
- `http://school-server:3000`

Result:

- login succeeded server-side
- browser did not persist `school_erp_session`
- protected routes redirected back to login or forbidden

### Cookie fix

Updated `lib/auth/session.ts` so the session cookie now uses protocol-based security:

- if `APP_URL` starts with `http://`, session cookie uses `Secure=false`
- if `APP_URL` starts with `https://`, session cookie uses `Secure=true`

Final session cookie posture:

- `HttpOnly=true`
- `SameSite=Lax`
- host-only cookie with no forced `domain`
- `path=/`
- `maxAge` and `expires` preserved

### Env and install examples

Updated:

- `README.md`
- `.env.example`

Added clear install guidance for:

- localhost single-machine setup
- LAN IP based setup
- LAN hostname based setup
- optional HTTPS setup

Documented behavior:

- `APP_URL=http://...` -> secure cookie disabled
- `APP_URL=https://...` -> secure cookie enabled
- `NODE_ENV=production` does not force secure cookies by itself

### Login and dashboard verification result

Local verification completed against `http://localhost:3000`.

Verified:

- login page opened successfully
- bootstrap admin login succeeded with `admin@school.local`
- successful sign-in redirected to `http://localhost:3000/dashboard`
- opening `/dashboard` again in the same session remained authenticated
- opening `/dashboard` in a second browser tab also remained authenticated

This confirms the session cookie now persists on HTTP localhost after login.

Verified runtime URLs:

- post-login URL: `http://localhost:3000/dashboard`
- second-tab dashboard URL: `http://localhost:3000/dashboard`

Cookie expectation after this fix:

- `school_erp_session`
- `HttpOnly=true`
- `SameSite=Lax`
- `Secure=false` on HTTP localhost/LAN
- `Secure=true` on HTTPS

### Security compatibility check

Reviewed:

- `app/(auth)/login/actions.ts`
- `lib/auth/session.ts`
- `proxy.ts`
- `app/(dashboard)/layout.tsx`
- `lib/env.ts`

Confirmed:

- login and proxy use the same session cookie name via `SESSION_COOKIE_NAME`
- dashboard routes remain protected by authenticated session checks
- forbidden handling remains permission-based
- no route was made public
- no broad ADMIN fallback was introduced

### Commands run

From `C:\\Dashboard\\school-erp`:

- `taskkill /F /IM node.exe`
- `.\node_modules\.bin\prisma.cmd validate`
- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`
- `.\node_modules\.bin\next.cmd build`
- `.\node_modules\.bin\prisma.cmd generate`

Results:

- Prisma validate: passed
- TypeScript: passed
- Next build: passed
- Prisma generate: passed

### Remaining risks

- full LAN verification from a second physical device was not completed in this environment
- lower-role forbidden-route browser verification still depends on dedicated test credentials for a restricted role
- install guidance assumes `APP_URL` is kept aligned with the actual local or LAN host used by the school

### Phase 5C status

- local HTTP login cookie issue: fixed
- localhost dashboard access after login: verified
- HTTPS secure-cookie behavior: preserved in code path
- local/LAN deployment docs: updated

Phase 6 can start after approval.
