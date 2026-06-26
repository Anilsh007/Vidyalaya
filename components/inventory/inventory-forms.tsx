"use client";

import { useActionState } from "react";

import {
  saveInventoryItemAction,
  saveInventoryMovementAction
} from "@/app/(dashboard)/dashboard/inventory/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { initialActionFormState } from "@/lib/forms";

type InventoryItemValues = {
  id?: string;
  itemCode?: string;
  name?: string;
  category?: string | null;
  unit?: string;
  supplierName?: string | null;
  location?: string | null;
  minimumQuantity?: number;
  quantityOnHand?: number;
  unitCost?: string | null;
};

type ItemOption = {
  id: string;
  itemCode: string;
  name: string;
  quantityOnHand: number;
  unit: string;
};

export function InventoryItemForm({ defaultValues }: { defaultValues?: InventoryItemValues }) {
  const [state, formAction] = useActionState(saveInventoryItemAction, initialActionFormState);
  const formId = defaultValues?.id ?? "new";

  return (
    <form action={formAction} className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />
      <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <div className="grid gap-2">
          <FormField label="Item code" htmlFor={`item-code-${formId}`}>
            <Input id={`item-code-${formId}`} name="itemCode" defaultValue={defaultValues?.itemCode ?? ""} placeholder="INV-001" />
          </FormField>
          <FieldError error={state.fieldErrors?.itemCode} />
        </div>
        <div className="grid gap-2">
          <FormField label="Item name" htmlFor={`item-name-${formId}`}>
            <Input id={`item-name-${formId}`} name="name" defaultValue={defaultValues?.name ?? ""} placeholder="Whiteboard markers" />
          </FormField>
          <FieldError error={state.fieldErrors?.name} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <FormField label="Category" htmlFor={`item-category-${formId}`}>
          <Input id={`item-category-${formId}`} name="category" defaultValue={defaultValues?.category ?? ""} placeholder="Stationery" />
        </FormField>
        <FormField label="Unit" htmlFor={`item-unit-${formId}`}>
          <Input id={`item-unit-${formId}`} name="unit" defaultValue={defaultValues?.unit ?? "pcs"} />
        </FormField>
        <FormField label="Supplier" htmlFor={`item-supplier-${formId}`}>
          <Input id={`item-supplier-${formId}`} name="supplierName" defaultValue={defaultValues?.supplierName ?? ""} />
        </FormField>
        <FormField label="Location" htmlFor={`item-location-${formId}`}>
          <Input id={`item-location-${formId}`} name="location" defaultValue={defaultValues?.location ?? ""} placeholder="Store room" />
        </FormField>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-2">
          <FormField label="Quantity on hand" htmlFor={`item-qty-${formId}`}>
            <Input id={`item-qty-${formId}`} name="quantityOnHand" type="number" min="0" defaultValue={defaultValues?.quantityOnHand ?? 0} />
          </FormField>
          <FieldError error={state.fieldErrors?.quantityOnHand} />
        </div>
        <div className="grid gap-2">
          <FormField label="Minimum quantity" htmlFor={`item-min-${formId}`}>
            <Input id={`item-min-${formId}`} name="minimumQuantity" type="number" min="0" defaultValue={defaultValues?.minimumQuantity ?? 0} />
          </FormField>
          <FieldError error={state.fieldErrors?.minimumQuantity} />
        </div>
        <div className="grid gap-2">
          <FormField label="Unit cost" htmlFor={`item-cost-${formId}`}>
            <Input id={`item-cost-${formId}`} name="unitCost" type="number" min="0" step="0.01" defaultValue={defaultValues?.unitCost ?? ""} />
          </FormField>
          <FieldError error={state.fieldErrors?.unitCost} />
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving item...">
          {defaultValues?.id ? "Update item" : "Create item"}
        </SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function InventoryMovementForm({ items }: { items: ItemOption[] }) {
  const [state, formAction] = useActionState(saveInventoryMovementAction, initialActionFormState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <FormField label="Item" htmlFor="movement-item">
            <Select id="movement-item" name="itemId">
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.itemCode}) - {item.quantityOnHand} {item.unit}
                </option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.itemId} />
        </div>
        <div className="grid gap-2">
          <FormField label="Movement type" htmlFor="movement-type">
            <Select id="movement-type" name="movementType" defaultValue="STOCK_IN">
              <option value="STOCK_IN">Stock in</option>
              <option value="STOCK_OUT">Stock out</option>
              <option value="RETURNED">Returned</option>
              <option value="DAMAGED">Damaged</option>
              <option value="ADJUSTMENT">Adjustment increase</option>
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.movementType} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-2">
          <FormField label="Quantity" htmlFor="movement-quantity">
            <Input id="movement-quantity" name="quantity" type="number" min="1" />
          </FormField>
          <FieldError error={state.fieldErrors?.quantity} />
        </div>
        <div className="grid gap-2">
          <FormField label="Movement date" htmlFor="movement-date">
            <Input id="movement-date" name="movementDate" type="date" defaultValue={today} />
          </FormField>
          <FieldError error={state.fieldErrors?.movementDate} />
        </div>
        <FormField label="Reference" htmlFor="movement-reference">
          <Input id="movement-reference" name="reference" placeholder="Bill no. or request no." />
        </FormField>
      </div>

      <FormField label="Issued to" htmlFor="movement-issued-to">
        <Input id="movement-issued-to" name="issuedTo" placeholder="Department, staff, class, or event" />
      </FormField>
      <FormField label="Notes" htmlFor="movement-notes">
        <Textarea id="movement-notes" name="notes" className="min-h-[90px]" />
      </FormField>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Recording movement...">Record movement</SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}
