import { NextRequest } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { invoiceItems, invoices } from '@/db/schema';
import {
  calculateTotals,
  formatDocumentNumber,
  getInvoiceWithRelations,
  toPgNumeric,
} from '@/lib/pos';
import logger from '@/lib/logger';
import { ensureWhatsAppJid, sendWhatsAppTextMessage } from '@/lib/wa';

export const runtime = 'nodejs';

const invoiceItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
  discount: z.number().nonnegative().default(0),
});

const invoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled']);

const invoiceSchema = z.object({
  customerId: z.string().uuid(),
  quoteId: z.string().uuid().optional().nullable(),
  number: z.string().optional(),
  issuedAt: z.string().optional(),
  dueAt: z.string().optional(),
  status: invoiceStatusSchema.default('draft'),
  taxRate: z.number().default(0),
  paidAmount: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
});

const currencyFormatter = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
});

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const number = url.searchParams.get('number');

  if (!id && !number) {
    return Response.json({ error: 'Provide an invoice id or number' }, { status: 400 });
  }

  try {
    const invoice = await getInvoiceWithRelations({ id, number });
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }
    return Response.json(invoice);
  } catch (error) {
    logger.error({ err: error }, 'Failed to load invoice');
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const { subtotal, taxAmount, total } = calculateTotals(data.items, data.taxRate);
  const invoiceNumber = data.number ?? formatDocumentNumber('INV');
  const issuedAt = data.issuedAt ? new Date(data.issuedAt) : new Date();
  const dueAt = data.dueAt ? new Date(data.dueAt) : null;
  const paidAmount = Math.max(0, data.paidAmount ?? 0);
  const balanceValue = Math.max(0, total - paidAmount);

  try {
    const createdInvoice = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({
          number: invoiceNumber,
          customerId: data.customerId,
          quoteId: data.quoteId ?? null,
          issuedAt,
          dueAt,
          status: data.status,
          subtotal: toPgNumeric(subtotal),
          taxRate: toPgNumeric(data.taxRate),
          taxAmount: toPgNumeric(taxAmount),
          total: toPgNumeric(total),
          paidAmount: toPgNumeric(paidAmount),
          balance: toPgNumeric(balanceValue),
          notes: data.notes,
        })
        .returning();

      if (!invoice) {
        throw new Error('Invoice insert did not return a record');
      }

      await tx.insert(invoiceItems).values(
        data.items.map((item) => ({
          invoiceId: invoice.id,
          productId: item.productId ?? null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: toPgNumeric(item.unitPrice),
          discount: toPgNumeric(item.discount ?? 0),
          total: toPgNumeric(item.quantity * item.unitPrice - (item.discount ?? 0)),
        })),
      );

      return invoice;
    });

    const invoiceWithRelations = await getInvoiceWithRelations({ id: createdInvoice.id });
    if (!invoiceWithRelations) {
      throw new Error('Failed to load created invoice');
    }

    if (invoiceWithRelations.customer.phone) {
      const totalFormatted = currencyFormatter.format(invoiceWithRelations.total);
      const dueDateFormatted = invoiceWithRelations.dueAt
        ? new Date(invoiceWithRelations.dueAt).toLocaleDateString('en-MY')
        : '';
      const message = `Halo ${invoiceWithRelations.customer.name}! Invois ${invoiceWithRelations.number} berjumlah ${totalFormatted}. Tarikh akhir: ${dueDateFormatted}. Sila hubungi kami jika perlukan bantuan.`;

      try {
        await sendWhatsAppTextMessage(
          {
            to: ensureWhatsAppJid(invoiceWithRelations.customer.phone),
            text: message,
            metadata: {
              documentId: invoiceWithRelations.id,
              documentType: 'invoice',
            },
          },
          { attempts: 3 },
        );
      } catch (error) {
        logger.warn({ err: error }, 'Failed to send invoice WhatsApp notification');
      }
    }

    return Response.json(invoiceWithRelations, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create invoice');
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500 });
  }
}
