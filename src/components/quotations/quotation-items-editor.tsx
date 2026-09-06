"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { updateQuotationAction, type ActionState } from "@/server/actions/quotations";
import { computeQuotationTotals, computeLineTotal, type QuotationItemInput } from "@/lib/pricing";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EditableItem = QuotationItemInput & { key: string };
type ServiceOption = { id: string; name: string; defaultPrice: string; unit: string | null };

function newItem(overrides: Partial<QuotationItemInput> = {}): EditableItem {
  return {
    key: Math.random().toString(36).slice(2),
    description: "",
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0,
    serviceId: null,
    ...overrides,
  };
}

export function QuotationItemsEditor({
  quotationId,
  initialItems,
  initialDiscountPercent,
  initialTaxRate,
  initialPaymentTerms,
  services,
  currency = "INR",
}: {
  quotationId: string;
  initialItems: QuotationItemInput[];
  initialDiscountPercent: number;
  initialTaxRate: number;
  initialPaymentTerms: string;
  services: ServiceOption[];
  currency?: string;
}) {
  const makeInitialItems = () =>
    initialItems.length > 0 ? initialItems.map((i) => newItem(i)) : [newItem()];

  const [items, setItems] = useState<EditableItem[]>(makeInitialItems);
  const [discountPercent, setDiscountPercent] = useState(initialDiscountPercent);
  const [taxRate, setTaxRate] = useState(initialTaxRate);
  const [paymentTerms, setPaymentTerms] = useState(initialPaymentTerms);
  const action = updateQuotationAction.bind(null, quotationId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);
  const servicePickerId = useId();

  const computed = computeQuotationTotals(items, discountPercent, taxRate);

  function updateItem(key: string, patch: Partial<QuotationItemInput>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  const [servicePickerValue, setServicePickerValue] = useState<string | null>(null);

  function addService(serviceId: string | null) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    setItems((prev) => [
      ...prev,
      newItem({
        description: service.name,
        quantity: 1,
        unitPrice: Number(service.defaultPrice),
        serviceId: service.id,
      }),
    ]);
    // Reset rather than staying on the picked item — this is an "add"
    // action, not a persistent selection, and leaving it set would make
    // picking the same service again look like a no-op change.
    setServicePickerValue(null);
  }

  const itemsPayload: QuotationItemInput[] = items
    .filter((i) => i.description.trim().length > 0)
    .map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discountPercent: i.discountPercent,
      serviceId: i.serviceId,
    }));

  // Compared against the same shape as itemsPayload above — a fresh line
  // added but never filled in (still filtered out of itemsPayload) shouldn't
  // count as dirty either.
  const initialItemsPayload = useMemo<QuotationItemInput[]>(
    () =>
      initialItems
        .filter((i) => i.description.trim().length > 0)
        .map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent,
          serviceId: i.serviceId,
        })),
    [initialItems]
  );

  const isDirty =
    JSON.stringify(itemsPayload) !== JSON.stringify(initialItemsPayload) ||
    discountPercent !== initialDiscountPercent ||
    taxRate !== initialTaxRate ||
    paymentTerms !== initialPaymentTerms;

  function discardChanges() {
    setItems(makeInitialItems());
    setDiscountPercent(initialDiscountPercent);
    setTaxRate(initialTaxRate);
    setPaymentTerms(initialPaymentTerms);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="itemsJson" value={JSON.stringify(itemsPayload)} />
      <input type="hidden" name="discountPercent" value={discountPercent} />
      <input type="hidden" name="taxRate" value={taxRate} />

      <Card>
        <CardHeader className="flex items-center justify-between space-y-0">
          <CardTitle>Line items</CardTitle>
          {services.length > 0 && (
            <div className="flex items-center gap-2">
              <Label htmlFor={servicePickerId} className="text-xs text-muted-foreground">
                Add from library
              </Label>
              <Select value={servicePickerValue} onValueChange={addService}>
                <SelectTrigger id={servicePickerId} className="w-56">
                  <SelectValue>
                    {(value: string | null) => {
                      const match = services.find((s) => s.id === value);
                      return match ? `${match.name} — ${formatCurrency(match.defaultPrice, currency)}` : "Choose a service";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {formatCurrency(s.defaultPrice, currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.key} className="grid grid-cols-12 items-end gap-2 rounded-lg border p-3">
              <div className="col-span-12 flex flex-col gap-1 sm:col-span-4">
                <Label className="text-xs">Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(item.key, { description: e.target.value })}
                />
              </div>
              <div className="col-span-4 flex flex-col gap-1 sm:col-span-2">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.key, { quantity: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-4 flex flex-col gap-1 sm:col-span-2">
                <Label className="text-xs">Unit price</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(item.key, { unitPrice: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-4 flex flex-col gap-1 sm:col-span-2">
                <Label className="text-xs">Discount (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={item.discountPercent}
                  onChange={(e) =>
                    updateItem(item.key, {
                      discountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                />
              </div>
              <div className="col-span-10 flex flex-col gap-1 sm:col-span-1">
                <Label className="text-xs">Line total</Label>
                <p className="h-8 text-sm font-medium">
                  {formatCurrency(computeLineTotal(item), currency)}
                </p>
              </div>
              <div className="col-span-2 flex justify-end sm:col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeItem(item.key)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => setItems((p) => [...p, newItem()])}>
              <Plus />
              Add custom line
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label className="text-xs">Overall discount (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs">Tax rate (%)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(computed.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount ({discountPercent}%)</span>
              <span>-{formatCurrency(computed.discountAmount, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(computed.taxAmount, currency)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Grand total</span>
              <span>{formatCurrency(computed.total, currency)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="paymentTerms" className="text-xs">
              Payment terms
            </Label>
            <Textarea
              id="paymentTerms"
              name="paymentTerms"
              rows={3}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g. 50% advance, 50% on delivery"
            />
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={discardChanges} disabled={pending || !isDirty}>
          Discard changes
        </Button>
        <Button type="submit" disabled={pending || !isDirty}>
          {pending ? "Saving…" : "Save quotation"}
        </Button>
      </div>
    </form>
  );
}
