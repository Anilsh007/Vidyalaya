import { InventoryMovementType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type InventoryPageDataParams = {
  schoolId: string;
  query?: string;
  category?: string;
  stock?: string;
};

type SaveInventoryItemInput = {
  schoolId: string;
  id?: string;
  itemCode: string;
  name: string;
  category?: string;
  unit: string;
  supplierName?: string;
  location?: string;
  minimumQuantity: number;
  quantityOnHand: number;
  unitCost?: number | string;
};

type SaveInventoryMovementInput = {
  schoolId: string;
  userId?: string;
  itemId: string;
  movementType: InventoryMovementType;
  quantity: number;
  movementDate: string;
  reference?: string;
  issuedTo?: string;
  notes?: string;
  signedQuantity: number;
};

export async function getInventoryPageData({
  schoolId,
  query = "",
  category = "",
  stock = ""
}: InventoryPageDataParams) {
  const [items, allItems, movements] = await Promise.all([
    db.inventoryItem.findMany({
      where: {
        schoolId,
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
      where: { schoolId, isArchived: false },
      select: { category: true, quantityOnHand: true, minimumQuantity: true, unitCost: true }
    }),
    db.inventoryMovement.findMany({
      where: { schoolId },
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

  return {
    items,
    allItems,
    filteredItems,
    movements,
    categories,
    lowStockCount,
    outOfStockCount,
    stockValue
  };
}

export async function saveInventoryItem(input: SaveInventoryItemInput) {
  const itemData = {
    itemCode: input.itemCode,
    name: input.name,
    category: input.category || null,
    unit: input.unit,
    supplierName: input.supplierName || null,
    location: input.location || null,
    minimumQuantity: input.minimumQuantity,
    quantityOnHand: input.quantityOnHand,
    unitCost:
      input.unitCost === undefined || input.unitCost === "" ? null : new Prisma.Decimal(input.unitCost),
    isArchived: false,
    archivedAt: null
  };

  if (input.id) {
    const existing = await db.inventoryItem.findFirst({
      where: { id: input.id, schoolId: input.schoolId },
      select: { id: true }
    });

    if (!existing) {
      throw new Error("Inventory item not found.");
    }

    return db.inventoryItem.update({
      where: { id: existing.id },
      data: itemData
    });
  }

  return db.inventoryItem.create({
    data: {
      schoolId: input.schoolId,
      ...itemData
    }
  });
}

export async function archiveInventoryItem({ schoolId, itemId }: { schoolId: string; itemId: string }) {
  const item = await db.inventoryItem.findFirst({
    where: { id: itemId, schoolId },
    select: { id: true }
  });

  if (!item) {
    throw new Error("Inventory item not found.");
  }

  return db.inventoryItem.update({
    where: { id: item.id },
    data: { isArchived: true, archivedAt: new Date() }
  });
}

export async function saveInventoryMovement(input: SaveInventoryMovementInput) {
  return db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findFirst({
      where: { id: input.itemId, schoolId: input.schoolId, isArchived: false }
    });

    if (!item) {
      throw new Error("Inventory item not found.");
    }

    const nextQuantity = item.quantityOnHand + input.signedQuantity;
    if (nextQuantity < 0) {
      throw new Error("Stock out cannot be greater than quantity on hand.");
    }

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantityOnHand: nextQuantity }
    });

    return tx.inventoryMovement.create({
      data: {
        schoolId: input.schoolId,
        itemId: item.id,
        movementType: input.movementType,
        quantity: input.quantity,
        movementDate: new Date(`${input.movementDate}T00:00:00.000Z`),
        reference: input.reference || null,
        issuedTo: input.issuedTo || null,
        notes: input.notes || null,
        createdById: input.userId || null
      }
    });
  });
}
