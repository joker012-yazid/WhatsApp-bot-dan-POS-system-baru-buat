import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { customers, waMessages } from '@/db/schema';
import logger from '@/lib/logger';
import { ensureWhatsAppJid, parseRemoteJid, sendWhatsAppTextMessage } from '@/lib/wa';

export const runtime = 'nodejs';

type WaMessageStatus = (typeof waMessages.$inferInsert)['status'];

const baseEventSchema = z.object({
  event: z.string(),
  data: z.unknown(),
});

const messageKeySchema = z
  .object({
    id: z.string().optional(),
  })
  .partial();

const messagePayloadSchema = z
  .object({
    conversation: z.string().optional(),
    extendedTextMessage: z
      .object({ text: z.string().optional() })
      .partial()
      .optional(),
    imageMessage: z
      .object({ caption: z.string().optional() })
      .partial()
      .optional(),
    videoMessage: z
      .object({ caption: z.string().optional() })
      .partial()
      .optional(),
    buttonsResponseMessage: z
      .object({ selectedDisplayText: z.string().optional() })
      .partial()
      .optional(),
  })
  .passthrough();

const messageUpsertSchema = z.object({
  event: z.literal('messages.upsert'),
  data: z.object({
    type: z.string(),
    key: z.object({
      id: z.string().optional(),
      remoteJid: z.string(),
      fromMe: z.boolean().optional(),
    }),
    message: messagePayloadSchema.optional(),
    pushName: z.string().optional(),
    timestamp: z.union([z.number(), z.string()]).optional(),
  }),
});

const messageUpdateSchema = z.object({
  event: z.literal('messages.update'),
  data: z.array(
    z.object({
      key: messageKeySchema.optional(),
      status: z.string().optional(),
      update: z
        .object({
          status: z.string().optional(),
        })
        .partial()
        .optional(),
    }),
  ),
});

const messageDeleteSchema = z.object({
  event: z.literal('messages.delete'),
  data: z.array(
    z.object({
      key: messageKeySchema.optional(),
    }),
  ),
});

type MessagePayload = z.infer<typeof messagePayloadSchema>;
type MessageUpdate = z.infer<typeof messageUpdateSchema>['data'][number];
type MessageDeletion = z.infer<typeof messageDeleteSchema>['data'][number];

function extractMessageText(message?: MessagePayload): string | null {
  if (!message) return null;
  if (typeof message.conversation === 'string') {
    return message.conversation;
  }
  if (typeof message.extendedTextMessage?.text === 'string') {
    return message.extendedTextMessage.text;
  }
  if (typeof message.imageMessage?.caption === 'string') {
    return message.imageMessage.caption;
  }
  if (typeof message.videoMessage?.caption === 'string') {
    return message.videoMessage.caption;
  }
  if (typeof message.buttonsResponseMessage?.selectedDisplayText === 'string') {
    return message.buttonsResponseMessage.selectedDisplayText;
  }
  return null;
}

function generateAutoReply(content: string | null): string | null {
  if (!content) return null;
  const lower = content.toLowerCase();

  if (/(hi|hello|hey|hai)/.test(lower)) {
    return 'Hai! 👋 Terima kasih menghubungi WhatsApp POS System kami. Saya boleh bantu semak status pembaikan atau info invois/quotation.';
  }
  if (lower.includes('status')) {
    return 'Untuk semak status pembaikan, sila kongsi nombor tiket atau nombor telefon yang digunakan semasa check-in.';
  }
  if (lower.includes('quotation')) {
    return 'Kami boleh hantar semula quotation terbaru melalui WhatsApp. Tolong berikan nombor tiket atau nama pelanggan.';
  }
  if (lower.includes('invoice') || lower.includes('bayar')) {
    return 'Untuk bantuan invois atau pembayaran, sila maklumkan nombor invois atau nama pelanggan supaya kami boleh semak rekod.';
  }
  if (lower.includes('help') || lower.includes('bantuan')) {
    return 'Kami sedia membantu! Nyatakan jika anda ingin semak status pembaikan, quotation, invois, atau ada soalan lain.';
  }

  return null;
}

