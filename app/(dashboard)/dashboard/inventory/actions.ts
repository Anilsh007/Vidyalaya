"use server";

import { revalidatePath } from "next/cache";
import { InventoryMovementType } from "@prisma/client";

import { requirePermission } from "@/lib/auth/access";
import { recordAuditLog } from "@/lib/audit";
import { type ActionFormState, initialActionFormState } from "@/lib/forms";
import { PERMISSIONS } from "@/lib/permissions";
import {
  archiveInventoryItem,
  saveInventoryItem,
  saveInventoryMovement
} from "@/lib/services/inventory.service";
import { inventoryItemSchema, inventoryMovementSchema, movementDirection } from "@/lib/validations/inventory";

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
    const item = await saveInventoryItem({
      schoolId: session.schoolId,
      id: data.id,
      itemCode: data.itemCode,
      name: data.name,
      category: data.category,
      unit: data.unit,
      supplierName: data.supplierName,
      location: data.location,
      minimumQuantity: data.minimumQuantity,
      quantityOnHand: data.quantityOnHand,
      unitCost: data.unitCost
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
  const item = await archiveInventoryItem({ schoolId: session.schoolId, itemId });

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
    const movement = await saveInventoryMovement({
      schoolId: session.schoolId,
      userId: session.userId,
      itemId: data.itemId,
      movementType: data.movementType as InventoryMovementType,
      quantity: data.quantity,
      movementDate: data.movementDate,
      reference: data.reference,
      issuedTo: data.issuedTo,
      notes: data.notes,
      signedQuantity
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
