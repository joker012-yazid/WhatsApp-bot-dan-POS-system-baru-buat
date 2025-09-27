import { sql } from 'drizzle-orm';
import {
    boolean,
    index,
    inet,
    integer,
    jsonb,
    numeric,
    pgSchema,
    text,
    timestamp,
    uuid,
    varchar,
    date,
    bigint,
} from 'drizzle-orm/pg-core';

export const appSchema = pgSchema('app');

export const users = appSchema.table(
    'users',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        username: varchar('username', { length: 50 }).notNull().unique(),
        email: varchar('email', { length: 100 }).notNull().unique(),
        passwordHash: varchar('password_hash', { length: 255 }).notNull(),
        role: varchar('role', { length: 20 }).notNull(),
        fullName: varchar('full_name', { length: 100 }).notNull(),
        phone: varchar('phone', { length: 20 }),
        isActive: boolean('is_active').default(true),
        lastLogin: timestamp('last_login'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        usernameIdx: index('idx_users_username').on(table.username),
        emailIdx: index('idx_users_email').on(table.email),
    }),
);

export const customers = appSchema.table(
    'customers',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        name: varchar('name', { length: 100 }).notNull(),
        phone: varchar('phone', { length: 20 }).notNull().unique(),
        email: varchar('email', { length: 100 }),
        address: text('address'),
        companyName: varchar('company_name', { length: 100 }),
        customerType: varchar('customer_type', { length: 20 }).default('individual').notNull(),
        notes: text('notes'),
        createdBy: uuid('created_by').references(() => users.id),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        phoneIdx: index('idx_customers_phone').on(table.phone),
        nameIdx: index('idx_customers_name').on(table.name),
        emailIdx: index('idx_customers_email').on(table.email),
        createdAtIdx: index('idx_customers_created_at').on(table.createdAt),
    }),
);

export const products = appSchema.table(
    'products',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        name: varchar('name', { length: 100 }).notNull(),
        description: text('description'),
        category: varchar('category', { length: 50 }).notNull(),
        sku: varchar('sku', { length: 50 }).unique(),
        barcode: varchar('barcode', { length: 50 }),
        price: numeric('price', { precision: 10, scale: 2 }).notNull(),
        cost: numeric('cost', { precision: 10, scale: 2 }).notNull(),
        stockQuantity: integer('stock_quantity').default(0).notNull(),
        reorderLevel: integer('reorder_level').default(10).notNull(),
        unitOfMeasure: varchar('unit_of_measure', { length: 20 }).default('unit').notNull(),
        isActive: boolean('is_active').default(true),
        createdBy: uuid('created_by').references(() => users.id),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        skuIdx: index('idx_products_sku').on(table.sku),
        categoryIdx: index('idx_products_category').on(table.category),
        nameIdx: index('idx_products_name').on(table.name),
        stockIdx: index('idx_products_stock_quantity').on(table.stockQuantity),
    }),
);

export const tickets = appSchema.table(
    'tickets',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        ticketNumber: varchar('ticket_number', { length: 20 }).notNull().unique(),
        customerId: uuid('customer_id')
            .notNull()
            .references(() => customers.id, { onDelete: 'cascade' }),
        deviceType: varchar('device_type', { length: 50 }).notNull(),
        deviceModel: varchar('device_model', { length: 100 }).notNull(),
        serialNumber: varchar('serial_number', { length: 50 }),
        problemDescription: text('problem_description').notNull(),
        status: varchar('status', { length: 20 }).default('pending').notNull(),
        priority: varchar('priority', { length: 20 }).default('normal').notNull(),
        estimatedCost: numeric('estimated_cost', { precision: 10, scale: 2 }),
        actualCost: numeric('actual_cost', { precision: 10, scale: 2 }),
        estimatedCompletionDate: date('estimated_completion_date'),
        technicianNotes: text('technician_notes'),
        assignedTo: uuid('assigned_to').references(() => users.id),
        createdBy: uuid('created_by').references(() => users.id),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        customerIdx: index('idx_tickets_customer_id').on(table.customerId),
        statusIdx: index('idx_tickets_status').on(table.status),
        assignedIdx: index('idx_tickets_assigned_to').on(table.assignedTo),
        createdIdx: index('idx_tickets_created_at').on(table.createdAt),
        numberIdx: index('idx_tickets_ticket_number').on(table.ticketNumber),
    }),
);

