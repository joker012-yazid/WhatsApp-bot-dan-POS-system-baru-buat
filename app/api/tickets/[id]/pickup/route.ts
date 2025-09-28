import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { invoices, tickets } from '@/db/schema'
import logger from '@/lib/logger'
import { getTicketById } from '@/lib/tickets'
import { sendTicketWorkflowWhatsAppMessage } from '@/lib/wa-messaging'

export const runtime = 'nodejs'

type TicketInsert = typeof tickets.$inferInsert
type InvoiceSelect = typeof invoices.$inferSelect

const pickupSchema = z.object({
  status: z.enum(['done', 'picked_up']).default('done'),
  message: z.string().optional(),
  invoiceId: z.string().uuid().optional(),
  paymentStatus: z.enum(['draft', 'sent', 'paid', 'void']).optional(),
  notify: z.boolean().default(true),
})

const currencyFormatter = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const ticketId = params.id
  const body = await request.json().catch(() => null)
  const parsed = pickupSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const ticket = await getTicketById(ticketId)
  if (!ticket) {
    return Response.json({ error: 'Ticket not found' }, { status: 404 })
  }

  const data = parsed.data
  const now = new Date()
  const stage = data.status === 'picked_up' ? 'pickup_complete' : 'pickup_ready'

  try {
    let invoiceRecord: InvoiceSelect | null = null

    await db.transaction(async (tx) => {
      const updateTicketValues: Partial<TicketInsert> = {
        status: data.status,
        updatedAt: now,
      }

      await tx.update(tickets).set(updateTicketValues).where(eq(tickets.id, ticketId))

      if (data.invoiceId) {
        const [invoice] = await tx
          .select()
          .from(invoices)
          .where(eq(invoices.id, data.invoiceId))
          .limit(1)

        if (invoice) {
          if (invoice.ticketId && invoice.ticketId !== ticketId) {
            throw new Error('Invoice does not belong to ticket')
          }

          const nextInvoiceStatus = data.paymentStatus ?? (data.status === 'picked_up' ? 'paid' : 'sent')

          await tx
            .update(invoices)
            .set({
              status: nextInvoiceStatus,
              updatedAt: now,
            })
            .where(eq(invoices.id, invoice.id))

          invoiceRecord = { ...invoice, status: nextInvoiceStatus }
        }
      }
    })

    if (data.notify) {
      const deviceLabel = [ticket.deviceBrand, ticket.deviceModel].filter(Boolean).join(' ')
      const defaultReadyMessage = `Peranti ${deviceLabel || 'anda'} kini sedia untuk diambil di kedai kami. Sila tunjukkan tiket #${ticket.ticketNumber} semasa pengambilan.`
      const defaultPickupMessage = `Terima kasih ${ticket.customer.name}! Pembaikan untuk tiket #${ticket.ticketNumber} selesai dan telah diambil. Jumpa lagi.`
      const baseMessage = data.message ?? (data.status === 'picked_up' ? defaultPickupMessage : defaultReadyMessage)

      const details: string[] = []
      if (invoiceRecord) {
        const total = Number(invoiceRecord.total ?? 0)
        const formattedTotal = Number.isFinite(total) ? currencyFormatter.format(total) : undefined
        if (formattedTotal) {
          details.push(`Jumlah invois ${invoiceRecord.number}: ${formattedTotal}.`)
        }

        details.push(`Status invois: ${invoiceRecord.status}.`)
      }

      await sendTicketWorkflowWhatsAppMessage({
        customerId: ticket.customer.id,
        ticketId,
        phone: ticket.customer.phone,
        stage,
        text: details.length > 0 ? `${baseMessage} ${details.join(' ')}` : baseMessage,
        metadata: {
          invoiceId: invoiceRecord?.id ?? data.invoiceId ?? null,
          invoiceStatus: invoiceRecord?.status ?? null,
        },
      })
    }

    return Response.json({ status: data.status })
  } catch (error) {
    logger.error({ err: error, ticketId }, 'Failed to process pickup update')
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return Response.json({ error: message }, { status: 500 })
  }
}
