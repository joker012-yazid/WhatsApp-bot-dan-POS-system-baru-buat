import { NextRequest } from 'next/server';
import { z } from 'zod';

import logger from '@/lib/logger';
import { readGeneratedPdf, renderInvoicePdf, renderQuotationPdf } from '@/lib/pdf';
import { getInvoiceWithRelations, getQuotationWithRelations } from '@/lib/pos';

export const runtime = 'nodejs';

const pdfRequestSchema = z.object({
  type: z.enum(['invoice', 'quotation']),
  id: z.string().uuid().optional().nullable(),
  number: z.string().optional().nullable(),
  download: z.boolean().optional(),
});

type PdfRequest = z.infer<typeof pdfRequestSchema>;

async function handlePdfGeneration(params: PdfRequest): Promise<Response> {
  const { type, id, number, download } = params;

  if (!id && !number) {
    return Response.json({ error: 'Provide an id or number' }, { status: 400 });
  }

  if (type === 'invoice') {
    const invoice = await getInvoiceWithRelations({ id, number });
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const pdf = await renderInvoicePdf(invoice);
    const buffer = await readGeneratedPdf(pdf);
    return respondWithPdf(buffer, pdf.fileName, download);
  }

  const quotation = await getQuotationWithRelations({ id, number });
  if (!quotation) {
    return Response.json({ error: 'Quotation not found' }, { status: 404 });
  }
  const pdf = await renderQuotationPdf(quotation);
  const buffer = await readGeneratedPdf(pdf);
  return respondWithPdf(buffer, pdf.fileName, download);
}

function respondWithPdf(buffer: Buffer, filename: string, download?: boolean): Response {
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length.toString(),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

function parseRequestData(data: Record<string, unknown>): PdfRequest | null {
  const parsed = pdfRequestSchema.safeParse(data);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);
  const maybeData = parseRequestData({
    type: url.searchParams.get('type') ?? undefined,
    id: url.searchParams.get('id') ?? undefined,
    number: url.searchParams.get('number') ?? undefined,
    download: url.searchParams.get('download') === 'true',
  });

  if (!maybeData) {
    return Response.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  try {
    return await handlePdfGeneration(maybeData);
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate PDF (GET)');
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json();
  const maybeData = parseRequestData(body);
  if (!maybeData) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    return await handlePdfGeneration(maybeData);
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate PDF (POST)');
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500 });
  }
}
