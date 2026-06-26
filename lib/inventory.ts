import { z } from "zod";

export const inventoryItemSchema = z.object({
  id: z.string().optional(),
  itemCode: z.string().trim().min(2, "Item code is required."),
  name: z.string().trim().min(2, "Item name is required."),
  category: z.string().trim().optional(),
  unit: z.string().trim().min(1, "Unit is required."),
  supplierName: z.string().trim().optional(),
  location: z.string().trim().optional(),
  minimumQuantity: z.coerce.number().int().min(0, "Minimum quantity cannot be negative."),
  quantityOnHand: z.coerce.number().int().min(0, "Opening quantity cannot be negative."),
  unitCost: z
    .union([z.literal(""), z.coerce.number().min(0, "Unit cost cannot be negative.")])
    .optional()
});

export const inventoryMovementSchema = z.object({
  itemId: z.string().min(1, "Select an item."),
  movementType: z.enum(["STOCK_IN", "STOCK_OUT", "ADJUSTMENT", "DAMAGED", "RETURNED"]),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
  movementDate: z.string().trim().min(1, "Movement date is required."),
  reference: z.string().trim().optional(),
  issuedTo: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

export function movementDirection(type: string) {
  if (type === "STOCK_IN" || type === "RETURNED") {
    return 1;
  }
  if (type === "ADJUSTMENT") {
    return 1;
  }
  return -1;
}
