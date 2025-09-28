import { startTicketApprovalReminderCron } from '@/lib/scheduler'

export async function register(): Promise<void> {
  startTicketApprovalReminderCron()
}
