import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { format } from 'date-fns';
import type PDFDocument from 'pdfkit';
import type * as PDFKitNS from 'pdfkit';

import env from '@/env.mjs';
import logger from '@/lib/logger';
import type { InvoiceWithRelations, QuoteWithRelations } from '@/types/pos';

const currencyFormatter = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
});

export interface GeneratedPdf {
  fileName: string;
  filePath: string;
}

export interface GeneratePdfOptions {
  fileName?: string;
  html?: string;
  pdfKit?(doc: PDFDocument): void | Promise<void>;
  pdfKitOptions?: PDFKitNS.PDFDocumentOptions;
}

type PdfKitConstructor = new (options?: PDFKitNS.PDFDocumentOptions) => PDFDocument;
type PuppeteerModule = typeof import('puppeteer-core');

async function ensureOutputDir(): Promise<string> {
  await mkdir(env.FILES_DIR, { recursive: true });
  return env.FILES_DIR;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-z0-9._-]+/gi, '-');
}

async function renderWithPuppeteer(html: string, filePath: string): Promise<void> {
  const { default: puppeteer } = (await import('puppeteer-core')) as PuppeteerModule;
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.CHROME_EXECUTABLE_PATH,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
}

async function renderWithPdfKit(
  PdfKit: PdfKitConstructor,
  filePath: string,
  callback: NonNullable<GeneratePdfOptions['pdfKit']>,
  options?: PDFKitNS.PDFDocumentOptions,
): Promise<void> {
  const doc = new PdfKit(options);
  const stream = doc.pipe(createWriteStream(filePath));

  await Promise.resolve(callback(doc));
  doc.end();
  await once(stream, 'finish');
}

export async function generatePdf(options: GeneratePdfOptions): Promise<GeneratedPdf> {
  const directory = await ensureOutputDir();
  const fileName = sanitizeFileName(options.fileName ?? `pdf-${randomUUID()}.pdf`);
  const filePath = path.join(directory, fileName);

  if (!options.html && !options.pdfKit) {
    throw new Error('Either html or pdfKit callback must be provided to generate a PDF');
  }

  try {
    if (options.html) {
      try {
        logger.debug({ filePath }, 'Generating PDF using Puppeteer');
        await renderWithPuppeteer(options.html, filePath);
        return { fileName, filePath };
      } catch (error) {
        logger.warn({ err: error }, 'Puppeteer PDF generation failed, falling back to PDFKit');
      }
    }

    if (options.pdfKit) {
      const { default: PdfKit } = (await import('pdfkit')) as { default: PdfKitConstructor };
      logger.debug({ filePath }, 'Generating PDF using PDFKit');
      await renderWithPdfKit(PdfKit, filePath, options.pdfKit, options.pdfKitOptions);
      return { fileName, filePath };
    }

    throw new Error('Unable to generate PDF with the provided options');
  } catch (error) {
    logger.error({ err: error, filePath }, 'Failed to generate PDF');
    throw error;
  }
}

export async function readGeneratedPdf(result: GeneratedPdf): Promise<Buffer> {
  return readFile(result.filePath);
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(Math.round(value * 100) / 100);
}

