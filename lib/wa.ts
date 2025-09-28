import env from '@/env.mjs';

export interface SendWhatsAppMessagePayload {
  to: string;
  message: string;
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

export async function sendWhatsAppTextMessage(
  payload: SendWhatsAppMessagePayload,
): Promise<void> {
  const { to, message } = payload;
  const endpoint = new URL('/send', env.WA_OUTBOUND_URL);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      to: ensureWhatsAppJid(to),
      message,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Failed to send WhatsApp message: ${response.status} ${response.statusText} ${errorBody}`.trim(),
    );
  }
}
