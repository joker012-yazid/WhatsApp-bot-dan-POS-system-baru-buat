import type { InferSelectModel } from 'drizzle-orm';

import { customers, invoices, invoiceItems, quoteItems, quotes } from '@/db/schema';

export type CustomerRecord = InferSelectModel<typeof customers>;
export type InvoiceRecord = InferSelectModel<typeof invoices>;
export type InvoiceItemRecord = InferSelectModel<typeof invoiceItems>;
export type QuoteRecord = InferSelectModel<typeof quotes>;
export type QuoteItemRecord = InferSelectModel<typeof quoteItems>;

export interface NormalizedInvoice extends Omit<InvoiceRecord, 'subtotal' | 'taxRate' | 'taxAmount' | 'total' | 'paidAmount' | 'balance'> {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balance: number | null;
}

export interface NormalizedInvoiceItem extends Omit<InvoiceItemRecord, 'unitPrice' | 'discount' | 'total'> {
  unitPrice: number;
  discount: number;
  total: number;
}

export interface NormalizedQuote extends Omit<QuoteRecord, 'subtotal' | 'taxRate' | 'taxAmount' | 'total'> {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface NormalizedQuoteItem extends Omit<QuoteItemRecord, 'unitPrice' | 'discount' | 'total'> {
  unitPrice: number;
  discount: number;
  total: number;
}

export interface InvoiceWithRelations extends NormalizedInvoice {
  customer: CustomerRecord;
  quote?: NormalizedQuote | null;
  items: NormalizedInvoiceItem[];
}

export interface QuoteWithRelations extends NormalizedQuote {
  customer: CustomerRecord;
  items: NormalizedQuoteItem[];
}
