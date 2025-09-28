import { db } from '@/db'
import { waMessages } from '@/db/schema'
import logger from '@/lib/logger'
import { ensureWhatsAppJid, normalizePhoneNumber, sendWhatsAppTextMessage } from '@/lib/wa'

export type TicketWorkflowStage =
  | 'intake_ack'
  | 'diagnosis_summary'
  | 'diagnosis_approval'
  | 'repair_update'
  | 'pickup_ready'
  | 'pickup_complete'

export interface TicketWorkflowMessage {
  customerId: string
  ticketId: string
  phone: string
  text: string
  stage: TicketWorkflowStage
  metadata?: Record<string, unknown>
}

export async function sendTicketWorkflowWhatsAppMessage(payload: TicketWorkflowMessage): Promise<void> {
  const normalized = normalizePhoneNumber(payload.phone)
  if (!normalized) {
    logger.warn({ customerId: payload.customerId }, 'Skipping WhatsApp send: invalid phone number')
    return
  }

  const jid = ensureWhatsAppJid(normalized)
  const sessionId = normalized.replace(/^\+/, '')
  const sentAt = new Date()

  const metadata = {
    stage: payload.stage,
    ticketId: payload.ticketId,
    ...payload.metadata,
  }

  try {
    await sendWhatsAppTextMessage({
      to: jid,
      text: payload.text,
      metadata,
    })

    await db.insert(waMessages).values({
      sessionId,
      customerId: payload.customerId,
      ticketId: payload.ticketId,
      direction: 'outbound',
      status: 'sent',
      body: payload.text,
      sentAt,
      metadata: {
        ...metadata,
        normalizedRecipient: normalized,
      },
    })
  } catch (error) {
    logger.warn({ err: error, ticketId: payload.ticketId }, 'Failed to send ticket workflow WhatsApp message')
    await db.insert(waMessages).values({
      sessionId,
      customerId: payload.customerId,
      ticketId: payload.ticketId,
      direction: 'outbound',
      status: 'failed',
      body: payload.text,
      sentAt,
      metadata: {
        ...metadata,
        normalizedRecipient: normalized,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}
