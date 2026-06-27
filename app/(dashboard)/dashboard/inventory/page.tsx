import { Archive, Boxes, ClipboardList, PackageMinus, PackagePlus, Search, TriangleAlert } from "lucide-react";

import { archiveInventoryItemAction } from "@/app/(dashboard)/dashboard/inventory/actions";
import { EmptyState } from "@/components/school/empty-state";
import { InventoryItemForm, InventoryMovementForm } from "@/components/inventory/inventory-forms";
import { InfoPanel as PlanningPanel, SummaryCard, TableFrame } from "@/components/shared/dashboard-primitives";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { getWorkspaceAccessCopy, resolveExperienceRole } from "@/lib/dashboard-experience";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePermission(PERMISSIONS.viewInventory);
  const params = await searchParams;
  const query = asSingle(params.q)?.trim() ?? "";
  const category = asSingle(params.category) ?? "";
  const stock = asSingle(params.stock) ?? "";
  const canManageInventory = session.permissions.includes(PERMISSIONS.manageInventory);
  const accessCopy = getWorkspaceAccessCopy(resolveExperienceRole(session.roles), "inventory");

  const [items, allItems, movements] = await Promise.all([
    db.inventoryItem.findMany({
      where: {
        schoolId: session.schoolId,
        isArchived: false,
        ...(category ? { category } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { itemCode: { contains: query, mode: "insensitive" } },
                { category: { contains: query, mode: "insensitive" } },
                { supplierName: { contains: query, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        movements: {
          orderBy: { movementDate: "desc" },
          take: 1
        }
      },
      orderBy: [{ name: "asc" }]
    }),
    db.inventoryItem.findMany({
      where: { schoolId: session.schoolId, isArchived: false },
      select: { category: true, quantityOnHand: true, minimumQuantity: true, unitCost: true }
    }),
    db.inventoryMovement.findMany({
      where: { schoolId: session.schoolId },
      include: { item: true },
      orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
      take: 14
    })
  ]);

  const filteredItems = items.filter((item) => {
    if (stock === "low") return item.quantityOnHand <= item.minimumQuantity;
    if (stock === "out") return item.quantityOnHand === 0;
    return true;
  });
  const categories = Array.from(
    new Set(allItems.map((item) => item.category).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => a.localeCompare(b));
  const lowStockCount = allItems.filter((item) => item.quantityOnHand <= item.minimumQuantity).length;
  const outOfStockCount = allItems.filter((item) => item.quantityOnHand === 0).length;
  const stockValue = allItems.reduce(
    (sum, item) => sum + item.quantityOnHand * (item.unitCost ? Number(item.unitCost) : 0),
    0
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 15"
        title="Inventory and assets"
        description="Maintain school stock items, record purchases and issues, track low-stock items, and review recent inventory movement from one operations workspace."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Active items" value={allItems.length.toString()} icon={<Boxes className="h-5 w-5" />} />
        <SummaryCard title="Low stock" value={lowStockCount.toString()} icon={<TriangleAlert className="h-5 w-5" />} />
        <SummaryCard title="Out of stock" value={outOfStockCount.toString()} icon={<PackageMinus className="h-5 w-5" />} />
        <SummaryCard title="Stock value" value={formatCurrency(stockValue)} icon={<ClipboardList className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Card>
          <CardHeader>
            <CardTitle>{canManageInventory ? "Create inventory item" : "Inventory controls"}</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              {canManageInventory
                ? "Add stock items with opening quantity, reorder level, supplier, and storage location."
                : accessCopy.summary}
            </p>
          </CardHeader>
          <CardContent>
            {canManageInventory ? (
              <InventoryItemForm />
            ) : (
              <EmptyState title={accessCopy.title} description={accessCopy.description} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory register</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Search items and monitor available quantity, reorder level, supplier, and location.
            </p>
          </CardHeader>
          <CardContent className="grid gap-5">
            <form className="grid gap-4 lg:grid-cols-[1fr_180px_180px_auto]" action="/dashboard/inventory">
              <FormField label="Search" htmlFor="q">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="q" name="q" defaultValue={query} className="pl-9" placeholder="Item, code, supplier" />
                </div>
              </FormField>
              <FormField label="Category" htmlFor="category">
                <Select id="category" name="category" defaultValue={category}>
                  <option value="">All categories</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Stock" htmlFor="stock">
                <Select id="stock" name="stock" defaultValue={stock}>
                  <option value="">All stock</option>
                  <option value="low">Low stock</option>
                  <option value="out">Out of stock</option>
                </Select>
              </FormField>
              <div className="flex items-end">
                <Button type="submit" className="w-full lg:w-auto">Apply</Button>
              </div>
            </form>

            {filteredItems.length ? (
              <TableFrame>
                <Table>
                  <THead>
                    <tr>
                      <TH>Item</TH>
                      <TH>Category</TH>
                      <TH>Stock</TH>
                      <TH>Location</TH>
                      <TH>Value</TH>
                      <TH className="text-right">Action</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {filteredItems.map((item) => {
                      const low = item.quantityOnHand <= item.minimumQuantity;
                      const value = item.quantityOnHand * (item.unitCost ? Number(item.unitCost) : 0);
                      return (
                        <tr key={item.id}>
                          <TD>
                            <div className="grid gap-1">
                              <span className="font-medium text-slate-950">{item.name}</span>
                              <span className="text-xs text-slate-500">{item.itemCode} {item.supplierName ? `- ${item.supplierName}` : ""}</span>
                            </div>
                          </TD>
                          <TD>{item.category ?? "Uncategorised"}</TD>
                          <TD>
                            <div className="grid gap-1">
                              <span>{item.quantityOnHand} {item.unit}</span>
                              <span className={`text-xs ${low ? "text-red-600" : "text-slate-500"}`}>Minimum {item.minimumQuantity}</span>
                            </div>
                          </TD>
                          <TD>{item.location ?? "Not set"}</TD>
                          <TD>{formatCurrency(value)}</TD>
                          <TD className="text-right">
                            {canManageInventory ? (
                              <div className="flex justify-end gap-2">
                                <Dialog title={`Edit ${item.name}`} description="Update stock master, supplier, reorder, and location details." triggerLabel="Edit">
                                  <InventoryItemForm
                                    defaultValues={{
                                      id: item.id,
                                      itemCode: item.itemCode,
                                      name: item.name,
                                      category: item.category,
                                      unit: item.unit,
                                      supplierName: item.supplierName,
                                      location: item.location,
                                      minimumQuantity: item.minimumQuantity,
                                      quantityOnHand: item.quantityOnHand,
                                      unitCost: item.unitCost?.toString() ?? ""
                                    }}
                                  />
                                </Dialog>
                                <form action={archiveInventoryItemAction}>
                                  <input type="hidden" name="itemId" value={item.id} />
                                  <Button variant="secondary" size="sm" type="submit">
                                    <Archive className="h-4 w-4" />
                                    Archive
                                  </Button>
                                </form>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-500">View only</span>
                            )}
                          </TD>
                        </tr>
                      );
                    })}
                  </TBody>
                </Table>
              </TableFrame>
            ) : (
              <EmptyState title="No inventory items found" description="Adjust filters or create the first inventory item." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Record stock movement</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Add stock in, stock out, returned, damaged, or adjustment entries.
            </p>
          </CardHeader>
          <CardContent>
            {canManageInventory && allItems.length ? (
              <InventoryMovementForm
                items={filteredItems.map((item) => ({
                  id: item.id,
                  itemCode: item.itemCode,
                  name: item.name,
                  quantityOnHand: item.quantityOnHand,
                  unit: item.unit
                }))}
              />
            ) : (
              <EmptyState
                title={canManageInventory ? "No items available" : accessCopy.title}
                description={canManageInventory ? "Create an inventory item before recording stock movement." : accessCopy.description}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent movement</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Latest stock operations with references and issue targets.
            </p>
          </CardHeader>
          <CardContent>
            {movements.length ? (
              <TableFrame>
                <Table>
                  <THead>
                    <tr>
                      <TH>Date</TH>
                      <TH>Item</TH>
                      <TH>Type</TH>
                      <TH>Qty</TH>
                      <TH>Reference</TH>
                      <TH>Issued to</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {movements.map((movement) => (
                      <tr key={movement.id}>
                        <TD>{movement.movementDate.toLocaleDateString("en-IN")}</TD>
                        <TD>{movement.item.name}</TD>
                        <TD>{movement.movementType.replaceAll("_", " ")}</TD>
                        <TD>{movement.quantity} {movement.item.unit}</TD>
                        <TD>{movement.reference ?? "-"}</TD>
                        <TD>{movement.issuedTo ?? "-"}</TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </TableFrame>
            ) : (
              <EmptyState title="No stock movement" description="Stock movement records will appear here." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <PlanningPanel title="Store control" description="Item code, supplier, location, stock level, and reorder threshold are tracked centrally." />
        <PlanningPanel title="Issue accountability" description="Stock out records can capture department, staff, class, event, or reference details." />
        <PlanningPanel title="Low-stock review" description="Low and out-of-stock filters help office staff reorder supplies before classroom work is blocked." />
      </section>
    </div>
  );
}

