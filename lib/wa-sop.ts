import { z } from 'zod'

export const SOP_STAGE_VALUES = [
  'intake_ack',
  'diagnosis_summary',
  'awaiting_approval',
  'repair_updates',
  'done_invoice',
  'pickup_ready',
  'pickup_complete',
  'review_reminder',
] as const

const SOP_STAGE_ALIASES = ['diagnosis_approval', 'repair_update'] as const

export type SopStage = (typeof SOP_STAGE_VALUES)[number]

export const TICKET_STATUS_VALUES = [
  'intake',
  'diagnosed',
  'awaiting_approval',
  'approved',
  'rejected',
  'repairing',
  'done',
  'picked_up',
] as const

export type TicketStatus = (typeof TICKET_STATUS_VALUES)[number]

const SOP_COMMAND_VALUES = ['status', 'invoice', 'pickup', 'support', 'approve', 'reject'] as const

export type SopCommand = (typeof SOP_COMMAND_VALUES)[number] | 'unknown'

export interface SopMetadata {
  stage: SopStage | null
  ticketId: string | null
  lastCommand: SopCommand | null
  ticketStatus: TicketStatus | null
}

export const SOP_METADATA_SCHEMA = z.object({
  stage: z.enum([...SOP_STAGE_VALUES, ...SOP_STAGE_ALIASES]).nullable().optional(),
  ticketId: z.string().uuid().nullable().optional(),
  lastCommand: z.enum(SOP_COMMAND_VALUES).nullable().optional(),
  ticketStatus: z.enum(TICKET_STATUS_VALUES).nullable().optional(),
})

function normalizeStage(value: string | null | undefined): SopStage | null {
  if (!value) {
    return null
  }

  if ((SOP_STAGE_VALUES as readonly string[]).includes(value as SopStage)) {
    return value as SopStage
  }

  if (value === 'diagnosis_approval') {
    return 'awaiting_approval'
  }

  if (value === 'repair_update') {
    return 'repair_updates'
  }

  return null
}

function normalizeTicketStatus(value: string | null | undefined): TicketStatus | null {
  if (!value) {
    return null
  }

  return (TICKET_STATUS_VALUES as readonly string[]).includes(value as TicketStatus)
    ? (value as TicketStatus)
    : null
}

function normalizeCommand(value: string | null | undefined): SopCommand | null {
  if (!value) {
    return null
  }

  return (SOP_COMMAND_VALUES as readonly string[]).includes(value as SopCommand)
    ? (value as SopCommand)
    : null
}

export function coerceSopMetadata(value: unknown): SopMetadata {
  const base: SopMetadata = {
    stage: null,
    ticketId: null,
    lastCommand: null,
    ticketStatus: null,
  }

  if (!value || typeof value !== 'object') {
    return base
  }

  const container = 'sop' in (value as Record<string, unknown>) ? (value as Record<string, unknown>).sop : value
  const parsed = SOP_METADATA_SCHEMA.safeParse(container)

  if (!parsed.success) {
    return base
  }

  return {
    stage: normalizeStage(parsed.data.stage ?? null),
    ticketId: parsed.data.ticketId ?? null,
    lastCommand: normalizeCommand(parsed.data.lastCommand ?? null),
    ticketStatus: normalizeTicketStatus(parsed.data.ticketStatus ?? null),
  }
}

const APPROVE_REGEX = /(setuju|approve|lulus|ya|yes|ok)(?!\w)/i
const REJECT_REGEX = /(tak\s*setuju|tidak\s*setuju|tolak|reject|no)(?!\w)/i
const STATUS_REGEX = /(^|\b)(1|status|progress|kemajuan|update)(\b|$)/i
const INVOICE_REGEX = /(^|\b)(2|invoice|invois|resit|bill|bayar|bayaran|payment)(\b|$)/i
const PICKUP_REGEX = /(^|\b)(3|pickup|ambik|ambil|collect|pengambilan)(\b|$)/i
const SUPPORT_REGEX = /(^|\b)(4|staf|staff|manusia|agent|bantuan|tolong|hubungi)(\b|$)/i

export function detectSopCommand(message: string): SopCommand {
  const normalized = message?.trim().toLowerCase() ?? ''
  if (!normalized) {
    return 'unknown'
  }

  if (REJECT_REGEX.test(normalized)) {
    return 'reject'
  }

  if (APPROVE_REGEX.test(normalized)) {
    return 'approve'
  }

  if (PICKUP_REGEX.test(normalized)) {
    return 'pickup'
  }

  if (INVOICE_REGEX.test(normalized)) {
    return 'invoice'
  }

  if (STATUS_REGEX.test(normalized)) {
    return 'status'
  }

  if (SUPPORT_REGEX.test(normalized)) {
    return 'support'
  }

  return 'unknown'
}

