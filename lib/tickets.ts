import { and, desc, eq, inArray } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'

import { db } from '@/db'
import { customers, diagnostics, invoices, quotes, ticketUpdates, tickets } from '@/db/schema'
import logger from '@/lib/logger'
import { formatDocumentNumber, toPgNumeric } from '@/lib/pos'

export type TicketRecord = InferSelectModel<typeof tickets>
export type CustomerRecord = InferSelectModel<typeof customers>
export type DiagnosticRecord = InferSelectModel<typeof diagnostics>
export type TicketUpdateRecord = InferSelectModel<typeof ticketUpdates>
export type QuoteRecord = InferSelectModel<typeof quotes>
export type InvoiceRecord = InferSelectModel<typeof invoices>

export interface TicketWithRelations extends TicketRecord {
  customer: CustomerRecord
  latestDiagnostic: DiagnosticRecord | null
  latestUpdate: TicketUpdateRecord | null
  quote: QuoteRecord | null
  invoice: InvoiceRecord | null
}

export const TICKET_NUMBER_PREFIX = 'TKT'

export function generateTicketNumber(prefix = TICKET_NUMBER_PREFIX): string {
  return formatDocumentNumber(prefix)
}

export async function getTicketById(id: string): Promise<TicketWithRelations | null> {
  const [ticket] = await db
    .select({ ticket: tickets, customer: customers })
    .from(tickets)
    .innerJoin(customers, eq(tickets.customerId, customers.id))
    .where(eq(tickets.id, id))
    .limit(1)

  if (!ticket) {
    return null
  }

  const [latestDiagnostic] = await db
    .select()
    .from(diagnostics)
    .where(eq(diagnostics.ticketId, id))
    .orderBy(desc(diagnostics.createdAt))
    .limit(1)

  const [latestUpdate] = await db
    .select()
    .from(ticketUpdates)
    .where(eq(ticketUpdates.ticketId, id))
    .orderBy(desc(ticketUpdates.createdAt))
    .limit(1)

  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.ticketId, id), inArray(quotes.status, ['sent', 'approved'])))
    .orderBy(desc(quotes.createdAt))
    .limit(1)

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.ticketId, id))
    .orderBy(desc(invoices.createdAt))
    .limit(1)

  return {
    ...ticket.ticket,
    customer: ticket.customer,
    latestDiagnostic: latestDiagnostic ?? null,
    latestUpdate: latestUpdate ?? null,
    quote: quote ?? null,
    invoice: invoice ?? null,
  }
}

export async function listTickets(limit = 30): Promise<TicketWithRelations[]> {
  const rows = await db
    .select({ ticket: tickets, customer: customers })
    .from(tickets)
    .innerJoin(customers, eq(tickets.customerId, customers.id))
    .orderBy(desc(tickets.createdAt))
    .limit(limit)

  const ticketIds = rows.map((row) => row.ticket.id)

  if (ticketIds.length === 0) {
    return []
  }

  const diagnosticsByTicket = await db
    .select()
    .from(diagnostics)
    .where(inArray(diagnostics.ticketId, ticketIds))
    .orderBy(desc(diagnostics.createdAt))
    .catch((error) => {
      logger.error({ err: error }, 'Failed to load diagnostics for tickets')
      return [] as DiagnosticRecord[]
    })

  const updatesByTicket = await db
    .select()
    .from(ticketUpdates)
    .where(inArray(ticketUpdates.ticketId, ticketIds))
    .orderBy(desc(ticketUpdates.createdAt))
    .catch((error) => {
      logger.error({ err: error }, 'Failed to load ticket updates')
      return [] as TicketUpdateRecord[]
    })

  const quotesByTicket = await db
    .select()
    .from(quotes)
    .where(inArray(quotes.ticketId, ticketIds))
    .catch((error) => {
      logger.error({ err: error }, 'Failed to load quotes for tickets')
      return [] as QuoteRecord[]
    })

  const invoicesByTicket = await db
    .select()
    .from(invoices)
    .where(inArray(invoices.ticketId, ticketIds))
    .catch((error) => {
      logger.error({ err: error }, 'Failed to load invoices for tickets')
      return [] as InvoiceRecord[]
    })

  const diagnosticMap = new Map<string, DiagnosticRecord>()
  for (const item of diagnosticsByTicket) {
    if (!diagnosticMap.has(item.ticketId)) {
      diagnosticMap.set(item.ticketId, item)
    }
  }

  const updateMap = new Map<string, TicketUpdateRecord>()
  for (const item of updatesByTicket) {
    if (!updateMap.has(item.ticketId)) {
      updateMap.set(item.ticketId, item)
    }
  }

  const quoteMap = new Map<string, QuoteRecord>()
  for (const item of quotesByTicket) {
    const existing = quoteMap.get(item.ticketId)
    const itemCreatedAt = item.createdAt instanceof Date ? item.createdAt.getTime() : new Date(item.createdAt ?? '').getTime()
    const existingCreatedAt =
      existing && existing.createdAt instanceof Date
        ? existing.createdAt.getTime()
        : new Date(existing?.createdAt ?? '').getTime()
    if (!existing || itemCreatedAt > existingCreatedAt) {
      quoteMap.set(item.ticketId, item)
    }
  }

  const invoiceMap = new Map<string, InvoiceRecord>()
  for (const item of invoicesByTicket) {
    if (!invoiceMap.has(item.ticketId)) {
      invoiceMap.set(item.ticketId, item)
    }
  }

  return rows.map((row) => {
    const ticketId = row.ticket.id
    const latestDiagnostic = diagnosticMap.get(ticketId) ?? null
    const latestUpdate = updateMap.get(ticketId) ?? null
    const quote = quoteMap.get(ticketId) ?? null
    const invoice = invoiceMap.get(ticketId) ?? null

    return {
      ...row.ticket,
      customer: row.customer,
      latestDiagnostic,
      latestUpdate,
      quote,
      invoice,
    }
  })
}

export function upsertTicketEstimate(
  ticketId: string,
  estimate?: number | null,
): Promise<void> {
  if (estimate === undefined || estimate === null) {
    return Promise.resolve()
  }

  return db
    .update(tickets)
    .set({
      estimatedCost: toPgNumeric(estimate),
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, ticketId))
    .then(() => undefined)
}
