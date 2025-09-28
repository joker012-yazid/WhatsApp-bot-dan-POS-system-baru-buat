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

type WhatsAppMessageRecord = typeof waMessages.$inferSelect
type WhatsAppMessageStatus = WhatsAppMessageRecord['status']

const VALID_MESSAGE_STATUSES: readonly WhatsAppMessageStatus[] = [
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
  'received',
  'deleted',
]

function isValidMessageStatus(value: unknown): value is WhatsAppMessageStatus {
  return typeof value === 'string' && (VALID_MESSAGE_STATUSES as readonly string[]).includes(value)
}

export async function sendTicketWorkflowWhatsAppMessage(
  payload: TicketWorkflowMessage,
): Promise<WhatsAppMessageRecord | null> {
  const normalized = normalizePhoneNumber(payload.phone)
  if (!normalized) {
    logger.warn({ customerId: payload.customerId }, 'Skipping WhatsApp send: invalid phone number')
    return null
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
    const sendResult = await sendWhatsAppTextMessage({
      to: jid,
      text: payload.text,
      metadata,
    })

    const status = isValidMessageStatus(sendResult?.status) ? sendResult?.status : 'sent'
    const [record] = await db
      .insert(waMessages)
      .values({
        sessionId,
        customerId: payload.customerId,
        ticketId: payload.ticketId,
        direction: 'out',
        status,
        body: payload.text,
        sentAt,
        messageId: sendResult?.messageId ?? null,
        metadata: {
          ...metadata,
          normalizedRecipient: normalized,
        },
      })
      .returning()

    return record ?? null
  } catch (error) {
    logger.warn({ err: error, ticketId: payload.ticketId }, 'Failed to send ticket workflow WhatsApp message')
    const [record] = await db
      .insert(waMessages)
      .values({
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
      .returning()

    return record ?? null
  }
}
