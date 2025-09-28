import { NextRequest } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { invoiceItems, invoices } from '@/db/schema/app';
import {
  calculateTotals,
  formatDocumentNumber,
  getInvoiceWithRelations,
  toPgNumeric,
} from '@/lib/pos';
import { ensureWhatsAppJid, sendWhatsAppTextMessage } from '@/lib/wa';

export const runtime = 'nodejs';

const invoiceItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
  discount: z.number().nonnegative().default(0),
});

const invoiceSchema = z.object({
  customerId: z.string().uuid(),
  ticketId: z.string().uuid().optional().nullable(),
  quotationId: z.string().uuid().optional().nullable(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string(),
  status: z.string().default('draft'),
  taxRate: z.number().default(6),
  notes: z.string().optional(),
  paymentMethod: z.string().optional(),
  createdBy: z.string().uuid().optional(),
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
    console.error('Failed to load invoice', error);
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
  const invoiceNumber = data.invoiceNumber ?? formatDocumentNumber('INV');
  const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : new Date();
  const dueDate = new Date(data.dueDate);

  try {
    const createdInvoice = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({
          invoiceNumber,
          customerId: data.customerId,
          ticketId: data.ticketId ?? null,
          quotationId: data.quotationId ?? null,
          invoiceDate,
          dueDate,
          status: data.status ?? 'draft',
          subtotal: toPgNumeric(subtotal),
          taxRate: toPgNumeric(data.taxRate),
          taxAmount: toPgNumeric(taxAmount),
          total: toPgNumeric(total),
          paidAmount: toPgNumeric(0),
          notes: data.notes,
          paymentMethod: data.paymentMethod,
          createdBy: data.createdBy ?? null,
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
          totalPrice: toPgNumeric(item.quantity * item.unitPrice - (item.discount ?? 0)),
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
      const dueDateFormatted = invoiceWithRelations.dueDate
        ? new Date(invoiceWithRelations.dueDate).toLocaleDateString('en-MY')
        : '';
      const message = `Halo ${invoiceWithRelations.customer.name}! Invois ${invoiceWithRelations.invoiceNumber} berjumlah ${totalFormatted}. Tarikh akhir: ${dueDateFormatted}. Sila hubungi kami jika perlukan bantuan.`;

      try {
        await sendWhatsAppTextMessage({
          to: ensureWhatsAppJid(invoiceWithRelations.customer.phone),
          message,
        });
      } catch (error) {
        console.warn('Failed to send invoice WhatsApp notification', error);
      }
    }

    return Response.json(invoiceWithRelations, { status: 201 });
  } catch (error) {
    console.error('Failed to create invoice', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500 });
  }
}
