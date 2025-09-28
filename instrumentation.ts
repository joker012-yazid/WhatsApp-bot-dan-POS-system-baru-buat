import env from '@/env.mjs'
import { startTicketApprovalReminderCron } from '@/lib/scheduler'

export async function register(): Promise<void> {
  if (!env.ENABLE_TICKET_APPROVAL_REMINDERS) {
    return
  }

  startTicketApprovalReminderCron()
}
