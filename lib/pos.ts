import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { customers, invoiceItems, invoices, quotationItems, quotations } from '@/db/schema';
import type {
  InvoiceWithRelations,
  NormalizedInvoice,
  NormalizedInvoiceItem,
  NormalizedQuotation,
  NormalizedQuotationItem,
  QuotationWithRelations,
} from '@/types/pos';

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatDocumentNumber(prefix: string): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `${prefix}-${stamp}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function getInvoiceWithRelations(
  identifier: { id?: string | null; number?: string | null },
): Promise<InvoiceWithRelations | null> {
  const { id, number } = identifier;
  if (!id && !number) {
    throw new Error('An invoice id or number is required');
  }

  const where = id ? eq(invoices.id, id) : eq(invoices.number, number!);
  const [invoice] = await db.select().from(invoices).where(where).limit(1);
  if (!invoice) {
    return null;
  }

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, invoice.customerId))
    .limit(1);

  if (!customer) {
    throw new Error('Invoice is missing linked customer');
  }

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoice.id));

  const quotation = invoice.quotationId
    ? await getQuotationWithRelations({ id: invoice.quotationId })
    : null;

  const normalizedInvoice: NormalizedInvoice = {
    ...invoice,
    subtotal: toNumber(invoice.subtotal),
    taxRate: toNumber(invoice.taxRate),
    taxAmount: toNumber(invoice.taxAmount),
    total: toNumber(invoice.total),
    paidTotal: toNumber(invoice.paidTotal),
    balance: toNullableNumber(invoice.balance),
  };

  const normalizedItems: NormalizedInvoiceItem[] = items.map((item) => ({
    ...item,
    unitPrice: toNumber(item.unitPrice),
    discount: toNumber(item.discount),
    total: toNumber(item.total),
  }));

  return {
    ...normalizedInvoice,
    customer,
    quotation: quotation ? quotation : null,
    items: normalizedItems,
  };
}

export async function getQuotationWithRelations(
  identifier: { id?: string | null; number?: string | null },
): Promise<QuotationWithRelations | null> {
  const { id, number } = identifier;
  if (!id && !number) {
    throw new Error('A quotation id or number is required');
  }

  const where = id ? eq(quotations.id, id) : eq(quotations.number, number!);
  const [quotation] = await db.select().from(quotations).where(where).limit(1);
  if (!quotation) {
    return null;
  }

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, quotation.customerId))
    .limit(1);

  if (!customer) {
    throw new Error('Quotation is missing linked customer');
  }

  const items = await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, quotation.id));

  const normalizedQuotation: NormalizedQuotation = {
    ...quotation,
    subtotal: toNumber(quotation.subtotal),
    taxRate: toNumber(quotation.taxRate),
    taxAmount: toNumber(quotation.taxAmount),
    total: toNumber(quotation.total),
  };

  const normalizedItems: NormalizedQuotationItem[] = items.map((item) => ({
    ...item,
    unitPrice: toNumber(item.unitPrice),
    discount: toNumber(item.discount),
    total: toNumber(item.total),
  }));

  return {
    ...normalizedQuotation,
    customer,
    items: normalizedItems,
  };
}

export interface LineItemInput {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface CalculatedTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export function calculateTotals(
  items: LineItemInput[],
  taxRate: number,
): CalculatedTotals {
  const subtotal = items.reduce((acc, item) => {
    const lineTotal = item.quantity * item.unitPrice - (item.discount ?? 0);
    return acc + Math.max(lineTotal, 0);
  }, 0);

  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function toPgNumeric(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}
