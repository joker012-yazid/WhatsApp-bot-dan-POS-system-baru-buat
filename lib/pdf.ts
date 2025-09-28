import { format } from 'date-fns';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import type { InvoiceWithRelations, QuotationWithRelations } from '@/types/pos';

const currencyFormatter = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(Math.round(value * 100) / 100);
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '-';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  return format(date, 'dd MMM yyyy');
}

interface PdfLayoutOptions {
  title: string;
  subtitle?: string;
}

async function createBaseDocument(options: PdfLayoutOptions): Promise<{
  pdfDoc: PDFDocument;
  page: PDFPage;
  titleFont: PDFFont;
  bodyFont: PDFFont;
}> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  const { height } = page.getSize();

  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText(options.title, {
    x: 40,
    y: height - 60,
    size: 24,
    font: titleFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  if (options.subtitle) {
    page.drawText(options.subtitle, {
      x: 40,
      y: height - 90,
      size: 12,
      font: bodyFont,
      color: rgb(0.35, 0.35, 0.35),
    });
  }

  return { pdfDoc, page, titleFont, bodyFont };
}

function drawKeyValue(
  page: PDFPage,
  font: PDFFont,
  label: string,
  value: string,
  position: { x: number; y: number },
) {
  page.drawText(`${label}:`, {
    x: position.x,
    y: position.y,
    size: 11,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  page.drawText(value, {
    x: position.x + 120,
    y: position.y,
    size: 11,
    font,
    color: rgb(0.05, 0.05, 0.05),
  });
}

function drawLineItems(
  page: PDFPage,
  font: PDFFont,
  startY: number,
  items: Array<{ description: string; quantity: number; unitPrice: number; totalPrice: number }>,
) {
  let currentY = startY;

  page.drawText('Description', { x: 40, y: currentY, size: 11, font, color: rgb(0, 0, 0) });
  page.drawText('Qty', { x: 320, y: currentY, size: 11, font, color: rgb(0, 0, 0) });
  page.drawText('Unit Price', { x: 360, y: currentY, size: 11, font, color: rgb(0, 0, 0) });
  page.drawText('Amount', { x: 460, y: currentY, size: 11, font, color: rgb(0, 0, 0) });

  currentY -= 20;

  items.forEach((item) => {
    page.drawText(item.description, { x: 40, y: currentY, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(String(item.quantity), { x: 320, y: currentY, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(formatCurrency(item.unitPrice), { x: 360, y: currentY, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(formatCurrency(item.totalPrice), { x: 460, y: currentY, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    currentY -= 18;
  });

  return currentY;
}

export async function renderInvoicePdf(invoice: InvoiceWithRelations): Promise<Uint8Array> {
  const { pdfDoc, page, bodyFont, titleFont } = await createBaseDocument({
    title: 'Invoice',
    subtitle: `${invoice.invoiceNumber} • ${formatDate(invoice.invoiceDate)}`,
  });
  const { height } = page.getSize();

  drawKeyValue(page, bodyFont, 'Customer', invoice.customer.name, { x: 40, y: height - 130 });
  drawKeyValue(page, bodyFont, 'Phone', invoice.customer.phone ?? '-', { x: 40, y: height - 150 });
  drawKeyValue(page, bodyFont, 'Email', invoice.customer.email ?? '-', { x: 40, y: height - 170 });

  drawKeyValue(page, bodyFont, 'Invoice Date', formatDate(invoice.invoiceDate), { x: 320, y: height - 130 });
  drawKeyValue(page, bodyFont, 'Due Date', formatDate(invoice.dueDate), { x: 320, y: height - 150 });
  drawKeyValue(page, bodyFont, 'Status', invoice.status, { x: 320, y: height - 170 });

  const lineItemsY = drawLineItems(page, bodyFont, height - 210, invoice.items);

  let summaryY = lineItemsY - 20;
  page.drawLine({
    start: { x: 320, y: summaryY + 10 },
    end: { x: 520, y: summaryY + 10 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  drawKeyValue(page, bodyFont, 'Subtotal', formatCurrency(invoice.subtotal), { x: 320, y: summaryY });
  summaryY -= 18;
  drawKeyValue(page, bodyFont, `Tax (${invoice.taxRate}% )`, formatCurrency(invoice.taxAmount), {
    x: 320,
    y: summaryY,
  });
  summaryY -= 18;
  drawKeyValue(page, titleFont, 'Total', formatCurrency(invoice.total), { x: 320, y: summaryY });
  summaryY -= 18;
  drawKeyValue(page, bodyFont, 'Paid', formatCurrency(invoice.paidAmount), { x: 320, y: summaryY });
  summaryY -= 18;
  drawKeyValue(page, bodyFont, 'Balance', formatCurrency(invoice.balance ?? 0), { x: 320, y: summaryY });

  if (invoice.notes) {
    page.drawText('Notes', { x: 40, y: summaryY - 40, size: 11, font: titleFont, color: rgb(0, 0, 0) });
    page.drawText(invoice.notes, {
      x: 40,
      y: summaryY - 60,
      size: 10,
      font: bodyFont,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: 480,
      lineHeight: 14,
    });
  }

  return pdfDoc.save();
}

export async function renderQuotationPdf(quotation: QuotationWithRelations): Promise<Uint8Array> {
  const { pdfDoc, page, bodyFont, titleFont } = await createBaseDocument({
    title: 'Quotation',
    subtitle: `${quotation.quotationNumber} • Valid until ${formatDate(quotation.validUntil)}`,
  });
  const { height } = page.getSize();

  drawKeyValue(page, bodyFont, 'Customer', quotation.customer.name, { x: 40, y: height - 130 });
  drawKeyValue(page, bodyFont, 'Phone', quotation.customer.phone ?? '-', { x: 40, y: height - 150 });
  drawKeyValue(page, bodyFont, 'Email', quotation.customer.email ?? '-', { x: 40, y: height - 170 });

  drawKeyValue(page, bodyFont, 'Status', quotation.status, { x: 320, y: height - 130 });
  drawKeyValue(page, bodyFont, 'Valid Until', formatDate(quotation.validUntil), { x: 320, y: height - 150 });

  const lineItemsY = drawLineItems(page, bodyFont, height - 210, quotation.items);

  let summaryY = lineItemsY - 20;
  page.drawLine({
    start: { x: 320, y: summaryY + 10 },
    end: { x: 520, y: summaryY + 10 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  drawKeyValue(page, bodyFont, 'Subtotal', formatCurrency(quotation.subtotal), { x: 320, y: summaryY });
  summaryY -= 18;
  drawKeyValue(page, bodyFont, `Tax (${quotation.taxRate}% )`, formatCurrency(quotation.taxAmount), {
    x: 320,
    y: summaryY,
  });
  summaryY -= 18;
  drawKeyValue(page, titleFont, 'Total', formatCurrency(quotation.total), { x: 320, y: summaryY });

  if (quotation.notes) {
    page.drawText('Notes', { x: 40, y: summaryY - 40, size: 11, font: titleFont, color: rgb(0, 0, 0) });
    page.drawText(quotation.notes, {
      x: 40,
      y: summaryY - 60,
      size: 10,
      font: bodyFont,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: 480,
      lineHeight: 14,
    });
  }

  if (quotation.terms) {
    page.drawText('Terms', { x: 40, y: summaryY - 110, size: 11, font: titleFont, color: rgb(0, 0, 0) });
    page.drawText(quotation.terms, {
      x: 40,
      y: summaryY - 130,
      size: 10,
      font: bodyFont,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: 480,
      lineHeight: 14,
    });
  }

  return pdfDoc.save();
}
