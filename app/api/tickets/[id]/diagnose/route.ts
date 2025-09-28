import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { diagnostics, tickets } from '@/db/schema'
import logger from '@/lib/logger'
import { getTicketById } from '@/lib/tickets'
import { sendTicketWorkflowWhatsAppMessage } from '@/lib/wa-messaging'
import { toPgNumeric } from '@/lib/pos'

export const runtime = 'nodejs'

type DiagnosticInsert = typeof diagnostics.$inferInsert
type TicketInsert = typeof tickets.$inferInsert

const diagnosisSchema = z.object({
  summary: z.string().min(5, 'Diagnosis summary is required'),
  findings: z.string().optional(),
  recommendedActions: z.string().optional(),
  estimatedCost: z.number().nonnegative().optional(),
  technicianId: z.string().optional(),
  approved: z.boolean().optional(),
  approvedBy: z.string().optional(),
  approvalNotes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const ticketId = params.id
  const body = await request.json().catch(() => null)
  const parsed = diagnosisSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const ticket = await getTicketById(ticketId)
  if (!ticket) {
    return Response.json({ error: 'Ticket not found' }, { status: 404 })
  }

  const data = parsed.data
  const now = new Date()
  const nextStatus =
    data.approved === undefined ? 'awaiting_approval' : data.approved ? 'approved' : 'rejected'

  try {
    const diagnosticRecord = await db.transaction(async (tx) => {
      const insertValues: DiagnosticInsert = {
        ticketId,
        summary: data.summary,
        findings: data.findings,
        recommendedActions: data.recommendedActions,
        technicianId: data.technicianId,
        approved: data.approved ?? false,
        approvedBy: data.approved ? data.approvedBy ?? null : null,
        approvedAt: data.approved ? now : null,
      }

      if (data.estimatedCost !== undefined) {
        insertValues.estimatedCost = toPgNumeric(data.estimatedCost)
      }

      const [record] = await tx.insert(diagnostics).values(insertValues).returning()
      if (!record) {
        throw new Error('Failed to save diagnostic record')
      }

      const updateValues: Partial<TicketInsert> = {
        status: nextStatus,
        updatedAt: now,
      }

      if (data.estimatedCost !== undefined) {
        updateValues.estimatedCost = toPgNumeric(data.estimatedCost)
      }

      await tx.update(tickets).set(updateValues).where(eq(tickets.id, ticketId))

      return record
    })

    const currencyFormatter = new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    })

    const summaryParts = [
      `Ringkasan diagnosis untuk tiket #${ticket.ticketNumber}: ${data.summary}.`,
    ]

    if (data.estimatedCost !== undefined) {
      summaryParts.push(`Anggaran kos: ${currencyFormatter.format(data.estimatedCost)}.`)
    }

    if (data.recommendedActions) {
      summaryParts.push(`Cadangan tindakan: ${data.recommendedActions}.`)
    }

    await sendTicketWorkflowWhatsAppMessage({
      customerId: ticket.customer.id,
      ticketId,
      phone: ticket.customer.phone,
      stage: 'diagnosis_summary',
      text: summaryParts.join(' '),
      metadata: {
        diagnosticId: diagnosticRecord.id,
      },
    })

    if (data.approved !== undefined) {
      const approvalMessage = data.approved
        ? `Kerja pembaikan untuk tiket #${ticket.ticketNumber} telah diluluskan. Kami akan mulakan servis sebaik sahaja bahagian disediakan.`
        : `Pembaikan untuk tiket #${ticket.ticketNumber} ditolak mengikut permintaan anda. Hubungi kami jika mahu membuat perubahan.`

      await sendTicketWorkflowWhatsAppMessage({
        customerId: ticket.customer.id,
        ticketId,
        phone: ticket.customer.phone,
        stage: 'diagnosis_approval',
        text: data.approvalNotes ? `${approvalMessage} ${data.approvalNotes}` : approvalMessage,
        metadata: {
          approved: data.approved,
          diagnosticId: diagnosticRecord.id,
        },
      })
    }

    return Response.json({ diagnostic: diagnosticRecord, status: nextStatus })
  } catch (error) {
    logger.error({ err: error, ticketId }, 'Failed to record diagnosis')
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return Response.json({ error: message }, { status: 500 })
  }
}
