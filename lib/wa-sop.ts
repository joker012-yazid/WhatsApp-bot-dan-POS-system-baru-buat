import { z } from 'zod';

export type SopState =
  | 'new'
  | 'awaiting_intent'
  | 'awaiting_reference'
  | 'completed';

export type SopIntent = 'status' | 'quotation' | 'invoice' | 'handoff';

export interface SopMetadata {
  state: SopState;
  intent?: SopIntent | null;
  reference?: string | null;
}

export const SOP_METADATA_SCHEMA = z
  .object({
    state: z.enum(['new', 'awaiting_intent', 'awaiting_reference', 'completed']).default('new'),
    intent: z.enum(['status', 'quotation', 'invoice', 'handoff']).optional().nullable(),
    reference: z.string().optional().nullable(),
  })
  .partial({ intent: true, reference: true });

const WELCOME_MESSAGE = [
  'Hai! 👋 Selamat datang ke WhatsApp POS System kami.',
  'Bagaimana kami boleh bantu anda hari ini?',
  '',
  'Balas dengan pilihan berikut:',
  '1 - Semak status pembaikan',
  '2 - Minta salinan quotation',
  '3 - Minta salinan invois',
  '4 - Bercakap dengan staf kami',
].join('\n');

const UNKNOWN_INTENT_MESSAGE = [
  'Maaf, kami tidak pasti permintaan anda.',
  'Sila balas dengan nombor pilihan yang sesuai (1-4) atau jelaskan sama ada anda perlukan status, quotation, invois, atau ingin bercakap dengan staf.',
].join(' ');

const HANDOFF_MESSAGE =
  'Baik, kami akan maklumkan pasukan sokongan kami untuk hubungi anda secepat mungkin. Terima kasih atas kesabaran anda!';

const referencePrompts: Record<Exclude<SopIntent, 'handoff'>, string> = {
  status: 'Baik! Untuk semak status, sila berikan nombor tiket atau nombor telefon yang digunakan semasa check-in.',
  quotation: 'Baik! Untuk semak quotation, sila berikan nombor tiket, nombor quotation, atau nombor telefon pelanggan.',
  invoice: 'Baik! Untuk semak invois, sila berikan nombor invois atau nombor telefon pelanggan.',
};

const referenceFollowups: Record<Exclude<SopIntent, 'handoff'>, string> = {
  status: 'Kami perlukan nombor tiket atau nombor telefon untuk semak status. Sila cuba berikan rujukan yang sah.',
  quotation: 'Untuk bantu dengan quotation, kami perlukan nombor rujukan seperti nombor tiket, quotation atau nombor telefon.',
  invoice: 'Untuk cari invois yang betul, kami perlukan nombor invois atau nombor telefon pelanggan. Boleh cuba sekali lagi?',
};

function detectIntent(message: string): SopIntent | null {
  const normalized = message.toLowerCase();

  if (/(^|\s)(1|status|progress|baik pulih|repair|pembaikan)(\s|$)/.test(normalized)) {
    return 'status';
  }
  if (/(^|\s)(2|quote|quotation|sebutharga|sebut harga)(\s|$)/.test(normalized)) {
    return 'quotation';
  }
  if (/(^|\s)(3|invoice|invois|bill|bayar|bayaran|payment)(\s|$)/.test(normalized)) {
    return 'invoice';
  }
  if (/(^|\s)(4|manusia|human|agent|staf|staff|pegawai|hubungi)(\s|$)/.test(normalized)) {
    return 'handoff';
  }

  return null;
}

function sanitizeReference(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  const condensed = trimmed.replace(/\s+/g, ' ');
  if (condensed.length < 3) {
    return null;
  }

  return condensed;
}

function acknowledgement(intent: Exclude<SopIntent, 'handoff'>, reference: string): string {
  switch (intent) {
    case 'status':
      return `Terima kasih! Kami akan semak status untuk rujukan "${reference}" dan hubungi anda semula dalam masa terdekat.`;
    case 'quotation':
      return `Terima kasih! Kami akan semak quotation untuk rujukan "${reference}" dan maklumkan anda secepat mungkin.`;
    case 'invoice':
      return `Terima kasih! Kami akan semak invois untuk rujukan "${reference}" dan kembali kepada anda sebentar lagi.`;
    default:
      return 'Terima kasih! Kami akan menyemak maklumat tersebut segera.';
  }
}

export interface SopTransitionInput {
  previousState: SopState;
  previousIntent?: SopIntent | null;
  inboundText: string;
}

export interface SopTransitionResult {
  reply: string;
  nextState: SopState;
  intent?: SopIntent | null;
  reference?: string | null;
}

export function evaluateSopTransition(input: SopTransitionInput): SopTransitionResult {
  const baseState = input.previousState === 'completed' ? 'new' : input.previousState;
  const text = input.inboundText ?? '';

  switch (baseState) {
    case 'new':
      return {
        reply: WELCOME_MESSAGE,
        nextState: 'awaiting_intent',
        intent: null,
        reference: null,
      };
    case 'awaiting_intent': {
      const intent = detectIntent(text);
      if (!intent) {
        return {
          reply: UNKNOWN_INTENT_MESSAGE,
          nextState: 'awaiting_intent',
          intent: input.previousIntent ?? null,
          reference: null,
        };
      }

      if (intent === 'handoff') {
        return {
          reply: HANDOFF_MESSAGE,
          nextState: 'completed',
          intent,
          reference: null,
        };
      }

      return {
        reply: referencePrompts[intent],
        nextState: 'awaiting_reference',
        intent,
        reference: null,
      };
    }
    case 'awaiting_reference': {
      const intent = input.previousIntent ?? detectIntent(text) ?? null;
      if (!intent || intent === 'handoff') {
        return {
          reply: UNKNOWN_INTENT_MESSAGE,
          nextState: 'awaiting_intent',
          intent: null,
          reference: null,
        };
      }

      const reference = sanitizeReference(text);
      if (!reference) {
        return {
          reply: referenceFollowups[intent],
          nextState: 'awaiting_reference',
          intent,
          reference: null,
        };
      }

      return {
        reply: acknowledgement(intent, reference),
        nextState: 'completed',
        intent,
        reference,
      };
    }
    case 'completed':
    default:
      return {
        reply: WELCOME_MESSAGE,
        nextState: 'awaiting_intent',
        intent: null,
        reference: null,
      };
  }
}

export function coerceSopMetadata(value: unknown): SopMetadata {
  const parsed = SOP_METADATA_SCHEMA.safeParse(value);
  if (!parsed.success) {
    return { state: 'new', intent: null, reference: null };
  }

  return {
    state: parsed.data.state ?? 'new',
    intent: parsed.data.intent ?? null,
    reference: parsed.data.reference ?? null,
  };
}
