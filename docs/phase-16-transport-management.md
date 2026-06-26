# Phase 16: Transport Management

Phase 16 adds a transport operations module for school vehicles, routes, stops, and student assignments.

## Scope

- Transport workspace at `/dashboard/transport`
- Vehicle master with vehicle number, type, capacity, driver, helper, insurance date, and fitness date
- Route master with route code, name, vehicle assignment, start/end points, and monthly fee
- Route stop management with pickup/drop time and stop order
- Student transport assignment with route, stop, date range, status, and fee
- Vehicle occupancy and route capacity visibility
- Compliance watch for expired insurance or fitness dates
- Transport report in the reports workspace
- CSV export at `/api/reports/export/transport`

## Permissions

- `transport.view`: Allows access to the transport workspace.
- `transport.manage`: Allows vehicle, route, stop, and assignment operations.

Default seeded access:

- Super Admin: view and manage
- Admin: view and manage
- Principal: view and manage
- Accountant: view
- Teacher: view

## Database Changes

- `TransportVehicle`
- `TransportRoute`
- `TransportStop`
- `TransportAssignment`
- `TransportAssignmentStatus`

The migration is stored in `prisma/migrations/20260531174000_phase_16_transport/migration.sql`.
