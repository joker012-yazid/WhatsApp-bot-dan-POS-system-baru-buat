import { NextRequest } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { quoteItems, quotes } from '@/db/schema';
import { calculateTotals, getQuoteWithRelations, toPgNumeric } from '@/lib/pos';
import logger from '@/lib/logger';
import { ensureWhatsAppJid, sendWhatsAppTextMessage } from '@/lib/wa';
import { getTicketById } from '@/lib/tickets';
import { DOCUMENT_NUMBER_PATTERN, nextNumber, parseDocumentNumber } from '@/lib/next-number';

export const runtime = 'nodejs';

const quoteItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
  discount: z.number().nonnegative().default(0),
});

const quoteStatusSchema = z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted']);

const documentNumberSchema = z
  .string()
  .regex(DOCUMENT_NUMBER_PATTERN, 'Invalid document number format');

const quoteSchema = z.object({
  customerId: z.string().uuid(),
  ticketId: z.string().uuid().optional().nullable(),
  number: documentNumberSchema.optional(),
  validUntil: z.string(),
  status: quoteStatusSchema.default('draft'),
  taxRate: z.number().default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, 'At least one line item is required'),
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
    return Response.json({ error: 'Provide a quote id or number' }, { status: 400 });
  }

  try {
    const quote = await getQuoteWithRelations({ id, number });
    if (!quote) {
      return Response.json({ error: 'Quote not found' }, { status: 404 });
    }
    return Response.json(quote);
  } catch (error) {
    logger.error({ err: error }, 'Failed to load quote');
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const { subtotal, taxAmount, total } = calculateTotals(data.items, data.taxRate);
  const quoteNumber = data.number ?? (await nextNumber('QUO'));
  const parsedNumber = parseDocumentNumber(quoteNumber);
  if (!parsedNumber) {
    return Response.json({ error: 'Invalid quote number format' }, { status: 400 });
  }
  const validUntil = new Date(data.validUntil);

  try {
    const createdQuote = await db.transaction(async (tx) => {
      const [quote] = await tx
        .insert(quotes)
        .values({
          number: quoteNumber,
          customerId: data.customerId,
          ticketId: data.ticketId ?? null,
          numberYear: parsedNumber.year,
          sequence: parsedNumber.sequence,
          validUntil,
          status: data.status,
          subtotal: toPgNumeric(subtotal),
          taxRate: toPgNumeric(data.taxRate),
          taxAmount: toPgNumeric(taxAmount),
          total: toPgNumeric(total),
          notes: data.notes,
          terms: data.terms,
        })
        .returning();

      if (!quote) {
        throw new Error('Quote insert did not return a record');
      }

      await tx.insert(quoteItems).values(
        data.items.map((item) => ({
          quoteId: quote.id,
          productId: item.productId ?? null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: toPgNumeric(item.unitPrice),
          discount: toPgNumeric(item.discount ?? 0),
          total: toPgNumeric(item.quantity * item.unitPrice - (item.discount ?? 0)),
        })),
      );

      return quote;
    });

    const quoteWithRelations = await getQuoteWithRelations({ id: createdQuote.id });
    if (!quoteWithRelations) {
      throw new Error('Failed to load created quote');
    }

    if (quoteWithRelations.customer.phone) {
      const totalFormatted = currencyFormatter.format(quoteWithRelations.total);
      const validUntilFormatted = quoteWithRelations.validUntil
        ? new Date(quoteWithRelations.validUntil).toLocaleDateString('en-MY')
        : '';
      const ticketReference = quoteWithRelations.ticketId
        ? await getTicketById(quoteWithRelations.ticketId)
        : null;
      const ticketNote = ticketReference ? ` Rujukan tiket #${ticketReference.ticketNumber}.` : '';
      const message = `Halo ${quoteWithRelations.customer.name}! Quotation ${quoteWithRelations.number} berjumlah ${totalFormatted}. Sah sehingga ${validUntilFormatted}.${ticketNote} Balas mesej ini untuk sebarang pertanyaan.`;

      try {
        await sendWhatsAppTextMessage(
          {
            to: ensureWhatsAppJid(quoteWithRelations.customer.phone),
            text: message,
            metadata: {
              documentId: quoteWithRelations.id,
              documentType: 'quotation',
              ticketId: quoteWithRelations.ticketId ?? null,
            },
          },
          { attempts: 3 },
        );
      } catch (error) {
        logger.warn({ err: error }, 'Failed to send quote WhatsApp notification');
      }
    }

    return Response.json(quoteWithRelations, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create quote');
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500 });
  }
}
