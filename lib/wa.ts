import { setTimeout as delay } from 'node:timers/promises';

import env from '@/env.mjs';
import logger from '@/lib/logger';

export interface SendWhatsAppMessagePayload {
  to: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface SendOptions {
  /** Number of attempts before giving up. */
  attempts?: number;
  /** Base delay (in milliseconds) used for linear backoff between retries. */
  backoffMs?: number;
  signal?: AbortSignal;
}

interface PostOutboundPayload {
  to: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface SendWhatsAppResponse {
  messageId?: string;
  status?: string;
}

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 500;

function createEndpoint(): URL {
  try {
    return new URL('/send', env.WA_OUTBOUND_URL);
  } catch (error) {
    logger.error({ err: error }, 'Invalid WA_OUTBOUND_URL configured');
    throw error;
  }
}

export function normalizePhoneNumber(input: string): string {
  if (!input) {
    return '';
  }

  const withoutDomain = input.includes('@') ? input.split('@')[0] ?? '' : input;
  const trimmed = withoutDomain.trim();
  if (!trimmed) {
    return '';
  }

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (hasPlus) {
    return `+${digits}`;
  }

  if (trimmed.startsWith('00')) {
    const withoutPrefix = digits.replace(/^00+/, '');
    return withoutPrefix ? `+${withoutPrefix}` : '';
  }

  return digits;
}

export function ensureWhatsAppJid(recipient: string): string {
  if (!recipient) {
    throw new Error('WhatsApp recipient is required');
  }

  if (recipient.includes('@')) {
    return recipient;
  }

  const normalized = normalizePhoneNumber(recipient);
  if (!normalized) {
    throw new Error('WhatsApp recipient must include a phone number');
  }

  return `${normalized.replace(/^\+/, '')}@s.whatsapp.net`;
}

export function parseRemoteJid(remoteJid: string): {
  phoneNumber: string;
  jid: string;
  isGroup: boolean;
} {
  const [rawPhone = '', domain = ''] = remoteJid.split('@');
  const phoneNumber = rawPhone.replace(/[^0-9+]/g, '');
  return {
    phoneNumber,
    jid: remoteJid,
    isGroup: domain === 'g.us',
  };
}

export async function postOutboundMessage(
  payload: PostOutboundPayload,
  options?: SendOptions,
): Promise<SendWhatsAppResponse> {
  const endpoint = createEndpoint();
  const attempts = Math.max(1, options?.attempts ?? DEFAULT_ATTEMPTS);
  const backoffMs = Math.max(0, options?.backoffMs ?? DEFAULT_BACKOFF_MS);

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      logger.debug({
        attempt,
        to: payload.to,
        metadata: payload.metadata,
      }, 'Sending WhatsApp outbound message');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ to: payload.to, text: payload.text }),
        cache: 'no-store',
        signal: options?.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const error = new Error(
          `Failed to send WhatsApp message: ${response.status} ${response.statusText} ${errorBody}`.trim(),
        );
        throw error;
      }

      const data = (await response
        .json()
        .catch(() => null)) as
        | { success?: boolean; messageId?: string; status?: string }
        | null;

      const successStatus = typeof data?.status === 'string' ? data.status : data?.success ? 'sent' : undefined;
      const messageId = typeof data?.messageId === 'string' && data.messageId ? data.messageId : undefined;

      logger.info({
        to: payload.to,
        attempt,
        metadata: payload.metadata,
        status: successStatus ?? 'sent',
      }, 'WhatsApp outbound message sent');

      return {
        status: successStatus,
        messageId,
      };
    } catch (error) {
      lastError = error;
      const logMethod = attempt >= attempts ? 'error' : 'warn';
      logger[logMethod]({
        err: error,
        to: payload.to,
        attempt,
      }, 'WhatsApp outbound message attempt failed');

      if (attempt >= attempts) {
        break;
      }

      try {
        await delay(backoffMs * attempt, undefined, { signal: options?.signal });
      } catch (delayError) {
        logger.warn({ err: delayError }, 'Retry delay interrupted');
        throw error;
      }
    }
  }

  throw (lastError instanceof Error ? lastError : new Error('Failed to send WhatsApp message'));
}

export async function sendWhatsAppTextMessage(
  payload: SendWhatsAppMessagePayload,
  options?: SendOptions,
): Promise<SendWhatsAppResponse> {
  const to = ensureWhatsAppJid(payload.to);
  return postOutboundMessage({
    to,
    text: payload.text,
    metadata: payload.metadata,
  }, options);
}
