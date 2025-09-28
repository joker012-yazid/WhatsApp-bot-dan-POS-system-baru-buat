import 'server-only'

import cron, { ScheduledTask } from 'node-cron'
import { differenceInCalendarDays, subDays } from 'date-fns'
import { and, eq, inArray, lte, sql } from 'drizzle-orm'

import { db } from '@/db'
import { customers, reminderLog, tickets, waMessages } from '@/db/schema'
import env from '@/env.mjs'
import logger from '@/lib/logger'
import type { TicketWorkflowStage } from '@/lib/wa-messaging'
import { normalizePhoneNumber } from '@/lib/wa'

const REMINDER_CONTEXT = 'ticket_awaiting_approval'
const REMINDER_STAGE: TicketWorkflowStage = 'diagnosis_approval'

const REMINDER_BUCKETS = [
  { days: 1 },
  { days: 20 },
  { days: 30 },
] as const

type ReminderBucket = (typeof REMINDER_BUCKETS)[number]

type AwaitingTicket = {
  ticketId: string
  ticketNumber: string
  customerId: string
  customerName: string | null
  customerPhone: string
  createdAt: Date
}

let cronTask: ScheduledTask | null = null
let cronStarted = false
let jobRunning = false

function buildReminderMessage(ticket: AwaitingTicket, bucket: ReminderBucket, ageInDays: number): string {
  const name = ticket.customerName?.trim() || 'there'
  const ticketLabel = ticket.ticketNumber
  const dayLabel = bucket.days === 1 ? '1 day' : `${bucket.days} days`

  if (bucket.days === 1) {
    return `Hi ${name}, thanks for your patience. Ticket ${ticketLabel} has been awaiting your approval for 1 day. Please review and approve the estimate so we can continue with the repair. Reply to this message if you need any help.`
  }

  if (bucket.days === 20) {
    return `Hello ${name}, ticket ${ticketLabel} is still awaiting approval after ${dayLabel}. We are ready to proceed once you approve the work. Let us know if you have any questions about the estimate.`
  }

  return `Hi ${name}, this is a final reminder that ticket ${ticketLabel} has been awaiting approval for ${ageInDays} days. Please approve the repair or contact us if you would like to make changes. We would love to get your device fixed as soon as possible.`
}

function selectDueBucket(ageInDays: number, loggedThresholds: Set<number>): ReminderBucket | null {
  const dueBuckets = REMINDER_BUCKETS.filter(
    (bucket) => ageInDays >= bucket.days && !loggedThresholds.has(bucket.days),
  )

  if (!dueBuckets.length) {
    return null
  }

  return dueBuckets[dueBuckets.length - 1]
}