async function findCustomerIdByPhone(phoneNumber: string | null): Promise<string | null> {
  if (!phoneNumber) {
    return null;
  }

  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.phone, phoneNumber))
    .limit(1);

  return customer?.id ?? null;
}

function normalizeMessageStatus(status?: string): WaMessageStatus {
  const allowed: WaMessageStatus[] = [
    'pending',
    'sent',
    'delivered',
    'read',
    'failed',
    'received',
    'deleted',
  ];

  if (!status) {
    return 'pending';
  }

  const normalized = status.toLowerCase() as WaMessageStatus;
  return allowed.includes(normalized) ? normalized : 'pending';
}

function toDate(timestamp?: number | string): Date {
  if (!timestamp) return new Date();
  const numeric = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
  if (Number.isNaN(numeric)) return new Date();
  // Baileys emits seconds, convert if it looks like seconds.
  return new Date(numeric > 1_000_000_000_000 ? numeric : numeric * 1000);
}

export async function POST(request: NextRequest): Promise<Response> {
  const payload = await request.json();
  const parsedBase = baseEventSchema.safeParse(payload);
  if (!parsedBase.success) {
    return Response.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  const { event } = parsedBase.data;

  if (event === 'messages.upsert') {
    const parsed = messageUpsertSchema.safeParse(payload);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid messages.upsert payload' }, { status: 400 });
    }

    const { data } = parsed.data;
    const parsedJid = parseRemoteJid(data.key.remoteJid);
    const customerId = await findCustomerIdByPhone(parsedJid.phoneNumber || null);
    const messageText = extractMessageText(data.message);
    const direction = data.key.fromMe ? 'outbound' : 'inbound';

    await db.insert(waMessages).values({
      sessionId: parsedJid.jid,
      customerId,
      externalId: data.key.id,
      direction,
      body: messageText ?? JSON.stringify(data.message ?? {}),
      status: direction === 'inbound' ? 'received' : 'sent',
      sentAt: toDate(data.timestamp),
      metadata: data.message ?? null,
    });

    if (direction === 'inbound') {
      const reply = generateAutoReply(messageText);
      if (reply) {
        try {
          const recipient = ensureWhatsAppJid(data.key.remoteJid);
          await sendWhatsAppTextMessage({
            to: recipient,
            message: reply,
            metadata: {
              source: 'auto-reply',
              sessionId: parsedJid.jid,
            },
          });
          await db.insert(waMessages).values({
            sessionId: parsedJid.jid,
            customerId,
            body: reply,
            direction: 'outbound',
            status: 'sent',
            sentAt: new Date(),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          await db.insert(waMessages).values({
            sessionId: parsedJid.jid,
            customerId,
            body: `Auto-reply failed: ${message}`,
            direction: 'outbound',
            status: 'failed',
            sentAt: new Date(),
          });
          logger.error({ err: error }, 'Failed to send auto-reply');
        }
      }
    }

    return Response.json({ success: true });
  }

  if (event === 'messages.update') {
    const parsed = messageUpdateSchema.safeParse(payload);
    if (parsed.success) {
      const updates: MessageUpdate[] = parsed.data.data;
      for (const update of updates) {
        const messageId = update.key?.id;
        const status = update.update?.status ?? update.status;
        if (!messageId || !status) continue;
        await db
          .update(waMessages)
          .set({ status: normalizeMessageStatus(status) })
          .where(eq(waMessages.externalId, messageId));
      }
    }
    return Response.json({ acknowledged: true });
  }

  if (event === 'messages.delete') {
    const parsed = messageDeleteSchema.safeParse(payload);
    if (parsed.success) {
      const deletions: MessageDeletion[] = parsed.data.data;
      for (const deletion of deletions) {
        const messageId = deletion.key?.id;
        if (!messageId) continue;
        await db
          .update(waMessages)
          .set({ status: 'deleted' })
          .where(eq(waMessages.externalId, messageId));
      }
    }
    return Response.json({ acknowledged: true });
  }

  return Response.json({ ignored: true }, { status: 202 });
}
