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

const optionalField = z
  .string()
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') {
      return undefined
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  })

const customerSchema = z.object({
  name: z.string().min(2, 'Nama pelanggan diperlukan').transform((value) => value.trim()),
  phone: z.string().min(6, 'Nombor telefon diperlukan').transform((value) => value.trim()),
  email: optionalField,
  company: optionalField,
  notes: optionalField,
})

const deviceSchema = z.object({
  brand: z.string().min(1, 'Jenama peranti diperlukan').transform((value) => value.trim()),
  model: z.string().min(1, 'Model peranti diperlukan').transform((value) => value.trim()),
  type: optionalField,
  serialNumber: optionalField,
  color: optionalField,
  securityCode: optionalField,
  accessories: optionalField,
})

const intakeSchema = z.object({
  customer: customerSchema,
  device: deviceSchema,
  problemDescription: z.string().min(10, 'Terangkan isu peranti'),
  estimatedCost: z.number().nonnegative().optional(),
  termsAccepted: z.boolean().refine((value) => value === true, 'Terma servis perlu dipersetujui'),
})

export async function POST(request: NextRequest): Promise<Response> {
  const payload = await request.json().catch(() => null)
  const parsed = intakeSchema.safeParse(payload)

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { customer: customerInput, device, problemDescription, estimatedCost, termsAccepted } = parsed.data

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
          termsAccepted: termsAccepted,
          deviceBrand: device.brand,
          deviceModel: device.model,
          deviceType: device.type ?? null,
          serialNumber: device.serialNumber ?? null,
          deviceColor: device.color ?? null,
          securityCode: device.securityCode ?? null,
          accessories: device.accessories ?? null,
          problemDescription,
          estimatedCost: estimatedCost !== undefined ? toPgNumeric(estimatedCost) : null,
          status: 'intake',
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
        intake: true,
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
