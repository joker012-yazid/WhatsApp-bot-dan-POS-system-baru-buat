import {
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const invoiceStatus = pgEnum('invoice_status', ['draft', 'sent', 'due', 'overdue', 'paid', 'void']);
const quotationStatus = pgEnum('quotation_status', ['draft', 'sent', 'accepted', 'rejected', 'expired']);
const waDirection = pgEnum('wa_message_direction', ['inbound', 'outbound']);
const waStatus = pgEnum('wa_message_status', ['pending', 'sent', 'delivered', 'read', 'failed', 'received', 'deleted']);

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  phone: varchar('phone', { length: 32 }).notNull().unique(),
  email: varchar('email', { length: 120 }),
  company: varchar('company', { length: 120 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  sku: varchar('sku', { length: 64 }).unique(),
  description: text('description'),
  price: numeric('price', { precision: 12, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const quotations = pgTable('quotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  number: varchar('number', { length: 40 }).notNull().unique(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  status: quotationStatus('status').default('draft').notNull(),
  validUntil: date('valid_until').notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0').notNull(),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('0').notNull(),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).default('0').notNull(),
  notes: text('notes'),
  terms: text('terms'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const quotationItems = pgTable('quotation_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  quotationId: uuid('quotation_id')
    .notNull()
    .references(() => quotations.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 12, scale: 2 }).default('0').notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  number: varchar('number', { length: 40 }).notNull().unique(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  quotationId: uuid('quotation_id').references(() => quotations.id, { onDelete: 'set null' }),
  status: invoiceStatus('status').default('draft').notNull(),
  issuedAt: date('issued_at').defaultNow().notNull(),
  dueAt: date('due_at'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0').notNull(),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('0').notNull(),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).default('0').notNull(),
  paidTotal: numeric('paid_total', { precision: 12, scale: 2 }).default('0').notNull(),
  balance: numeric('balance', { precision: 12, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 12, scale: 2 }).default('0').notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const waMessages = pgTable('wa_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  externalId: varchar('external_id', { length: 255 }),
  direction: waDirection('direction').notNull(),
  status: waStatus('status').default('pending').notNull(),
  body: text('body').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: false }).defaultNow().notNull(),
  metadata: jsonb('metadata'),
});