export const ticketUpdates = appSchema.table('ticket_updates', {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id')
        .notNull()
        .references(() => tickets.id, { onDelete: 'cascade' }),
    updateType: varchar('update_type', { length: 50 }).notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    updatedBy: uuid('updated_by')
        .notNull()
        .references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const quotations = appSchema.table(
    'quotations',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        quotationNumber: varchar('quotation_number', { length: 20 }).notNull().unique(),
        customerId: uuid('customer_id')
            .notNull()
            .references(() => customers.id, { onDelete: 'cascade' }),
        ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
        validUntil: date('valid_until').notNull(),
        status: varchar('status', { length: 20 }).default('draft').notNull(),
        subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
        taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default(sql`6.00`).notNull(),
        taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull(),
        total: numeric('total', { precision: 10, scale: 2 }).notNull(),
        notes: text('notes'),
        terms: text('terms'),
        createdBy: uuid('created_by')
            .notNull()
            .references(() => users.id),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        customerIdx: index('idx_quotations_customer_id').on(table.customerId),
        statusIdx: index('idx_quotations_status').on(table.status),
        validUntilIdx: index('idx_quotations_valid_until').on(table.validUntil),
        numberIdx: index('idx_quotations_quotation_number').on(table.quotationNumber),
    }),
);

export const quotationItems = appSchema.table('quotation_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    quotationId: uuid('quotation_id')
        .notNull()
        .references(() => quotations.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    description: text('description').notNull(),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    discount: numeric('discount', { precision: 10, scale: 2 }).default(sql`0.00`).notNull(),
    totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const invoices = appSchema.table(
    'invoices',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        invoiceNumber: varchar('invoice_number', { length: 20 }).notNull().unique(),
        customerId: uuid('customer_id')
            .notNull()
            .references(() => customers.id, { onDelete: 'cascade' }),
        ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
        quotationId: uuid('quotation_id').references(() => quotations.id, { onDelete: 'set null' }),
        invoiceDate: date('invoice_date').default(sql`CURRENT_DATE`).notNull(),
        dueDate: date('due_date').notNull(),
        status: varchar('status', { length: 20 }).default('draft').notNull(),
        subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
        taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default(sql`6.00`).notNull(),
        taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull(),
        total: numeric('total', { precision: 10, scale: 2 }).notNull(),
        paidAmount: numeric('paid_amount', { precision: 10, scale: 2 }).default(sql`0.00`).notNull(),
        balance: numeric('balance', { precision: 10, scale: 2 }).generatedAlwaysAs(
            sql`total - paid_amount`,
            { stored: true },
        ),
        paymentMethod: varchar('payment_method', { length: 20 }),
        notes: text('notes'),
        createdBy: uuid('created_by')
            .notNull()
            .references(() => users.id),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        customerIdx: index('idx_invoices_customer_id').on(table.customerId),
        statusIdx: index('idx_invoices_status').on(table.status),
        dueDateIdx: index('idx_invoices_due_date').on(table.dueDate),
        numberIdx: index('idx_invoices_invoice_number').on(table.invoiceNumber),
        createdAtIdx: index('idx_invoices_created_at').on(table.createdAt),
    }),
);

