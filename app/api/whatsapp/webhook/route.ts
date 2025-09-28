import { NextRequest } from 'next/server'
import { and, desc, eq, or } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { customers, invoices, tickets, waMessages } from '@/db/schema'
import logger from '@/lib/logger'
import {
  coerceSopMetadata,
  detectSopCommand,
  formatApprovalAcceptedMessage,
  formatApprovalRejectedMessage,
  formatInvoiceSummary,
  formatNoTicketMessage,
  formatPickupInstructions,
  formatSupportHandoffMessage,
  formatTicketStatusSummary,
  formatUnknownCommandMessage,
  formatCurrency,
  stageFromTicketStatus,
  type SopCommand,
  type SopMetadata,
  type SopStage,
  type TicketStatus,
} from '@/lib/wa-sop'
import { sendTicketWorkflowWhatsAppMessage } from '@/lib/wa-messaging'
import { normalizePhoneNumber, sendWhatsAppTextMessage } from '@/lib/wa'

export const runtime = 'nodejs'

const inboundMessageSchema = z.object({
  from: z.string().min(1, 'Sender is required'),
  text: z.string().min(1, 'Message text is required'),
})

type InsertWaMessage = typeof waMessages.$inferInsert

type RawMetadata = Record<string, unknown> | null | undefined

type CustomerRecord = {
  id: string
  name: string | null
  phone: string
}

interface TicketContext {
  id: string
  ticketNumber: string
  status: TicketStatus
  customerId: string
  customerName: string | null
  customerPhone: string
  estimatedCost: string | null
  invoice: {
    id: string
    number: string
    total: string | null
    status: string | null
  } | null
}

function extractSopMetadata(metadata: RawMetadata): SopMetadata {
  return coerceSopMetadata(metadata ?? null)
}

async function findCustomerByPhone(msisdn: string): Promise<CustomerRecord | null> {
  if (!msisdn) {
    return null
  }

  const plain = msisdn.replace(/^\+/, '')
  const [record] = await db
    .select({ id: customers.id, name: customers.name, phone: customers.phone })
    .from(customers)
    .where(or(eq(customers.phone, msisdn), eq(customers.phone, plain)))
    .limit(1)

  return record ?? null
}

async function getTicketContextById(ticketId: string): Promise<TicketContext | null> {
  const [record] = await db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      status: tickets.status,
      customerId: tickets.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
      estimatedCost: tickets.estimatedCost,
    })
    .from(tickets)
    .innerJoin(customers, eq(customers.id, tickets.customerId))
    .where(eq(tickets.id, ticketId))
    .limit(1)

  if (!record) {
    return null
  }

  const [invoiceRecord] = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      total: invoices.total,
      status: invoices.status,
    })
    .from(invoices)
    .where(eq(invoices.ticketId, ticketId))
    .orderBy(desc(invoices.createdAt))
    .limit(1)

  return {
    id: record.id,
    ticketNumber: record.ticketNumber,
    status: record.status as TicketStatus,
    customerId: record.customerId,
    customerName: record.customerName,
    customerPhone: record.customerPhone,
    estimatedCost: record.estimatedCost ?? null,
    invoice: invoiceRecord
      ? {
          id: invoiceRecord.id,
          number: invoiceRecord.number,
          total: invoiceRecord.total ?? null,
          status: invoiceRecord.status ?? null,
        }
      : null,
  }
}

async function findLatestTicketForCustomer(customerId: string): Promise<TicketContext | null> {
  const [record] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.customerId, customerId))
    .orderBy(desc(tickets.updatedAt), desc(tickets.createdAt))
    .limit(1)

  if (!record) {
    return null
  }

  return getTicketContextById(record.id)
}

async function findLatestTicketByStatus(
  customerId: string,
  status: TicketStatus,
): Promise<TicketContext | null> {
  const [record] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(and(eq(tickets.customerId, customerId), eq(tickets.status, status)))
    .orderBy(desc(tickets.updatedAt), desc(tickets.createdAt))
    .limit(1)

  if (!record) {
    return null
  }

  return getTicketContextById(record.id)
}

async function resolveTicketContext(
  customerId: string | null,
  previous: SopMetadata,
  command: SopCommand,
): Promise<TicketContext | null> {
  if (!customerId) {
    return null
  }

  if (previous.ticketId) {
    const ticket = await getTicketContextById(previous.ticketId)
    if (ticket) {
      if ((command === 'approve' || command === 'reject') && ticket.status !== 'awaiting_approval') {
        // Continue searching for awaiting approval ticket below
      } else {
        return ticket
      }
    }
  }

  if (command === 'approve' || command === 'reject') {
    const awaiting = await findLatestTicketByStatus(customerId, 'awaiting_approval')
    if (awaiting) {
      return awaiting
    }
  }

  return findLatestTicketForCustomer(customerId)
}

