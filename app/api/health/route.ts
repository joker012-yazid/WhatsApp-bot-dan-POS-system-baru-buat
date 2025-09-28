import { sql } from 'drizzle-orm';

import { db } from '@/db';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  try {
    await db.execute(sql`select 1 as ok`);
    return Response.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      {
        status: 'unhealthy',
        database: 'unreachable',
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