const MENU_FOOTER =
  '📲 Pilihan pantas: balas 1 = Status semasa, 2 = Salinan invois, 3 = Arahan pickup. Untuk kelulusan, balas "setuju" atau "tak setuju". Perlu bantuan manusia? Balas 4.'

export function formatMenuFooter(): string {
  return MENU_FOOTER
}

const currencyFormatter = new Intl.NumberFormat('ms-MY', {
  style: 'currency',
  currency: 'MYR',
})

export function formatCurrency(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    return null
  }

  return currencyFormatter.format(numeric)
}

export interface TicketStatusSummaryContext {
  ticketNumber: string
  status: TicketStatus
  customerName?: string | null
}

export interface TicketStatusSummaryResult {
  stage: SopStage
  text: string
}

export function formatTicketStatusSummary(context: TicketStatusSummaryContext): TicketStatusSummaryResult {
  const ticketLabel = `tiket #${context.ticketNumber}`
  const name = context.customerName?.trim()
  const greeting = name ? `${name}, ` : ''

  let stage: SopStage = 'intake_ack'
  let message: string

  switch (context.status) {
    case 'intake':
      stage = 'intake_ack'
      message = `${greeting}${ticketLabel} telah diterima dan kami sedang menjadualkan diagnosis awal.`
      break
    case 'diagnosed':
      stage = 'diagnosis_summary'
      message = `${greeting}pasukan teknikal kami sedang menyiapkan ringkasan diagnosis untuk ${ticketLabel}. Anda akan menerima butiran sekejap lagi.`
      break
    case 'awaiting_approval':
      stage = 'awaiting_approval'
      message = `${greeting}kami sedang menunggu kelulusan anda untuk ${ticketLabel}. Balas "setuju" untuk teruskan atau "tak setuju" jika mahu menangguhkan.`
      break
    case 'approved':
      stage = 'repair_updates'
      message = `${greeting}kelulusan bagi ${ticketLabel} diterima. Kami sedang menempah alat ganti dan akan berkongsi kemas kini pembaikan.`
      break
    case 'repairing':
      stage = 'repair_updates'
      message = `${greeting}pembaikan untuk ${ticketLabel} sedang dijalankan. Kami akan maklumkan sebarang kemajuan penting.`
      break
    case 'done':
      stage = 'done_invoice'
      message = `${greeting}${ticketLabel} telah siap dan invois tersedia untuk semakan. Balas 3 jika anda perlukan arahan pengambilan.`
      break
    case 'picked_up':
      stage = 'pickup_complete'
      message = `${greeting}${ticketLabel} telah diambil. Terima kasih kerana mempercayai kami! Kongsikan maklum balas anda bila-bila masa.`
      break
    case 'rejected':
      stage = 'awaiting_approval'
      message = `${greeting}permintaan pembaikan untuk ${ticketLabel} telah dihentikan mengikut arahan anda. Hubungi kami jika mahu membuat perubahan.`
      break
    default:
      stage = 'repair_updates'
      message = `${greeting}kami sedang menyemak status ${ticketLabel}.`
      break
  }

  return {
    stage,
    text: `${message} ${formatMenuFooter()}`.trim(),
  }
}

export interface ApprovalMessageContext {
  ticketNumber: string
  customerName?: string | null
  estimatedCost?: string | null
}

export function formatApprovalAcceptedMessage(context: ApprovalMessageContext): string {
  const name = context.customerName?.trim()
  const greeting = name ? `Terima kasih ${name}!` : 'Terima kasih!'
  const costPart = context.estimatedCost ? ` Anggaran kos kekal pada ${context.estimatedCost}.` : ''

  return `${greeting} Kelulusan anda untuk tiket #${context.ticketNumber} telah direkodkan. Pasukan kami akan mula pembaikan serta berkongsi kemas kini penting melalui WhatsApp.${costPart} ${formatMenuFooter()}`.trim()
}

export interface RejectionMessageContext {
  ticketNumber: string
  customerName?: string | null
}

export function formatApprovalRejectedMessage(context: RejectionMessageContext): string {
  const name = context.customerName?.trim()
  const prefix = name ? `Baik ${name},` : 'Baik,'

  return `${prefix} kami hentikan pembaikan untuk tiket #${context.ticketNumber} seperti permintaan anda. Hubungi kami bila-bila masa jika mahu menukar keputusan. ${formatMenuFooter()}`.trim()
}

export interface InvoiceSummaryContext {
  ticketNumber: string
  invoiceNumber?: string | null
  invoiceTotal?: string | null
  invoiceStatus?: string | null
}

