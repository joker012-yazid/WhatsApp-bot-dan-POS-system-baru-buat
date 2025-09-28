import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { invoices, quotes } from '@/db/schema';

const DOCUMENT_NUMBER_PATTERN = /^([A-Z]+)-(\d{4})-(\d{5})$/;

type PrefixConfig = {
  table: typeof quotes | typeof invoices;
  sequenceColumn: typeof quotes.sequence | typeof invoices.sequence;
  yearColumn: typeof quotes.numberYear | typeof invoices.numberYear;
};

const prefixMap: Record<string, PrefixConfig> = {
  QUO: {
    table: quotes,
    sequenceColumn: quotes.sequence,
    yearColumn: quotes.numberYear,
  },
  INV: {
    table: invoices,
    sequenceColumn: invoices.sequence,
    yearColumn: invoices.numberYear,
  },
};

interface DocumentNumberParts {
  prefix: string;
  year: number;
  sequence: number;
}

export function parseDocumentNumber(value: string): DocumentNumberParts | null {
  const match = DOCUMENT_NUMBER_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const [, prefix, year, sequence] = match;
  return {
    prefix,
    year: Number.parseInt(year, 10),
    sequence: Number.parseInt(sequence, 10),
  };
}

function formatDocumentNumber(prefix: string, year: number, sequence: number): string {
  const padded = String(sequence).padStart(5, '0');
  return `${prefix}-${year}-${padded}`;
}

async function getLatestSequence(prefix: string, year: number): Promise<number> {
  const config = prefixMap[prefix];
  if (!config) {
    throw new Error(`Unsupported document prefix: ${prefix}`);
  }

  const [latest] = await db
    .select({ sequence: config.sequenceColumn })
    .from(config.table)
    .where(eq(config.yearColumn, year))
    .orderBy(desc(config.sequenceColumn))
    .limit(1);

  return latest?.sequence ?? 0;
}

export async function nextNumber(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const latestSequence = await getLatestSequence(prefix, year);
  const nextSequence = latestSequence + 1;
  return formatDocumentNumber(prefix, year, nextSequence);
}

export { DOCUMENT_NUMBER_PATTERN };