async function insertWaMessage(values: InsertWaMessage): Promise<typeof waMessages.$inferSelect | null> {
  const [record] = await db.insert(waMessages).values(values).returning()
  return record ?? null
}

export async function POST(request: NextRequest): Promise<Response> {
  const payload = await request.json().catch(() => null)

  const parsed = inboundMessageSchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid webhook payload' }, { status: 400 })
  }

  const { from, text } = parsed.data
  const normalizedFrom = normalizePhoneNumber(from)
  if (!normalizedFrom) {
    return Response.json({ error: 'Invalid sender phone number' }, { status: 400 })
  }

  const sessionId = normalizedFrom.replace(/^\+/, '')

  try {
    const [previousMessage] = await db
      .select({ metadata: waMessages.metadata })
      .from(waMessages)
      .where(eq(waMessages.sessionId, sessionId))
      .orderBy(desc(waMessages.createdAt))
      .limit(1)

    const previousSop = extractSopMetadata(previousMessage?.metadata as RawMetadata)
    const command = detectSopCommand(text)

    const customer = await findCustomerByPhone(normalizedFrom)
    let ticket = await resolveTicketContext(customer?.id ?? null, previousSop, command)

    const now = new Date()

    let responseMode: 'workflow' | 'text' | 'none' = 'none'
    let responseStage: SopStage | null = null
    let responseText: string | null = null
    let nextTicketStatus: TicketStatus | null = ticket?.status ?? previousSop.ticketStatus ?? null
    const ticketIdForMetadata: string | null = ticket?.id ?? previousSop.ticketId ?? null

    switch (command) {
      case 'approve':
        if (!ticket) {
          responseMode = 'text'
          responseText = formatNoTicketMessage()
          responseStage = previousSop.stage
          break
        }

        if (ticket.status !== 'awaiting_approval') {
          const summary = formatTicketStatusSummary({
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
            customerName: customer?.name ?? ticket.customerName,
          })
          responseMode = 'workflow'
          responseStage = summary.stage
          responseText = summary.text
          nextTicketStatus = ticket.status
          break
        }

        await db
          .update(tickets)
          .set({ status: 'approved', updatedAt: now })
          .where(eq(tickets.id, ticket.id))

        ticket = { ...ticket, status: 'approved' }
        nextTicketStatus = 'approved'
        responseMode = 'workflow'
        responseStage = 'awaiting_approval'
        responseText = formatApprovalAcceptedMessage({
          ticketNumber: ticket.ticketNumber,
          customerName: customer?.name ?? ticket.customerName,
          estimatedCost: formatCurrency(ticket.estimatedCost),
        })
        break
      case 'reject':
        if (!ticket) {
          responseMode = 'text'
          responseText = formatNoTicketMessage()
          responseStage = previousSop.stage
          break
        }

        if (ticket.status !== 'awaiting_approval') {
          const summary = formatTicketStatusSummary({
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
            customerName: customer?.name ?? ticket.customerName,
          })
          responseMode = 'workflow'
          responseStage = summary.stage
          responseText = summary.text
          nextTicketStatus = ticket.status
          break
        }

        await db
          .update(tickets)
          .set({ status: 'rejected', updatedAt: now })
          .where(eq(tickets.id, ticket.id))

        ticket = { ...ticket, status: 'rejected' }
        nextTicketStatus = 'rejected'
        responseMode = 'workflow'
        responseStage = 'awaiting_approval'
        responseText = formatApprovalRejectedMessage({
          ticketNumber: ticket.ticketNumber,
          customerName: customer?.name ?? ticket.customerName,
        })
        break
      case 'status':
        if (!ticket) {
          responseMode = 'text'
          responseText = formatNoTicketMessage()
          responseStage = previousSop.stage
          break
        }

        {
          const summary = formatTicketStatusSummary({
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
            customerName: customer?.name ?? ticket.customerName,
          })
          responseMode = 'workflow'
          responseStage = summary.stage
          responseText = summary.text
          nextTicketStatus = ticket.status
        }
        break
      case 'invoice':
        if (!ticket) {
          responseMode = 'text'
          responseText = formatNoTicketMessage()
          responseStage = previousSop.stage
          break
        }

        {
          const invoice = formatInvoiceSummary({
            ticketNumber: ticket.ticketNumber,
            invoiceNumber: ticket.invoice?.number ?? null,
            invoiceTotal: formatCurrency(ticket.invoice?.total ?? null),
            invoiceStatus: ticket.invoice?.status ?? null,
          })
          responseMode = 'workflow'
          responseStage = invoice.stage
          responseText = invoice.text
          nextTicketStatus = ticket.status
        }
        break
      case 'pickup':
        if (!ticket) {
          responseMode = 'text'
          responseText = formatNoTicketMessage()
          responseStage = previousSop.stage
          break
        }

        {
          const pickup = formatPickupInstructions({
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
            customerName: customer?.name ?? ticket.customerName,
            invoiceStatus: ticket.invoice?.status ?? null,
            invoiceTotal: formatCurrency(ticket.invoice?.total ?? null),
          })
          responseMode = 'workflow'
          responseStage = pickup.stage
          responseText = pickup.text
          nextTicketStatus = ticket.status
        }
        break
      case 'support':
        responseMode = 'text'
        responseStage = ticket ? stageFromTicketStatus(ticket.status) : previousSop.stage
        responseText = formatSupportHandoffMessage(customer?.name ?? ticket?.customerName ?? null)
        nextTicketStatus = ticket?.status ?? nextTicketStatus
        break
      default:
        responseText = formatUnknownCommandMessage()
        if (ticket) {
          responseMode = 'workflow'
          responseStage = stageFromTicketStatus(ticket.status)
          nextTicketStatus = ticket.status
        } else {
          responseMode = 'text'
          responseStage = previousSop.stage
        }
        break
    }

    if (responseStage === null) {
      responseStage = ticket ? stageFromTicketStatus(nextTicketStatus ?? ticket.status) : previousSop.stage
    }

    const sessionStage = responseStage ?? previousSop.stage ?? null
    const sessionTicketStatus = nextTicketStatus ?? previousSop.ticketStatus ?? null
    const sessionTicketId = ticketIdForMetadata ?? ticket?.id ?? previousSop.ticketId ?? null

    const sessionState: SopMetadata = {
      stage: sessionStage,
      ticketId: sessionTicketId,
      lastCommand: command === 'unknown' ? previousSop.lastCommand : command,
      ticketStatus: sessionTicketStatus,
    }

    const inboundRecord = await insertWaMessage({
      sessionId,
      customerId: customer?.id ?? null,
      ticketId: sessionTicketId,
      direction: 'in',
      status: 'received',
      body: text,
      sentAt: now,
      metadata: {
        from,
        normalizedFrom,
        command,
        sop: sessionState,
      },
    })

    if (responseMode === 'workflow' && responseText && ticket && customer) {
      const stageToSend: SopStage = responseStage ?? stageFromTicketStatus(ticket.status)

      await sendTicketWorkflowWhatsAppMessage({
        customerId: customer.id,
        ticketId: ticket.id,
        phone: normalizedFrom,
        stage: stageToSend,
        text: responseText,
        metadata: {
          command,
          respondsTo: inboundRecord?.id ?? null,
          sop: sessionState,
        },
      })
    } else if (responseMode === 'text' && responseText) {
      try {
        await sendWhatsAppTextMessage({
          to: normalizedFrom,
          text: responseText,
          metadata: {
            sessionId,
            source: 'sop-automation',
            command,
            sop: sessionState,
            inboundMessageId: inboundRecord?.id ?? null,
          },
        })

        await insertWaMessage({
          sessionId,
          customerId: customer?.id ?? null,
          ticketId: sessionTicketId,
          direction: 'out',
          status: 'sent',
          body: responseText,
          sentAt: now,
          metadata: {
            normalizedFrom,
            respondsTo: inboundRecord?.id ?? null,
            command,
            sop: sessionState,
          },
        })
      } catch (error) {
        logger.error({ err: error }, 'Failed to send SOP reply')

        await insertWaMessage({
          sessionId,
          customerId: customer?.id ?? null,
          ticketId: sessionTicketId,
          direction: 'out',
          status: 'failed',
          body: responseText,
          sentAt: now,
          metadata: {
            normalizedFrom,
            respondsTo: inboundRecord?.id ?? null,
            command,
            sop: sessionState,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      }
    }

    return Response.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, 'Failed to process WhatsApp webhook')
    return Response.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
