// All quotation math lives here and only here — never delegated to an LLM.

export type QuotationItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number; // 0-100
  serviceId?: string | null;
};

export type QuotationItemComputed = QuotationItemInput & { lineTotal: number };

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeLineTotal(item: QuotationItemInput): number {
  const gross = item.quantity * item.unitPrice;
  return round2(gross - gross * (item.discountPercent / 100));
}

export function computeQuotationTotals(
  items: QuotationItemInput[],
  discountPercent: number,
  taxRatePercent: number
): {
  items: QuotationItemComputed[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
} {
  const computedItems = items.map((item) => ({ ...item, lineTotal: computeLineTotal(item) }));
  const subtotal = round2(computedItems.reduce((sum, i) => sum + i.lineTotal, 0));
  const discountAmount = round2(subtotal * (discountPercent / 100));
  const taxableAmount = round2(subtotal - discountAmount);
  const taxAmount = round2(taxableAmount * (taxRatePercent / 100));
  const total = round2(taxableAmount + taxAmount);
  return { items: computedItems, subtotal, discountAmount, taxAmount, total };
}
