import type { InferSelectModel } from 'drizzle-orm';

import { customers, invoices, invoiceItems, quotations, quotationItems } from '@/db/schema';

export type CustomerRecord = InferSelectModel<typeof customers>;
export type InvoiceRecord = InferSelectModel<typeof invoices>;
export type InvoiceItemRecord = InferSelectModel<typeof invoiceItems>;
export type QuotationRecord = InferSelectModel<typeof quotations>;
export type QuotationItemRecord = InferSelectModel<typeof quotationItems>;

export interface NormalizedInvoice extends Omit<InvoiceRecord, 'subtotal' | 'taxRate' | 'taxAmount' | 'total' | 'paidTotal' | 'balance'> {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidTotal: number;
  balance: number | null;
}

export interface NormalizedInvoiceItem extends Omit<InvoiceItemRecord, 'unitPrice' | 'discount' | 'total'> {
  unitPrice: number;
  discount: number;
  total: number;
}

export interface NormalizedQuotation extends Omit<QuotationRecord, 'subtotal' | 'taxRate' | 'taxAmount' | 'total'> {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface NormalizedQuotationItem extends Omit<QuotationItemRecord, 'unitPrice' | 'discount' | 'total'> {
  unitPrice: number;
  discount: number;
  total: number;
}

export interface InvoiceWithRelations extends NormalizedInvoice {
  customer: CustomerRecord;
  quotation?: NormalizedQuotation | null;
  items: NormalizedInvoiceItem[];
}

export interface QuotationWithRelations extends NormalizedQuotation {
  customer: CustomerRecord;
  items: NormalizedQuotationItem[];
}
