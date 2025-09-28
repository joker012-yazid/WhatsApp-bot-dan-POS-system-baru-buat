import {
  boolean,
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
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { user } from './auth-schema';

export const ticketStatus = pgEnum('ticket_status', [
  'intake',
  'diagnosed',
  'awaiting_approval',
  'approved',
  'rejected',
  'repairing',
  'done',
  'picked_up',
]);

export const quoteStatus = pgEnum('quote_status', ['draft', 'sent', 'approved', 'rejected']);

export const invoiceStatus = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'void']);

export const waDirection = pgEnum('wa_direction', ['in', 'out']);

export const reminderKind = pgEnum('reminder_kind', ['day1', 'day20', 'day30']);

export const waMessageStatus = pgEnum('wa_message_status', [
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
  'received',
  'deleted',
]);

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

export const tickets = pgTable('tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketNumber: varchar('ticket_number', { length: 20 }).notNull().unique(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  termsAccepted: boolean('terms_accepted').default(false).notNull(),
  deviceBrand: varchar('device_brand', { length: 100 }),
  deviceModel: varchar('device_model', { length: 120 }),
  deviceType: varchar('device_type', { length: 80 }),
  deviceColor: varchar('device_color', { length: 60 }),
  serialNumber: varchar('serial_number', { length: 60 }),
  accessories: text('device_accessories'),
  securityCode: varchar('security_code', { length: 120 }),
  problemDescription: text('problem_description').notNull(),
  status: ticketStatus('status').default('intake').notNull(),
  estimatedCost: numeric('estimated_cost', { precision: 10, scale: 2 }),
  actualCost: numeric('actual_cost', { precision: 10, scale: 2 }),
  estimatedCompletionDate: date('estimated_completion_date'),
  assignedTo: text('assigned_to').references(() => user.id, { onDelete: 'set null' }),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const diagnostics = pgTable('diagnostics', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  technicianId: text('technician_id').references(() => user.id, { onDelete: 'set null' }),
  summary: text('summary').notNull(),
  findings: text('findings'),
  recommendedActions: text('recommended_actions'),
  estimatedCost: numeric('estimated_cost', { precision: 10, scale: 2 }),
  approved: boolean('approved').default(false).notNull(),
  approvedBy: text('approved_by').references(() => user.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: false }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    number: varchar('quote_number', { length: 40 }).notNull().unique(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
    status: quoteStatus('status').default('draft').notNull(),
    validUntil: date('valid_until').notNull(),
    numberYear: integer('number_year').notNull(),
    sequence: integer('sequence').notNull(),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0').notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('6.00').notNull(),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0').notNull(),
    total: numeric('total', { precision: 12, scale: 2 }).default('0').notNull(),
    notes: text('notes'),
    terms: text('terms'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
  },
  (table) => ({
    quoteNumberYearSequenceUnique: uniqueIndex('quotes_number_year_sequence_unique').on(
      table.numberYear,
      table.sequence,
    ),
  }),
);

export const quoteItems = pgTable('quote_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quotes.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 12, scale: 2 }).default('0').notNull(),
  total: numeric('total_price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    number: varchar('invoice_number', { length: 40 }).notNull().unique(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
    quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'set null' }),
    status: invoiceStatus('status').default('draft').notNull(),
    issuedAt: date('invoice_date').defaultNow().notNull(),
    dueAt: date('due_date'),
    numberYear: integer('number_year').notNull(),
    sequence: integer('sequence').notNull(),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0').notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('6.00').notNull(),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0').notNull(),
    total: numeric('total', { precision: 12, scale: 2 }).default('0').notNull(),
    paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }).default('0').notNull(),
    balance: numeric('balance', { precision: 12, scale: 2 }),
    paymentMethod: varchar('payment_method', { length: 20 }),
    notes: text('notes'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
  },
  (table) => ({
    invoiceNumberYearSequenceUnique: uniqueIndex('invoices_number_year_sequence_unique').on(
      table.numberYear,
      table.sequence,
    ),
  }),
);

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
  total: numeric('total_price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const ticketUpdates = pgTable('ticket_updates', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  updateType: varchar('update_type', { length: 50 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  updatedBy: text('updated_by')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const waMessages = pgTable('wa_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 100 }).notNull(),
  messageId: varchar('message_id', { length: 100 }),
  direction: waDirection('direction').notNull(),
  status: waMessageStatus('status').default('pending').notNull(),
  body: text('message_content').notNull(),
  mediaType: varchar('media_type', { length: 20 }),
  mediaUrl: text('media_url'),
  sentAt: timestamp('timestamp', { withTimezone: false }).defaultNow().notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const reminderLog = pgTable('reminder_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
  waMessageId: uuid('wa_message_id').references(() => waMessages.id, { onDelete: 'set null' }),
  kind: reminderKind('kind').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: false }).defaultNow().notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});