function formatDateValue(value: string | Date | null | undefined): string {
  if (!value) {
    return '-';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  return format(date, 'dd MMM yyyy');
}

function drawKeyValue(
  doc: PDFDocument,
  label: string,
  value: string,
  position: { x: number; y: number },
): number {
  const labelOptions = { x: position.x, y: position.y } as const;
  const valueOptions = { x: position.x + 120, y: position.y } as const;

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#555555')
    .text(`${label}:`, labelOptions.x, labelOptions.y);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#111111')
    .text(value, valueOptions.x, valueOptions.y);

  return position.y + 16;
}

function drawLineItems(
  doc: PDFDocument,
  startY: number,
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>,
): number {
  const columns = {
    description: doc.page.margins.left,
    quantity: 320,
    unitPrice: 370,
    total: 460,
  } as const;

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
  doc.text('Description', columns.description, startY, { width: 260 });
  doc.text('Qty', columns.quantity, startY, { width: 40, align: 'right' });
  doc.text('Unit Price', columns.unitPrice, startY, { width: 70, align: 'right' });
  doc.text('Amount', columns.total, startY, { width: 90, align: 'right' });

  let currentY = startY + 18;
  doc.font('Helvetica').fontSize(10).fillColor('#222222');

  items.forEach((item) => {
    doc.text(item.description, columns.description, currentY, { width: 260 });
    doc.text(String(item.quantity), columns.quantity, currentY, { width: 40, align: 'right' });
    doc.text(formatCurrency(item.unitPrice), columns.unitPrice, currentY, { width: 70, align: 'right' });
    doc.text(formatCurrency(item.total), columns.total, currentY, { width: 90, align: 'right' });
    currentY += 16;
  });

  return currentY;
}

function drawSummary(
  doc: PDFDocument,
  startY: number,
  rows: Array<{ label: string; value: string; emphasize?: boolean }>,
): number {
  const x = 320;

  doc
    .moveTo(x, startY - 6)
    .lineTo(x + 230, startY - 6)
    .lineWidth(0.5)
    .strokeColor('#cccccc')
    .stroke();

  let currentY = startY + 4;

  rows.forEach((row) => {
    doc
      .font(row.emphasize ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(10)
      .fillColor('#333333')
      .text(row.label, x, currentY, { width: 120 });
    doc
      .font(row.emphasize ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(10)
      .fillColor('#111111')
      .text(row.value, x + 130, currentY, { width: 100, align: 'right' });
    currentY += 16;
  });

  return currentY;
}

function drawNotes(doc: PDFDocument, title: string, content: string, startY: number): number {
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#000000')
    .text(title, doc.page.margins.left, startY);
  const textOptions = { width: 480, lineGap: 4 } as const;
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#222222')
    .text(content, doc.page.margins.left, startY + 16, textOptions);
  return doc.y + 16;
}

async function renderPosDocument(
  title: string,
  subtitle: string,
  leftDetails: Array<{ label: string; value: string }>,
  rightDetails: Array<{ label: string; value: string }>,
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>,
  summaryRows: Array<{ label: string; value: string; emphasize?: boolean }>,
  extras?: Array<{ title: string; content: string }>,
  fileName?: string,
): Promise<GeneratedPdf> {
  return generatePdf({
    fileName,
    pdfKit: (doc) => {
      doc.info.Title = title;
      doc.font('Helvetica-Bold').fontSize(22).fillColor('#111111').text(title);
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#555555')
        .text(subtitle);

      const detailStartY = doc.y + 20;
      let leftY = detailStartY;
      let rightY = detailStartY;

      leftDetails.forEach((detail) => {
        leftY = drawKeyValue(doc, detail.label, detail.value, {
          x: doc.page.margins.left,
          y: leftY,
        });
      });

      rightDetails.forEach((detail) => {
        rightY = drawKeyValue(doc, detail.label, detail.value, {
          x: 320,
          y: rightY,
        });
      });

      const tableStartY = Math.max(leftY, rightY) + 20;
      const summaryStartY = drawLineItems(doc, tableStartY, items) + 16;
      let extrasStartY = drawSummary(doc, summaryStartY, summaryRows) + 24;

      extras?.forEach((extra) => {
        extrasStartY = drawNotes(doc, extra.title, extra.content, extrasStartY);
      });
    },
    pdfKitOptions: {
      size: 'A4',
      margin: 50,
    },
  });
}

export async function renderInvoicePdf(invoice: InvoiceWithRelations): Promise<GeneratedPdf> {
  const subtitle = `${invoice.number} • ${formatDateValue(invoice.issuedAt)}`;
  const leftDetails = [
    { label: 'Customer', value: invoice.customer.name },
    { label: 'Phone', value: invoice.customer.phone ?? '-' },
    { label: 'Email', value: invoice.customer.email ?? '-' },
  ];
  const rightDetails = [
    { label: 'Invoice Date', value: formatDateValue(invoice.issuedAt) },
    { label: 'Due Date', value: formatDateValue(invoice.dueAt) },
    { label: 'Status', value: invoice.status },
  ];

  const summaryRows = [
    { label: 'Subtotal', value: formatCurrency(invoice.subtotal) },
    { label: `Tax (${invoice.taxRate}% )`, value: formatCurrency(invoice.taxAmount) },
    { label: 'Total', value: formatCurrency(invoice.total), emphasize: true },
    { label: 'Paid', value: formatCurrency(invoice.paidAmount ?? 0) },
    { label: 'Balance', value: formatCurrency(invoice.balance ?? 0) },
  ];

  const extras: Array<{ title: string; content: string }> = [];
  if (invoice.notes) {
    extras.push({ title: 'Notes', content: invoice.notes });
  }

  return renderPosDocument(
    'Invoice',
    subtitle,
    leftDetails,
    rightDetails,
    invoice.items,
    summaryRows,
    extras,
    `invoice-${invoice.number}.pdf`,
  );
}

export async function renderQuotePdf(quote: QuoteWithRelations): Promise<GeneratedPdf> {
  const subtitle = `${quote.number} • Valid until ${formatDateValue(quote.validUntil)}`;
  const leftDetails = [
    { label: 'Customer', value: quote.customer.name },
    { label: 'Phone', value: quote.customer.phone ?? '-' },
    { label: 'Email', value: quote.customer.email ?? '-' },
  ];
  const rightDetails = [
    { label: 'Status', value: quote.status },
    { label: 'Valid Until', value: formatDateValue(quote.validUntil) },
  ];

  const summaryRows = [
    { label: 'Subtotal', value: formatCurrency(quote.subtotal) },
    { label: `Tax (${quote.taxRate}% )`, value: formatCurrency(quote.taxAmount) },
    { label: 'Total', value: formatCurrency(quote.total), emphasize: true },
  ];

  const extras: Array<{ title: string; content: string }> = [];
  if (quote.notes) {
    extras.push({ title: 'Notes', content: quote.notes });
  }
  if (quote.terms) {
    extras.push({ title: 'Terms', content: quote.terms });
  }

  return renderPosDocument(
    'Quotation',
    subtitle,
    leftDetails,
    rightDetails,
    quote.items,
    summaryRows,
    extras,
    `quotation-${quote.number}.pdf`,
  );
}