async function runTicketApprovalReminderJob(): Promise<void> {
  if (jobRunning) {
    logger.warn('Skipping ticket approval reminder job because the previous run is still in progress')
    return
  }

  if (!env.ENABLE_TICKET_APPROVAL_REMINDERS) {
    logger.debug('Ticket approval reminder job is disabled')
    return
  }

  jobRunning = true

  try {
    const now = new Date()
    const awaitingStatus = env.TICKET_AWAITING_APPROVAL_STATUS as typeof tickets.$inferSelect.status
    const oldestCreatedAt = subDays(now, REMINDER_BUCKETS[0].days)

    const awaitingTickets = await db
      .select({
        ticketId: tickets.id,
        ticketNumber: tickets.ticketNumber,
        customerId: tickets.customerId,
        customerName: customers.name,
        customerPhone: customers.phone,
        createdAt: tickets.createdAt,
      })
      .from(tickets)
      .innerJoin(customers, eq(customers.id, tickets.customerId))
      .where(and(eq(tickets.status, awaitingStatus), lte(tickets.createdAt, oldestCreatedAt)))

    if (!awaitingTickets.length) {
      logger.debug('No tickets awaiting approval found for reminder job')
      return
    }

    const ticketIds = awaitingTickets.map((ticket) => ticket.ticketId)

    const existingLogs = ticketIds.length
      ? await db
          .select({
            ticketId: reminderLog.ticketId,
            metadata: reminderLog.metadata,
          })
          .from(reminderLog)
          .where(
            and(
              inArray(reminderLog.ticketId, ticketIds),
              eq(reminderLog.kind, 'custom'),
              sql`(reminder_log.metadata ->> 'context') = ${REMINDER_CONTEXT}`,
            ),
          )
      : []

    const sentThresholds = new Map<string, Set<number>>()
    for (const log of existingLogs) {
      if (!log.ticketId) {
        continue
      }

      const metadata = (log.metadata ?? {}) as Record<string, unknown>
      if (metadata?.context !== REMINDER_CONTEXT) {
        continue
      }

      const thresholdValue = Number(metadata.thresholdDays)
      if (!Number.isFinite(thresholdValue)) {
        continue
      }

      const thresholds = sentThresholds.get(log.ticketId) ?? new Set<number>()
      thresholds.add(thresholdValue)
      sentThresholds.set(log.ticketId, thresholds)
    }

    for (const ticket of awaitingTickets) {
      const logged = sentThresholds.get(ticket.ticketId) ?? new Set<number>()
      const ageInDays = differenceInCalendarDays(now, ticket.createdAt)
      const bucket = selectDueBucket(ageInDays, logged)

      if (!bucket) {
        continue
      }

      const normalizedPhone = normalizePhoneNumber(ticket.customerPhone)
      if (!normalizedPhone) {
        logger.warn({ ticketId: ticket.ticketId }, 'Skipping reminder job entry because phone number is invalid')
        continue
      }

      const sessionId = normalizedPhone.replace(/^\+/, '')
      const message = buildReminderMessage(ticket, bucket, ageInDays)

      const metadata = {
        stage: REMINDER_STAGE,
        context: REMINDER_CONTEXT,
        thresholdDays: bucket.days,
        ageInDays,
        normalizedRecipient: normalizedPhone,
        ticketNumber: ticket.ticketNumber,
      }

      try {
        const [queuedMessage] = await db
          .insert(waMessages)
          .values({
            sessionId,
            customerId: ticket.customerId,
            ticketId: ticket.ticketId,
            direction: 'outbound',
            status: 'pending',
            body: message,
            metadata,
          })
          .returning({ id: waMessages.id })

        await db.insert(reminderLog).values({
          ticketId: ticket.ticketId,
          waMessageId: queuedMessage?.id,
          kind: 'custom',
          sentAt: now,
          metadata,
        })

        logged.add(bucket.days)
        sentThresholds.set(ticket.ticketId, logged)

        logger.info(
          {
            ticketId: ticket.ticketId,
            thresholdDays: bucket.days,
            waMessageId: queuedMessage?.id,
          },
          'Queued awaiting approval WhatsApp reminder',
        )
      } catch (error) {
        logger.error({ err: error, ticketId: ticket.ticketId }, 'Failed to queue awaiting approval reminder')
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Ticket approval reminder job failed')
  } finally {
    jobRunning = false
  }
}

export function startTicketApprovalReminderCron(): void {
  if (cronStarted) {
    return
  }

  if (!env.ENABLE_TICKET_APPROVAL_REMINDERS) {
    logger.info('Ticket approval reminder cron is disabled via configuration')
    cronStarted = true
    return
  }

  const scheduleExpression = env.TICKET_APPROVAL_REMINDER_CRON

  cronTask = cron.schedule(
    scheduleExpression,
    () => {
      void runTicketApprovalReminderJob()
    },
    {
      runOnInit: true,
    },
  )

  cronStarted = true
  logger.info({ schedule: scheduleExpression }, 'Ticket approval reminder cron started')
}

export function stopTicketApprovalReminderCron(): void {
  if (cronTask) {
    cronTask.stop()
    cronTask = null
    cronStarted = false
  }
}