export const invoiceItems = appSchema.table('invoice_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceId: uuid('invoice_id')
        .notNull()
        .references(() => invoices.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    description: text('description').notNull(),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    discount: numeric('discount', { precision: 10, scale: 2 }).default(sql`0.00`).notNull(),
    totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const payments = appSchema.table(
    'payments',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        paymentNumber: varchar('payment_number', { length: 20 }).notNull().unique(),
        invoiceId: uuid('invoice_id')
            .notNull()
            .references(() => invoices.id, { onDelete: 'cascade' }),
        amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
        paymentMethod: varchar('payment_method', { length: 20 }).notNull(),
        paymentReference: varchar('payment_reference', { length: 100 }),
        paymentDate: timestamp('payment_date').defaultNow(),
        status: varchar('status', { length: 20 }).default('completed').notNull(),
        notes: text('notes'),
        receivedBy: uuid('received_by')
            .notNull()
            .references(() => users.id),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => ({
        invoiceIdx: index('idx_payments_invoice_id').on(table.invoiceId),
        methodIdx: index('idx_payments_payment_method').on(table.paymentMethod),
        dateIdx: index('idx_payments_payment_date').on(table.paymentDate),
        statusIdx: index('idx_payments_status').on(table.status),
    }),
);

export const inventoryMovements = appSchema.table('inventory_movements', {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'cascade' }),
    movementType: varchar('movement_type', { length: 20 }).notNull(),
    quantity: integer('quantity').notNull(),
    referenceType: varchar('reference_type', { length: 50 }),
    referenceId: uuid('reference_id'),
    notes: text('notes'),
    createdBy: uuid('created_by')
        .notNull()
        .references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const whatsappSessions = appSchema.table(
    'whatsapp_sessions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
        sessionId: varchar('session_id', { length: 100 }).notNull().unique(),
        phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
        isActive: boolean('is_active').default(true),
        lastActivity: timestamp('last_activity').defaultNow(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => ({
        customerIdx: index('idx_whatsapp_sessions_customer_id').on(table.customerId),
        phoneIdx: index('idx_whatsapp_sessions_phone_number').on(table.phoneNumber),
    }),
);

export const whatsappMessages = appSchema.table(
    'whatsapp_messages',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        sessionId: uuid('session_id')
            .notNull()
            .references(() => whatsappSessions.id, { onDelete: 'cascade' }),
        messageId: varchar('message_id', { length: 100 }),
        direction: varchar('direction', { length: 20 }).notNull(),
        messageContent: text('message_content').notNull(),
        mediaType: varchar('media_type', { length: 20 }),
        mediaUrl: text('media_url'),
        status: varchar('status', { length: 20 }).default('delivered'),
        timestamp: timestamp('timestamp').defaultNow(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => ({
        sessionIdx: index('idx_whatsapp_messages_session_id').on(table.sessionId),
        directionIdx: index('idx_whatsapp_messages_direction').on(table.direction),
        timestampIdx: index('idx_whatsapp_messages_timestamp').on(table.timestamp),
    }),
);

export const aiConversations = appSchema.table(
    'ai_conversations',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
        sessionId: varchar('session_id', { length: 100 }).notNull(),
        messageContent: text('message_content').notNull(),
        responseContent: text('response_content').notNull(),
        intent: varchar('intent', { length: 50 }),
        confidenceScore: numeric('confidence_score', { precision: 5, scale: 4 }),
        sentimentScore: numeric('sentiment_score', { precision: 5, scale: 4 }),
        sentimentLabel: varchar('sentiment_label', { length: 20 }),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => ({
        customerIdx: index('idx_ai_conversations_customer_id').on(table.customerId),
        intentIdx: index('idx_ai_conversations_intent').on(table.intent),
        createdAtIdx: index('idx_ai_conversations_created_at').on(table.createdAt),
    }),
);

export const aiIntents = appSchema.table('ai_intents', {
    id: uuid('id').defaultRandom().primaryKey(),
    intentName: varchar('intent_name', { length: 50 }).notNull().unique(),
    description: text('description'),
    keywords: text('keywords').array(),
    responseTemplate: text('response_template'),
    actionType: varchar('action_type', { length: 50 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const customerSentiments = appSchema.table(
    'customer_sentiments',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        customerId: uuid('customer_id')
            .notNull()
            .references(() => customers.id, { onDelete: 'cascade' }),
        ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
        messageId: uuid('message_id').references(() => whatsappMessages.id, { onDelete: 'set null' }),
        sentimentScore: numeric('sentiment_score', { precision: 5, scale: 4 }),
        sentimentLabel: varchar('sentiment_label', { length: 20 }),
        confidence: numeric('confidence', { precision: 5, scale: 4 }),
        analyzedAt: timestamp('analyzed_at').defaultNow().notNull(),
    },
    (table) => ({
        customerIdx: index('idx_customer_sentiments_customer_id').on(table.customerId),
        labelIdx: index('idx_customer_sentiments_sentiment_label').on(table.sentimentLabel),
    }),
);

export const aiRecommendations = appSchema.table('ai_recommendations', {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
        .notNull()
        .references(() => customers.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'cascade' }),
    recommendationType: varchar('recommendation_type', { length: 50 }).notNull(),
    confidenceScore: numeric('confidence_score', { precision: 5, scale: 4 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    clicked: boolean('clicked').default(false),
    purchased: boolean('purchased').default(false),
});

export const aiInsights = appSchema.table('ai_insights', {
    id: uuid('id').defaultRandom().primaryKey(),
    insightType: varchar('insight_type', { length: 50 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    data: jsonb('data'),
    confidenceScore: numeric('confidence_score', { precision: 5, scale: 4 }),
    isActionable: boolean('is_actionable').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    acknowledged: boolean('acknowledged').default(false),
    acknowledgedBy: uuid('acknowledged_by').references(() => users.id),
    acknowledgedAt: timestamp('acknowledged_at'),
});

export const customerInteractions = appSchema.table('customer_interactions', {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
        .notNull()
        .references(() => customers.id, { onDelete: 'cascade' }),
    interactionType: varchar('interaction_type', { length: 50 }).notNull(),
    interactionId: uuid('interaction_id'),
    description: text('description'),
    direction: varchar('direction', { length: 20 }),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customerFeedback = appSchema.table('customer_feedback', {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
        .notNull()
        .references(() => customers.id, { onDelete: 'cascade' }),
    ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
    rating: integer('rating'),
    feedbackText: text('feedback_text'),
    feedbackSource: varchar('feedback_source', { length: 50 }).default('whatsapp').notNull(),
    isPublic: boolean('is_public').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customerPreferences = appSchema.table('customer_preferences', {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
        .notNull()
        .unique()
        .references(() => customers.id, { onDelete: 'cascade' }),
    preferredContactMethod: varchar('preferred_contact_method', { length: 20 })
        .default('whatsapp')
        .notNull(),
    notificationPreferences: jsonb('notification_preferences').default(sql`'{}'::jsonb`).notNull(),
    marketingConsent: boolean('marketing_consent').default(true),
    languagePreference: varchar('language_preference', { length: 10 }).default('ms').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const analyticsEvents = appSchema.table('analytics_events', {
    id: uuid('id').defaultRandom().primaryKey(),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    eventData: jsonb('event_data'),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: varchar('session_id', { length: 100 }),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reports = appSchema.table('reports', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    reportType: varchar('report_type', { length: 50 }).notNull(),
    parameters: jsonb('parameters').default(sql`'{}'::jsonb`).notNull(),
    generatedBy: uuid('generated_by')
        .notNull()
        .references(() => users.id),
    fileUrl: text('file_url'),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
});

export const auditLogs = appSchema.table(
    'audit_logs',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
        action: varchar('action', { length: 100 }).notNull(),
        tableName: varchar('table_name', { length: 50 }),
        recordId: uuid('record_id'),
        oldValues: jsonb('old_values'),
        newValues: jsonb('new_values'),
        ipAddress: inet('ip_address'),
        userAgent: text('user_agent'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => ({
        userIdx: index('idx_audit_logs_user_id').on(table.userId),
        actionIdx: index('idx_audit_logs_action').on(table.action),
        tableIdx: index('idx_audit_logs_table_name').on(table.tableName),
        createdIdx: index('idx_audit_logs_created_at').on(table.createdAt),
    }),
);

export const systemSettings = appSchema.table('system_settings', {
    id: uuid('id').defaultRandom().primaryKey(),
    settingKey: varchar('setting_key', { length: 100 }).notNull().unique(),
    settingValue: text('setting_value'),
    description: text('description'),
    isEncrypted: boolean('is_encrypted').default(false),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const companySettings = appSchema.table('company_settings', {
    id: uuid('id').defaultRandom().primaryKey(),
    companyName: varchar('company_name', { length: 100 }).notNull(),
    address: text('address'),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 100 }),
    website: varchar('website', { length: 100 }),
    registrationNumber: varchar('registration_number', { length: 50 }),
    taxNumber: varchar('tax_number', { length: 50 }),
    logoUrl: text('logo_url'),
    currency: varchar('currency', { length: 3 }).default('MYR').notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default(sql`6.00`).notNull(),
    invoicePrefix: varchar('invoice_prefix', { length: 10 }).default('INV').notNull(),
    quotationPrefix: varchar('quotation_prefix', { length: 10 }).default('QTN').notNull(),
    ticketPrefix: varchar('ticket_prefix', { length: 10 }).default('TKT').notNull(),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userSessions = appSchema.table(
    'user_sessions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
        expiresAt: timestamp('expires_at').notNull(),
        ipAddress: inet('ip_address'),
        userAgent: text('user_agent'),
        isActive: boolean('is_active').default(true),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        lastAccessed: timestamp('last_accessed').defaultNow().notNull(),
    },
    (table) => ({
        userIdx: index('idx_user_sessions_user_id').on(table.userId),
    }),
);

export const backupLogs = appSchema.table('backup_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    filename: varchar('filename', { length: 255 }).notNull(),
    fileSize: bigint('file_size', { mode: 'number' }),
    backupType: varchar('backup_type', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    notes: text('notes'),
});

export const apiKeys = appSchema.table('api_keys', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    keyHash: varchar('key_hash', { length: 255 }).notNull().unique(),
    permissions: jsonb('permissions').default(sql`'[]'::jsonb`).notNull(),
    lastUsedAt: timestamp('last_used_at'),
    expiresAt: timestamp('expires_at'),
    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by')
        .notNull()
        .references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
