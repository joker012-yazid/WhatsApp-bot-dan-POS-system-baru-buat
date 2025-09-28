import { NextRequest } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { quotationItems, quotations } from '@/db/schema/app';
import {
  calculateTotals,
  formatDocumentNumber,
  getQuotationWithRelations,
  toPgNumeric,
} from '@/lib/pos';
import logger from '@/lib/logger';
import { ensureWhatsAppJid, sendWhatsAppTextMessage } from '@/lib/wa';

export const runtime = 'nodejs';

const quotationItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
  discount: z.number().nonnegative().default(0),
});

const quotationSchema = z.object({
  customerId: z.string().uuid(),
  ticketId: z.string().uuid().optional().nullable(),
  quotationNumber: z.string().optional(),
  validUntil: z.string(),
  status: z.string().default('draft'),
  taxRate: z.number().default(6),
  notes: z.string().optional(),
  terms: z.string().optional(),
  createdBy: z.string().uuid().optional(),
  items: z.array(quotationItemSchema).min(1, 'At least one line item is required'),
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
    return Response.json({ error: 'Provide a quotation id or number' }, { status: 400 });
  }

  try {
    const quotation = await getQuotationWithRelations({ id, number });
    if (!quotation) {
      return Response.json({ error: 'Quotation not found' }, { status: 404 });
    }
    return Response.json(quotation);
  } catch (error) {
    logger.error({ err: error }, 'Failed to load quotation');
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  const parsed = quotationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const { subtotal, taxAmount, total } = calculateTotals(data.items, data.taxRate);
  const quotationNumber = data.quotationNumber ?? formatDocumentNumber('QUO');
  const validUntil = new Date(data.validUntil);

  try {
    const createdQuotation = await db.transaction(async (tx) => {
      const [quotation] = await tx
        .insert(quotations)
        .values({
          quotationNumber,
          customerId: data.customerId,
          ticketId: data.ticketId ?? null,
          validUntil,
          status: data.status ?? 'draft',
          subtotal: toPgNumeric(subtotal),
          taxRate: toPgNumeric(data.taxRate),
          taxAmount: toPgNumeric(taxAmount),
          total: toPgNumeric(total),
          notes: data.notes,
          terms: data.terms,
          createdBy: data.createdBy ?? null,
        })
        .returning();

      if (!quotation) {
        throw new Error('Quotation insert did not return a record');
      }

      await tx.insert(quotationItems).values(
        data.items.map((item) => ({
          quotationId: quotation.id,
          productId: item.productId ?? null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: toPgNumeric(item.unitPrice),
          discount: toPgNumeric(item.discount ?? 0),
          totalPrice: toPgNumeric(item.quantity * item.unitPrice - (item.discount ?? 0)),
        })),
      );

      return quotation;
    });

    const quotationWithRelations = await getQuotationWithRelations({ id: createdQuotation.id });
    if (!quotationWithRelations) {
      throw new Error('Failed to load created quotation');
    }

    if (quotationWithRelations.customer.phone) {
      const totalFormatted = currencyFormatter.format(quotationWithRelations.total);
      const validUntilFormatted = quotationWithRelations.validUntil
        ? new Date(quotationWithRelations.validUntil).toLocaleDateString('en-MY')
        : '';
      const message = `Halo ${quotationWithRelations.customer.name}! Quotation ${quotationWithRelations.quotationNumber} berjumlah ${totalFormatted}. Sah sehingga ${validUntilFormatted}. Balas mesej ini untuk sebarang pertanyaan.`;

      try {
        await sendWhatsAppTextMessage(
          {
            to: ensureWhatsAppJid(quotationWithRelations.customer.phone),
            message,
            metadata: {
              documentId: quotationWithRelations.id,
              documentType: 'quotation',
            },
          },
          { attempts: 3 },
        );
      } catch (error) {
        logger.warn({ err: error }, 'Failed to send quotation WhatsApp notification');
      }
    }

    return Response.json(quotationWithRelations, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create quotation');
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500 });
  }
}
