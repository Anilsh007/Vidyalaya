"use server";

import { revalidatePath } from "next/cache";
import { InventoryMovementType, Prisma } from "@prisma/client";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { inventoryItemSchema, inventoryMovementSchema, movementDirection } from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key).trim();
  return value || undefined;
}

export async function saveInventoryItemAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageInventory);
  const parsed = inventoryItemSchema.safeParse({
    id: getOptionalString(formData, "id"),
    itemCode: getString(formData, "itemCode"),
    name: getString(formData, "name"),
    category: getString(formData, "category"),
    unit: getString(formData, "unit") || "pcs",
    supplierName: getString(formData, "supplierName"),
    location: getString(formData, "location"),
    minimumQuantity: getString(formData, "minimumQuantity") || "0",
    quantityOnHand: getString(formData, "quantityOnHand") || "0",
    unitCost: getString(formData, "unitCost")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the inventory item details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;

  try {
    const item = data.id
      ? await (async () => {
          const existing = await db.inventoryItem.findFirst({
            where: { id: data.id, schoolId: session.schoolId },
            select: { id: true }
          });

          if (!existing) {
            throw new Error("Inventory item not found.");
          }

          return db.inventoryItem.update({
            where: { id: existing.id },
            data: {
              itemCode: data.itemCode,
              name: data.name,
              category: data.category || null,
              unit: data.unit,
              supplierName: data.supplierName || null,
              location: data.location || null,
              minimumQuantity: data.minimumQuantity,
              quantityOnHand: data.quantityOnHand,
              unitCost:
                data.unitCost === undefined || data.unitCost === ""
                  ? null
                  : new Prisma.Decimal(data.unitCost),
              isArchived: false,
              archivedAt: null
            }
          });
        })()
      : await db.inventoryItem.create({
          data: {
            schoolId: session.schoolId,
            itemCode: data.itemCode,
            name: data.name,
            category: data.category || null,
            unit: data.unit,
            supplierName: data.supplierName || null,
            location: data.location || null,
            minimumQuantity: data.minimumQuantity,
            quantityOnHand: data.quantityOnHand,
            unitCost:
              data.unitCost === undefined || data.unitCost === ""
                ? null
                : new Prisma.Decimal(data.unitCost)
          }
        });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: data.id ? "inventory.item.updated" : "inventory.item.created",
      entityType: "InventoryItem",
      entityId: item.id,
      metadata: { itemCode: item.itemCode, name: item.name }
    });

    revalidatePath("/dashboard/inventory");
    return { status: "success", message: data.id ? "Inventory item updated." : "Inventory item created." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to save inventory item."
    };
  }
}

export async function archiveInventoryItemAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.manageInventory);
  const itemId = getString(formData, "itemId");
  if (!itemId) return;

  const item = await db.inventoryItem.findFirst({
    where: { id: itemId, schoolId: session.schoolId },
    select: { id: true }
  });

  if (!item) return;

  await db.inventoryItem.update({
    where: { id: item.id },
    data: { isArchived: true, archivedAt: new Date() }
  });

  await recordAuditLog({
    actorUserId: session.userId,
    schoolId: session.schoolId,
    action: "inventory.item.archived",
    entityType: "InventoryItem",
    entityId: item.id
  });

  revalidatePath("/dashboard/inventory");
}

export async function saveInventoryMovementAction(
  _prevState: ActionFormState = initialActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const session = await requirePermission(PERMISSIONS.manageInventory);
  const parsed = inventoryMovementSchema.safeParse({
    itemId: getString(formData, "itemId"),
    movementType: getString(formData, "movementType") || "STOCK_IN",
    quantity: getString(formData, "quantity"),
    movementDate: getString(formData, "movementDate"),
    reference: getString(formData, "reference"),
    issuedTo: getString(formData, "issuedTo"),
    notes: getString(formData, "notes")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the stock movement details.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const data = parsed.data;
  const direction = movementDirection(data.movementType);
  const signedQuantity = direction * data.quantity;

  try {
    const movement = await db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({
        where: { id: data.itemId, schoolId: session.schoolId, isArchived: false }
      });

      if (!item) {
        throw new Error("Inventory item not found.");
      }

      const nextQuantity = item.quantityOnHand + signedQuantity;
      if (nextQuantity < 0) {
        throw new Error("Stock out cannot be greater than quantity on hand.");
      }

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantityOnHand: nextQuantity }
      });

      return tx.inventoryMovement.create({
        data: {
          schoolId: session.schoolId,
          itemId: item.id,
          movementType: data.movementType as InventoryMovementType,
          quantity: data.quantity,
          movementDate: new Date(`${data.movementDate}T00:00:00.000Z`),
          reference: data.reference || null,
          issuedTo: data.issuedTo || null,
          notes: data.notes || null,
          createdById: session.userId
        }
      });
    });

    await recordAuditLog({
      actorUserId: session.userId,
      schoolId: session.schoolId,
      action: "inventory.movement.created",
      entityType: "InventoryMovement",
      entityId: movement.id,
      metadata: {
        itemId: data.itemId,
        movementType: data.movementType,
        quantity: data.quantity
      }
    });

    revalidatePath("/dashboard/inventory");
    return { status: "success", message: "Stock movement recorded." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to record stock movement."
    };
  }
}
