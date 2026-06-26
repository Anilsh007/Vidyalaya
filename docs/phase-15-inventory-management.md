# Phase 15: Inventory and Asset Management

Phase 15 adds a persistent inventory module for school supplies, assets, stock movement, and low-stock review.

## Scope

- Inventory workspace at `/dashboard/inventory`
- Inventory item master with item code, name, category, unit, supplier, location, minimum quantity, quantity on hand, and unit cost
- Item create, edit, and archive workflow
- Stock movement workflow for stock in, stock out, returned, damaged, and adjustment entries
- Quantity-on-hand update during stock movement posting
- Low-stock and out-of-stock visibility
- Recent movement table
- Inventory report in the reports workspace
- CSV export at `/api/reports/export/inventory`

## Permissions

- `inventory.view`: Allows access to the inventory workspace.
- `inventory.manage`: Allows item and stock movement operations.

Default seeded access:

- Super Admin: view and manage
- Admin: view and manage
- Principal: view and manage
- Accountant: view and manage
- Teacher: view

## Database Changes

- `InventoryItem`
- `InventoryMovement`
- `InventoryMovementType`

The migration is stored in `prisma/migrations/20260531173000_phase_15_inventory/migration.sql`.
