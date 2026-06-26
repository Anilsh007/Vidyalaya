# Phase 17: Hostel Management

Phase 17 adds a residential hostel operations module for hostel buildings, rooms, occupancy, and student allocations.

## Scope

- Hostel workspace at `/dashboard/hostel`
- Hostel master with code, name, warden, phone, address, and status
- Room master with room number, floor, room type, capacity, and monthly fee
- Student hostel allocation with room, bed number, date range, status, fee, guardian consent, and remarks
- Hostel occupancy and room capacity visibility
- Guardian consent tracking
- Hostel report in the reports workspace
- CSV export at `/api/reports/export/hostel`

## Permissions

- `hostel.view`: Allows access to the hostel workspace.
- `hostel.manage`: Allows hostel, room, and allocation operations.

Default seeded access:

- Super Admin: view and manage
- Admin: view and manage
- Principal: view and manage
- Accountant: view
- Teacher: view

## Database Changes

- `Hostel`
- `HostelRoom`
- `HostelAllocation`
- `HostelAllocationStatus`

The migration is stored in `prisma/migrations/20260531175000_phase_17_hostel/migration.sql`.
