import { setTimeout as delay } from 'node:timers/promises';

import env from '@/env.mjs';
import logger from '@/lib/logger';

export interface SendWhatsAppMessagePayload {
  to: string;
  message: string;
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
  message: string;
  metadata?: Record<string, unknown>;
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

export function ensureWhatsAppJid(recipient: string): string {
  if (!recipient) {
    throw new Error('WhatsApp recipient is required');
  }

  if (recipient.includes('@')) {
    return recipient;
  }

  const digits = recipient.replace(/[^0-9+]/g, '');
  if (!digits) {
    throw new Error('WhatsApp recipient must include a phone number');
  }

  return `${digits}@s.whatsapp.net`;
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
): Promise<void> {
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
        body: JSON.stringify(payload),
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

      logger.info({
        to: payload.to,
        attempt,
        metadata: payload.metadata,
        status: 'delivered',
      }, 'WhatsApp outbound message sent');

      return;
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
): Promise<void> {
  const to = ensureWhatsAppJid(payload.to);
  return postOutboundMessage({
    to,
    message: payload.message,
    metadata: payload.metadata,
  }, options);
}