export interface InvoiceSummaryResult {
  stage: SopStage
  text: string
}

export function formatInvoiceSummary(context: InvoiceSummaryContext): InvoiceSummaryResult {
  if (!context.invoiceNumber) {
    return {
      stage: 'done_invoice',
      text: `Invois untuk tiket #${context.ticketNumber} belum tersedia lagi. Kami akan maklumkan sebaik sahaja ia siap. ${formatMenuFooter()}`.trim(),
    }
  }

  const parts = [`Invois #${context.invoiceNumber} untuk tiket #${context.ticketNumber} sudah tersedia.`]
  if (context.invoiceTotal) {
    parts.push(`Jumlah perlu dibayar: ${context.invoiceTotal}.`)
  }
  if (context.invoiceStatus) {
    parts.push(`Status bayaran terkini: ${context.invoiceStatus}.`)
  }

  return {
    stage: 'done_invoice',
    text: `${parts.join(' ')} ${formatMenuFooter()}`.trim(),
  }
}

export interface PickupInstructionsContext {
  ticketNumber: string
  status: TicketStatus
  customerName?: string | null
  invoiceStatus?: string | null
  invoiceTotal?: string | null
}

export interface PickupInstructionsResult {
  stage: SopStage
  text: string
}

export function formatPickupInstructions(context: PickupInstructionsContext): PickupInstructionsResult {
  const name = context.customerName?.trim()
  const greeting = name ? `${name}, ` : ''
  const ticketLabel = `tiket #${context.ticketNumber}`

  if (context.status === 'done') {
    const invoicePart = context.invoiceTotal
      ? ` Jumlah invois: ${context.invoiceTotal}${context.invoiceStatus ? ` (${context.invoiceStatus})` : ''}.`
      : ''

    return {
      stage: 'pickup_ready',
      text: `${greeting}peranti untuk ${ticketLabel} sedia untuk diambil di kaunter kami. Bawa tiket ini semasa pengambilan.${invoicePart} ${formatMenuFooter()}`.trim(),
    }
  }

  if (context.status === 'picked_up') {
    return {
      stage: 'pickup_complete',
      text: `${greeting}terima kasih kerana mengambil semula peranti bagi ${ticketLabel}. Kami hargai jika anda boleh tinggalkan review apabila ada masa. ${formatMenuFooter()}`.trim(),
    }
  }

  if (context.status === 'awaiting_approval') {
    return {
      stage: 'awaiting_approval',
      text: `${greeting}kami masih menunggu kelulusan anda untuk ${ticketLabel}. Balas "setuju" untuk kami teruskan atau "tak setuju" jika mahu menangguhkan. ${formatMenuFooter()}`.trim(),
    }
  }

  if (context.status === 'rejected') {
    return {
      stage: 'awaiting_approval',
      text: `${greeting}pembaikan untuk ${ticketLabel} telah dihentikan mengikut arahan anda. Hubungi kami jika mahu mengaktifkan semula tiket. ${formatMenuFooter()}`.trim(),
    }
  }

  const progressLabel =
    context.status === 'repairing'
      ? 'sedang dibaiki'
      : context.status === 'approved'
        ? 'dijadualkan untuk dibaiki'
        : 'sedang diproses'

  return {
    stage: 'repair_updates',
    text: `${greeting}peranti untuk ${ticketLabel} belum sedia untuk pickup lagi — statusnya ${progressLabel}. Kami akan maklumkan sebaik sahaja siap. ${formatMenuFooter()}`.trim(),
  }
}

export function formatSupportHandoffMessage(customerName?: string | null): string {
  const name = customerName?.trim()
  const prefix = name ? `Baik ${name},` : 'Baik,'

  return `${prefix} kami akan maklumkan staf kami untuk menghubungi anda secepat mungkin. ${formatMenuFooter()}`.trim()
}

export function formatNoTicketMessage(): string {
  return 'Maaf, kami tidak menemui tiket aktif yang berkait dengan nombor ini. Sila hubungi kaunter kami untuk bantuan lanjut.'
}

export function formatUnknownCommandMessage(): string {
  return `Maaf, kami tidak pasti permintaan anda. ${formatMenuFooter()}`.trim()
}

export function stageFromTicketStatus(status: TicketStatus | null | undefined): SopStage {
  switch (status) {
    case 'intake':
      return 'intake_ack'
    case 'diagnosed':
      return 'diagnosis_summary'
    case 'awaiting_approval':
    case 'rejected':
      return 'awaiting_approval'
    case 'approved':
    case 'repairing':
      return 'repair_updates'
    case 'done':
      return 'done_invoice'
    case 'picked_up':
      return 'pickup_complete'
    default:
      return 'repair_updates'
  }
}
