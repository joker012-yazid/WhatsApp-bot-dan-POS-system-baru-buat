import { NextRequest } from 'next/server';
import { desc, eq, or } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { customers, waMessages } from '@/db/schema';
import logger from '@/lib/logger';
import { coerceSopMetadata, evaluateSopTransition } from '@/lib/wa-sop';
import { normalizePhoneNumber, sendWhatsAppTextMessage } from '@/lib/wa';

export const runtime = 'nodejs';

const inboundMessageSchema = z.object({
  from: z.string().min(1, 'Sender is required'),
  text: z.string().min(1, 'Message text is required'),
});

type InsertWaMessage = typeof waMessages.$inferInsert;
type SopMetadata = ReturnType<typeof coerceSopMetadata>;

type RawMetadata = Record<string, unknown> | null | undefined;

function extractSopMetadata(metadata: RawMetadata): SopMetadata {
  if (metadata && typeof metadata === 'object' && 'sop' in metadata) {
    return coerceSopMetadata((metadata as Record<string, unknown>).sop);
  }

  return coerceSopMetadata(metadata);
}

async function findCustomerIdByPhone(msisdn: string): Promise<string | null> {
  if (!msisdn) {
    return null;
  }

  const plain = msisdn.replace(/^\+/, '');
  const [record] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(or(eq(customers.phone, msisdn), eq(customers.phone, plain)))
    .limit(1);

  return record?.id ?? null;
}

async function insertWaMessage(values: InsertWaMessage): Promise<typeof waMessages.$inferSelect | null> {
  const [record] = await db.insert(waMessages).values(values).returning();
  return record ?? null;
}

export async function POST(request: NextRequest): Promise<Response> {
  const payload = await request
    .json()
    .catch(() => null);

  const parsed = inboundMessageSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  const { from, text } = parsed.data;
  const normalizedFrom = normalizePhoneNumber(from);
  if (!normalizedFrom) {
    return Response.json({ error: 'Invalid sender phone number' }, { status: 400 });
  }

  const sessionId = normalizedFrom.replace(/^\+/, '');

  try {
    const [previousMessage] = await db
      .select({ metadata: waMessages.metadata })
      .from(waMessages)
      .where(eq(waMessages.sessionId, sessionId))
      .orderBy(desc(waMessages.createdAt))
      .limit(1);

    const previousSop = extractSopMetadata(previousMessage?.metadata as RawMetadata);

    const transition = evaluateSopTransition({
      previousState: previousSop.state,
      previousIntent: previousSop.intent,
      inboundText: text,
    });

    const customerId = await findCustomerIdByPhone(normalizedFrom);

    const inboundRecord = await insertWaMessage({
      sessionId,
      customerId,
      direction: 'in',
      status: 'received',
      body: text,
      sentAt: new Date(),
      metadata: {
        from,
        normalizedFrom,
        sop: {
          state: previousSop.state,
          intent: transition.intent ?? previousSop.intent ?? null,
          reference: transition.reference ?? previousSop.reference ?? null,
        },
      },
    });

    try {
      await sendWhatsAppTextMessage({
        to: normalizedFrom,
        text: transition.reply,
        metadata: {
          sessionId,
          source: 'sop-automation',
          intent: transition.intent ?? previousSop.intent ?? null,
          reference: transition.reference ?? previousSop.reference ?? null,
          inboundMessageId: inboundRecord?.id ?? null,
        },
      });

      await insertWaMessage({
        sessionId,
        customerId,
        direction: 'out',
        status: 'sent',
        body: transition.reply,
        sentAt: new Date(),
        metadata: {
          normalizedFrom,
          respondsTo: inboundRecord?.id ?? null,
          sop: {
            state: transition.nextState,
            intent: transition.intent ?? previousSop.intent ?? null,
            reference: transition.reference ?? previousSop.reference ?? null,
          },
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to send SOP reply');

      await insertWaMessage({
        sessionId,
        customerId,
        direction: 'out',
        status: 'failed',
        body: transition.reply,
        sentAt: new Date(),
        metadata: {
          normalizedFrom,
          respondsTo: inboundRecord?.id ?? null,
          error: error instanceof Error ? error.message : 'Unknown error',
          sop: {
            state: transition.nextState,
            intent: transition.intent ?? previousSop.intent ?? null,
            reference: transition.reference ?? previousSop.reference ?? null,
          },
        },
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to process WhatsApp webhook');
    return Response.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
