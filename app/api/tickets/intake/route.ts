import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { customers, tickets } from '@/db/schema'
import logger from '@/lib/logger'
import { generateTicketNumber } from '@/lib/tickets'
import { sendTicketWorkflowWhatsAppMessage } from '@/lib/wa-messaging'
import { toPgNumeric } from '@/lib/pos'

export const runtime = 'nodejs'

const customerSchema = z.object({
  name: z.string().min(2, 'Nama pelanggan diperlukan'),
  phone: z.string().min(6, 'Nombor telefon diperlukan'),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  company: z.string().optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().optional(),
})

const deviceSchema = z.object({
  type: z.string().min(1, 'Jenis peranti diperlukan'),
  model: z.string().min(1, 'Model peranti diperlukan'),
  serialNumber: z.string().optional().or(z.literal('').transform(() => undefined)),
})

const intakeSchema = z.object({
  customer: customerSchema,
  device: deviceSchema,
  problemDescription: z.string().min(10, 'Terangkan isu peranti'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  estimatedCost: z.number().nonnegative().optional(),
})

export async function POST(request: NextRequest): Promise<Response> {
  const payload = await request.json().catch(() => null)
  const parsed = intakeSchema.safeParse(payload)

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { customer: customerInput, device, problemDescription, priority, estimatedCost } = parsed.data

  try {
    const ticket = await db.transaction(async (tx) => {
      const existingCustomer = await tx
        .select()
        .from(customers)
        .where(eq(customers.phone, customerInput.phone))
        .limit(1)
        .then((rows) => rows[0])

      const now = new Date()
      const customerRecord = existingCustomer
        ? (
            await tx
              .update(customers)
              .set({
                name: customerInput.name,
                email: customerInput.email ?? existingCustomer.email,
                company: customerInput.company ?? existingCustomer.company,
                notes: customerInput.notes ?? existingCustomer.notes,
                updatedAt: now,
              })
              .where(eq(customers.id, existingCustomer.id))
              .returning()
          )[0]
        : (
            await tx
              .insert(customers)
              .values({
                name: customerInput.name,
                phone: customerInput.phone,
                email: customerInput.email,
                company: customerInput.company,
                notes: customerInput.notes,
                createdAt: now,
                updatedAt: now,
              })
              .returning()
          )[0]

      if (!customerRecord) {
        throw new Error('Failed to persist customer record')
      }

      const ticketNumber = generateTicketNumber()

      const [ticketRow] = await tx
        .insert(tickets)
        .values({
          customerId: customerRecord.id,
          ticketNumber,
          deviceType: device.type,
          deviceModel: device.model,
          serialNumber: device.serialNumber ?? null,
          problemDescription,
          priority,
          estimatedCost: estimatedCost !== undefined ? toPgNumeric(estimatedCost) : null,
          status: 'pending',
        })
        .returning()

      if (!ticketRow) {
        throw new Error('Failed to create ticket record')
      }

      return {
        ...ticketRow,
        customer: customerRecord,
      }
    })

    await sendTicketWorkflowWhatsAppMessage({
      customerId: ticket.customer.id,
      ticketId: ticket.id,
      phone: ticket.customer.phone,
      stage: 'intake_ack',
      text: `Terima kasih ${ticket.customer.name}! Tiket servis #${ticket.ticketNumber} telah diterima. Kami akan jalankan diagnosis dan hubungi anda untuk langkah seterusnya.`,
      metadata: {
        priority,
      },
    })

    return Response.json(
      {
        ticket: {
          ...ticket,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    logger.error({ err: error }, 'Failed to process intake ticket')
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return Response.json({ error: message }, { status: 500 })
  }
}
