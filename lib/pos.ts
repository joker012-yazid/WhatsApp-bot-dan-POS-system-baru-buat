import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { customers, invoiceItems, invoices, quoteItems, quotes } from '@/db/schema';
import type {
  InvoiceWithRelations,
  NormalizedInvoice,
  NormalizedInvoiceItem,
  NormalizedQuote,
  NormalizedQuoteItem,
  QuoteWithRelations,
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

  const quote = invoice.quoteId ? await getQuoteWithRelations({ id: invoice.quoteId }) : null;

  const normalizedInvoice: NormalizedInvoice = {
    ...invoice,
    subtotal: toNumber(invoice.subtotal),
    taxRate: toNumber(invoice.taxRate),
    taxAmount: toNumber(invoice.taxAmount),
    total: toNumber(invoice.total),
    paidAmount: toNumber(invoice.paidAmount),
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
    quote: quote ? quote : null,
    items: normalizedItems,
  };
}

export async function getQuoteWithRelations(
  identifier: { id?: string | null; number?: string | null },
): Promise<QuoteWithRelations | null> {
  const { id, number } = identifier;
  if (!id && !number) {
    throw new Error('A quote id or number is required');
  }

  const where = id ? eq(quotes.id, id) : eq(quotes.number, number!);
  const [quote] = await db.select().from(quotes).where(where).limit(1);
  if (!quote) {
    return null;
  }

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, quote.customerId))
    .limit(1);

  if (!customer) {
    throw new Error('Quote is missing linked customer');
  }

  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, quote.id));

  const normalizedQuote: NormalizedQuote = {
    ...quote,
    subtotal: toNumber(quote.subtotal),
    taxRate: toNumber(quote.taxRate),
    taxAmount: toNumber(quote.taxAmount),
    total: toNumber(quote.total),
  };

  const normalizedItems: NormalizedQuoteItem[] = items.map((item) => ({
    ...item,
    unitPrice: toNumber(item.unitPrice),
    discount: toNumber(item.discount),
    total: toNumber(item.total),
  }));

  return {
    ...normalizedQuote,
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
