import { db } from '@/db'
import { waMessages } from '@/db/schema'
import logger from '@/lib/logger'
import { ensureWhatsAppJid, normalizePhoneNumber, sendWhatsAppTextMessage } from '@/lib/wa'

export type TicketWorkflowStage =
  | 'intake_ack'
  | 'diagnosis_summary'
  | 'awaiting_approval'
  | 'diagnosis_approval'
  | 'repair_updates'
  | 'repair_update'
  | 'done_invoice'
  | 'pickup_ready'
  | 'pickup_complete'
  | 'review_reminder'

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

  const normalizedStage =
    payload.stage === 'diagnosis_approval'
      ? 'awaiting_approval'
      : payload.stage === 'repair_update'
        ? 'repair_updates'
        : payload.stage

  const existingSop =
    payload.metadata && typeof payload.metadata === 'object' && 'sop' in payload.metadata
      ? payload.metadata.sop
      : null

  const sopMetadata = {
    stage: normalizedStage,
    ticketId: payload.ticketId,
    ...(existingSop && typeof existingSop === 'object' ? existingSop : {}),
  }

  const metadata = {
    stage: payload.stage,
    ticketId: payload.ticketId,
    ...payload.metadata,
    sop: sopMetadata,
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
      direction: 'out',
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
      direction: 'out',
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
