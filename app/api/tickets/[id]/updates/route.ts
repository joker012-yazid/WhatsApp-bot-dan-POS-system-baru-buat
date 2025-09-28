import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { ticketUpdates, tickets } from '@/db/schema'
import logger from '@/lib/logger'
import { getTicketById } from '@/lib/tickets'
import { sendTicketWorkflowWhatsAppMessage } from '@/lib/wa-messaging'
import { toPgNumeric } from '@/lib/pos'

export const runtime = 'nodejs'

type TicketUpdateInsert = typeof ticketUpdates.$inferInsert

type TicketInsert = typeof tickets.$inferInsert

const statusOptions = [
  'intake',
  'diagnosed',
  'awaiting_approval',
  'approved',
  'rejected',
  'repairing',
  'done',
  'picked_up',
] as const

type TicketStatus = (typeof statusOptions)[number]

const updateSchema = z.object({
  updateType: z.string().min(2, 'Update type is required'),
  description: z.string().min(4, 'Description is required'),
  imageUrl: z.string().url().optional(),
  status: z.enum(statusOptions).optional(),
  actualCost: z.number().nonnegative().optional(),
  updatedBy: z.string().optional(),
  notify: z.boolean().default(true),
})

function createStatusLabel(status: TicketStatus | undefined): string {
  switch (status) {
    case 'diagnosed':
      return 'Diagnosis sedang dijalankan'
    case 'awaiting_approval':
      return 'Menunggu kelulusan pelanggan'
    case 'approved':
      return 'Pembaikan diluluskan'
    case 'repairing':
      return 'Pembaikan sedang dilakukan'
    case 'done':
      return 'Sedia untuk diambil'
    case 'picked_up':
      return 'Telah diambil'
    case 'rejected':
      return 'Tiket ditolak'
    default:
      return 'Dalam giliran servis'
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const ticketId = params.id
  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const ticket = await getTicketById(ticketId)
  if (!ticket) {
    return Response.json({ error: 'Ticket not found' }, { status: 404 })
  }

  const data = parsed.data
  const now = new Date()

  try {
    const record = await db.transaction(async (tx) => {
      const insertValues: TicketUpdateInsert = {
        ticketId,
        updateType: data.updateType,
        description: data.description,
        imageUrl: data.imageUrl,
        updatedBy: data.updatedBy ?? ticket.createdBy ?? 'system',
      }

      const [saved] = await tx.insert(ticketUpdates).values(insertValues).returning()
      if (!saved) {
        throw new Error('Failed to create ticket update record')
      }

      const updateTicketValues: Partial<TicketInsert> = {
        updatedAt: now,
      }

      if (data.status) {
        updateTicketValues.status = data.status
      }

      if (data.actualCost !== undefined) {
        updateTicketValues.actualCost = toPgNumeric(data.actualCost)
      }

      await tx.update(tickets).set(updateTicketValues).where(eq(tickets.id, ticketId))

      return saved
    })

    if (data.notify) {
      const statusLabel = createStatusLabel(data.status)
      const messageParts = [`Status terkini tiket #${ticket.ticketNumber}: ${data.description}.`]
      if (data.status) {
        messageParts.push(`Status kini: ${statusLabel}.`)
      }

      await sendTicketWorkflowWhatsAppMessage({
        customerId: ticket.customer.id,
        ticketId,
        phone: ticket.customer.phone,
        stage: 'repair_update',
        text: messageParts.join(' '),
        metadata: {
          updateId: record.id,
          status: data.status ?? ticket.status,
        },
      })
    }

    return Response.json({ update: record })
  } catch (error) {
    logger.error({ err: error, ticketId }, 'Failed to create ticket update')
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return Response.json({ error: message }, { status: 500 })
  }
}
