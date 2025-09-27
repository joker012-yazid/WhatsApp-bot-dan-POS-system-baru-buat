CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS "app";

CREATE TABLE "app"."users" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "username" varchar(50) NOT NULL UNIQUE,
    "email" varchar(100) NOT NULL UNIQUE,
    "password_hash" varchar(255) NOT NULL,
    "role" varchar(20) NOT NULL CHECK ("role" IN ('admin', 'staff', 'technician')),
    "full_name" varchar(100) NOT NULL,
    "phone" varchar(20),
    "is_active" boolean DEFAULT true,
    "last_login" timestamp,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."customers" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" varchar(100) NOT NULL,
    "phone" varchar(20) NOT NULL UNIQUE,
    "email" varchar(100),
    "address" text,
    "company_name" varchar(100),
    "customer_type" varchar(20) DEFAULT 'individual' CHECK ("customer_type" IN ('individual', 'business')),
    "notes" text,
    "created_by" uuid REFERENCES "app"."users"("id"),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."products" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" varchar(100) NOT NULL,
    "description" text,
    "category" varchar(50) NOT NULL,
    "sku" varchar(50) UNIQUE,
    "barcode" varchar(50),
    "price" numeric(10, 2) NOT NULL,
    "cost" numeric(10, 2) NOT NULL,
    "stock_quantity" integer DEFAULT 0 NOT NULL,
    "reorder_level" integer DEFAULT 10 NOT NULL,
    "unit_of_measure" varchar(20) DEFAULT 'unit' NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_by" uuid REFERENCES "app"."users"("id"),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."tickets" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ticket_number" varchar(20) NOT NULL UNIQUE,
    "customer_id" uuid NOT NULL REFERENCES "app"."customers"("id") ON DELETE CASCADE,
    "device_type" varchar(50) NOT NULL,
    "device_model" varchar(100) NOT NULL,
    "serial_number" varchar(50),
    "problem_description" text NOT NULL,
    "status" varchar(20) DEFAULT 'pending' CHECK ("status" IN ('pending', 'diagnosing', 'approved', 'in_progress', 'completed', 'ready_for_pickup', 'picked_up', 'cancelled')),
    "priority" varchar(20) DEFAULT 'normal' CHECK ("priority" IN ('low', 'normal', 'high', 'urgent')),
    "estimated_cost" numeric(10, 2),
    "actual_cost" numeric(10, 2),
    "estimated_completion_date" date,
    "technician_notes" text,
    "assigned_to" uuid REFERENCES "app"."users"("id"),
    "created_by" uuid REFERENCES "app"."users"("id"),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."ticket_updates" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ticket_id" uuid NOT NULL REFERENCES "app"."tickets"("id") ON DELETE CASCADE,
    "update_type" varchar(50) NOT NULL,
    "description" text,
    "image_url" text,
    "updated_by" uuid NOT NULL REFERENCES "app"."users"("id"),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."quotations" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "quotation_number" varchar(20) NOT NULL UNIQUE,
    "customer_id" uuid NOT NULL REFERENCES "app"."customers"("id") ON DELETE CASCADE,
    "ticket_id" uuid REFERENCES "app"."tickets"("id") ON DELETE SET NULL,
    "valid_until" date NOT NULL,
    "status" varchar(20) DEFAULT 'draft' CHECK ("status" IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
    "subtotal" numeric(10, 2) NOT NULL,
    "tax_rate" numeric(5, 2) DEFAULT 6.00 NOT NULL,
    "tax_amount" numeric(10, 2) NOT NULL,
    "total" numeric(10, 2) NOT NULL,
    "notes" text,
    "terms" text,
    "created_by" uuid NOT NULL REFERENCES "app"."users"("id"),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."quotation_items" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "quotation_id" uuid NOT NULL REFERENCES "app"."quotations"("id") ON DELETE CASCADE,
    "product_id" uuid REFERENCES "app"."products"("id") ON DELETE SET NULL,
    "description" text NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(10, 2) NOT NULL,
    "discount" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    "total_price" numeric(10, 2) NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."invoices" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "invoice_number" varchar(20) NOT NULL UNIQUE,
    "customer_id" uuid NOT NULL REFERENCES "app"."customers"("id") ON DELETE CASCADE,
    "ticket_id" uuid REFERENCES "app"."tickets"("id") ON DELETE SET NULL,
    "quotation_id" uuid REFERENCES "app"."quotations"("id") ON DELETE SET NULL,
    "invoice_date" date DEFAULT CURRENT_DATE NOT NULL,
    "due_date" date NOT NULL,
    "status" varchar(20) DEFAULT 'draft' CHECK ("status" IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
    "subtotal" numeric(10, 2) NOT NULL,
    "tax_rate" numeric(5, 2) DEFAULT 6.00 NOT NULL,
    "tax_amount" numeric(10, 2) NOT NULL,
    "total" numeric(10, 2) NOT NULL,
    "paid_amount" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    "balance" numeric(10, 2) GENERATED ALWAYS AS ("total" - "paid_amount") STORED,
    "payment_method" varchar(20),
    "notes" text,
    "created_by" uuid NOT NULL REFERENCES "app"."users"("id"),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."invoice_items" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "invoice_id" uuid NOT NULL REFERENCES "app"."invoices"("id") ON DELETE CASCADE,
    "product_id" uuid REFERENCES "app"."products"("id") ON DELETE SET NULL,
    "description" text NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(10, 2) NOT NULL,
    "discount" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    "total_price" numeric(10, 2) NOT NULL,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."payments" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "payment_number" varchar(20) NOT NULL UNIQUE,
    "invoice_id" uuid NOT NULL REFERENCES "app"."invoices"("id") ON DELETE CASCADE,
    "amount" numeric(10, 2) NOT NULL,
    "payment_method" varchar(20) NOT NULL CHECK ("payment_method" IN ('cash', 'card', 'bank_transfer', 'ewallet', 'cheque')),
    "payment_reference" varchar(100),
    "payment_date" timestamp DEFAULT CURRENT_TIMESTAMP,
    "status" varchar(20) DEFAULT 'completed' CHECK ("status" IN ('pending', 'completed', 'failed', 'refunded')),
    "notes" text,
    "received_by" uuid NOT NULL REFERENCES "app"."users"("id"),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."inventory_movements" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "product_id" uuid NOT NULL REFERENCES "app"."products"("id") ON DELETE CASCADE,
    "movement_type" varchar(20) NOT NULL CHECK ("movement_type" IN ('in', 'out', 'adjustment', 'return')),
    "quantity" integer NOT NULL,
    "reference_type" varchar(50),
    "reference_id" uuid,
    "notes" text,
    "created_by" uuid NOT NULL REFERENCES "app"."users"("id"),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."whatsapp_sessions" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "customer_id" uuid REFERENCES "app"."customers"("id") ON DELETE CASCADE,
    "session_id" varchar(100) NOT NULL UNIQUE,
    "phone_number" varchar(20) NOT NULL,
    "is_active" boolean DEFAULT true,
    "last_activity" timestamp DEFAULT CURRENT_TIMESTAMP,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."whatsapp_messages" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "session_id" uuid NOT NULL REFERENCES "app"."whatsapp_sessions"("id") ON DELETE CASCADE,
    "message_id" varchar(100),
    "direction" varchar(20) NOT NULL CHECK ("direction" IN ('inbound', 'outbound')),
    "message_content" text NOT NULL,
    "media_type" varchar(20),
    "media_url" text,
    "status" varchar(20) DEFAULT 'delivered',
    "timestamp" timestamp DEFAULT CURRENT_TIMESTAMP,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."ai_conversations" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "customer_id" uuid REFERENCES "app"."customers"("id") ON DELETE CASCADE,
    "session_id" varchar(100) NOT NULL,
    "message_content" text NOT NULL,
    "response_content" text NOT NULL,
    "intent" varchar(50),
    "confidence_score" numeric(5, 4),
    "sentiment_score" numeric(5, 4),
    "sentiment_label" varchar(20),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."ai_intents" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "intent_name" varchar(50) NOT NULL UNIQUE,
    "description" text,
    "keywords" text[],
    "response_template" text,
    "action_type" varchar(50),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."customer_sentiments" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "customer_id" uuid NOT NULL REFERENCES "app"."customers"("id") ON DELETE CASCADE,
    "ticket_id" uuid REFERENCES "app"."tickets"("id") ON DELETE SET NULL,
    "message_id" uuid REFERENCES "app"."whatsapp_messages"("id") ON DELETE SET NULL,
    "sentiment_score" numeric(5, 4),
    "sentiment_label" varchar(20) CHECK ("sentiment_label" IN ('positive', 'neutral', 'negative')),
    "confidence" numeric(5, 4),
    "analyzed_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."ai_recommendations" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "customer_id" uuid NOT NULL REFERENCES "app"."customers"("id") ON DELETE CASCADE,
    "product_id" uuid NOT NULL REFERENCES "app"."products"("id") ON DELETE CASCADE,
    "recommendation_type" varchar(50) NOT NULL CHECK ("recommendation_type" IN ('similar', 'complementary', 'frequently_bought_together')),
    "confidence_score" numeric(5, 4),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "clicked" boolean DEFAULT false,
    "purchased" boolean DEFAULT false
);

CREATE TABLE "app"."ai_insights" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "insight_type" varchar(50) NOT NULL CHECK ("insight_type" IN ('customer_behavior', 'sales_trend', 'inventory_prediction', 'sentiment_analysis')),
    "title" varchar(200) NOT NULL,
    "description" text NOT NULL,
    "data" jsonb,
    "confidence_score" numeric(5, 4),
    "is_actionable" boolean DEFAULT true,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "acknowledged" boolean DEFAULT false,
    "acknowledged_by" uuid REFERENCES "app"."users"("id"),
    "acknowledged_at" timestamp
);

CREATE TABLE "app"."customer_interactions" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "customer_id" uuid NOT NULL REFERENCES "app"."customers"("id") ON DELETE CASCADE,
    "interaction_type" varchar(50) NOT NULL CHECK ("interaction_type" IN ('whatsapp', 'call', 'email', 'visit', 'ticket', 'purchase')),
    "interaction_id" uuid,
    "description" text,
    "direction" varchar(20) CHECK ("direction" IN ('inbound', 'outbound')),
    "created_by" uuid REFERENCES "app"."users"("id"),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."customer_feedback" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "customer_id" uuid NOT NULL REFERENCES "app"."customers"("id") ON DELETE CASCADE,
    "ticket_id" uuid REFERENCES "app"."tickets"("id") ON DELETE SET NULL,
    "invoice_id" uuid REFERENCES "app"."invoices"("id") ON DELETE SET NULL,
    "rating" integer CHECK ("rating" >= 1 AND "rating" <= 5),
    "feedback_text" text,
    "feedback_source" varchar(50) DEFAULT 'whatsapp',
    "is_public" boolean DEFAULT false,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."customer_preferences" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "customer_id" uuid NOT NULL UNIQUE REFERENCES "app"."customers"("id") ON DELETE CASCADE,
    "preferred_contact_method" varchar(20) DEFAULT 'whatsapp' NOT NULL,
    "notification_preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "marketing_consent" boolean DEFAULT true,
    "language_preference" varchar(10) DEFAULT 'ms' NOT NULL,
    "notes" text,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."analytics_events" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "event_type" varchar(50) NOT NULL,
    "event_data" jsonb,
    "customer_id" uuid REFERENCES "app"."customers"("id") ON DELETE SET NULL,
    "user_id" uuid REFERENCES "app"."users"("id") ON DELETE SET NULL,
    "session_id" varchar(100),
    "ip_address" inet,
    "user_agent" text,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."reports" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" varchar(100) NOT NULL,
    "report_type" varchar(50) NOT NULL,
    "parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "generated_by" uuid NOT NULL REFERENCES "app"."users"("id"),
    "file_url" text,
    "status" varchar(20) DEFAULT 'pending' CHECK ("status" IN ('pending', 'generating', 'completed', 'failed')),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completed_at" timestamp
);

CREATE TABLE "app"."audit_logs" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" uuid REFERENCES "app"."users"("id") ON DELETE SET NULL,
    "action" varchar(100) NOT NULL,
    "table_name" varchar(50),
    "record_id" uuid,
    "old_values" jsonb,
    "new_values" jsonb,
    "ip_address" inet,
    "user_agent" text,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."system_settings" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "setting_key" varchar(100) NOT NULL UNIQUE,
    "setting_value" text,
    "description" text,
    "is_encrypted" boolean DEFAULT false,
    "updated_by" uuid REFERENCES "app"."users"("id"),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."company_settings" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "company_name" varchar(100) NOT NULL,
    "address" text,
    "phone" varchar(20),
    "email" varchar(100),
    "website" varchar(100),
    "registration_number" varchar(50),
    "tax_number" varchar(50),
    "logo_url" text,
    "currency" varchar(3) DEFAULT 'MYR' NOT NULL,
    "tax_rate" numeric(5, 2) DEFAULT 6.00 NOT NULL,
    "invoice_prefix" varchar(10) DEFAULT 'INV' NOT NULL,
    "quotation_prefix" varchar(10) DEFAULT 'QTN' NOT NULL,
    "ticket_prefix" varchar(10) DEFAULT 'TKT' NOT NULL,
    "updated_by" uuid REFERENCES "app"."users"("id"),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."user_sessions" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" uuid NOT NULL REFERENCES "app"."users"("id") ON DELETE CASCADE,
    "session_token" varchar(255) NOT NULL UNIQUE,
    "expires_at" timestamp NOT NULL,
    "ip_address" inet,
    "user_agent" text,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "last_accessed" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "app"."backup_logs" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "filename" varchar(255) NOT NULL,
    "file_size" bigint,
    "backup_type" varchar(20) NOT NULL CHECK ("backup_type" IN ('full', 'incremental')),
    "status" varchar(20) NOT NULL CHECK ("status" IN ('started', 'completed', 'failed')),
    "started_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completed_at" timestamp,
    "notes" text
);

CREATE TABLE "app"."api_keys" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" varchar(100) NOT NULL,
    "key_hash" varchar(255) NOT NULL UNIQUE,
    "permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "last_used_at" timestamp,
    "expires_at" timestamp,
    "is_active" boolean DEFAULT true,
    "created_by" uuid NOT NULL REFERENCES "app"."users"("id"),
    "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX "idx_customers_phone" ON "app"."customers" ("phone");
CREATE INDEX "idx_customers_name" ON "app"."customers" ("name");
CREATE INDEX "idx_customers_email" ON "app"."customers" ("email");
CREATE INDEX "idx_customers_created_at" ON "app"."customers" ("created_at");

CREATE INDEX "idx_tickets_customer_id" ON "app"."tickets" ("customer_id");
CREATE INDEX "idx_tickets_status" ON "app"."tickets" ("status");
CREATE INDEX "idx_tickets_assigned_to" ON "app"."tickets" ("assigned_to");
CREATE INDEX "idx_tickets_created_at" ON "app"."tickets" ("created_at");
CREATE INDEX "idx_tickets_ticket_number" ON "app"."tickets" ("ticket_number");

CREATE INDEX "idx_products_sku" ON "app"."products" ("sku");
CREATE INDEX "idx_products_category" ON "app"."products" ("category");
CREATE INDEX "idx_products_name" ON "app"."products" ("name");
CREATE INDEX "idx_products_stock_quantity" ON "app"."products" ("stock_quantity");

CREATE INDEX "idx_quotations_customer_id" ON "app"."quotations" ("customer_id");
CREATE INDEX "idx_quotations_status" ON "app"."quotations" ("status");
CREATE INDEX "idx_quotations_valid_until" ON "app"."quotations" ("valid_until");
CREATE INDEX "idx_quotations_quotation_number" ON "app"."quotations" ("quotation_number");

CREATE INDEX "idx_invoices_customer_id" ON "app"."invoices" ("customer_id");
CREATE INDEX "idx_invoices_status" ON "app"."invoices" ("status");
CREATE INDEX "idx_invoices_due_date" ON "app"."invoices" ("due_date");
CREATE INDEX "idx_invoices_invoice_number" ON "app"."invoices" ("invoice_number");
CREATE INDEX "idx_invoices_created_at" ON "app"."invoices" ("created_at");

CREATE INDEX "idx_payments_invoice_id" ON "app"."payments" ("invoice_id");
CREATE INDEX "idx_payments_payment_method" ON "app"."payments" ("payment_method");
CREATE INDEX "idx_payments_payment_date" ON "app"."payments" ("payment_date");
CREATE INDEX "idx_payments_status" ON "app"."payments" ("status");

CREATE INDEX "idx_ai_conversations_customer_id" ON "app"."ai_conversations" ("customer_id");
CREATE INDEX "idx_ai_conversations_intent" ON "app"."ai_conversations" ("intent");
CREATE INDEX "idx_ai_conversations_created_at" ON "app"."ai_conversations" ("created_at");
CREATE INDEX "idx_customer_sentiments_customer_id" ON "app"."customer_sentiments" ("customer_id");
CREATE INDEX "idx_customer_sentiments_sentiment_label" ON "app"."customer_sentiments" ("sentiment_label");

CREATE INDEX "idx_whatsapp_sessions_customer_id" ON "app"."whatsapp_sessions" ("customer_id");
CREATE INDEX "idx_whatsapp_sessions_phone_number" ON "app"."whatsapp_sessions" ("phone_number");
CREATE INDEX "idx_whatsapp_messages_session_id" ON "app"."whatsapp_messages" ("session_id");
CREATE INDEX "idx_whatsapp_messages_direction" ON "app"."whatsapp_messages" ("direction");
CREATE INDEX "idx_whatsapp_messages_timestamp" ON "app"."whatsapp_messages" ("timestamp");

CREATE INDEX "idx_audit_logs_user_id" ON "app"."audit_logs" ("user_id");
CREATE INDEX "idx_audit_logs_action" ON "app"."audit_logs" ("action");
CREATE INDEX "idx_audit_logs_table_name" ON "app"."audit_logs" ("table_name");
CREATE INDEX "idx_audit_logs_created_at" ON "app"."audit_logs" ("created_at");

CREATE INDEX "idx_users_username" ON "app"."users" ("username");
CREATE INDEX "idx_users_email" ON "app"."users" ("email");
CREATE INDEX "idx_user_sessions_user_id" ON "app"."user_sessions" ("user_id");

ALTER TABLE "app"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."quotations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."ai_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."audit_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_isolation_policy" ON "app"."users"
    FOR ALL
    USING ("id" = auth.uid() OR "role" = 'admin')
    WITH CHECK ("id" = auth.uid() OR "role" = 'admin');

CREATE POLICY "customer_access_policy" ON "app"."customers"
    FOR SELECT
    USING (true);

CREATE POLICY "customer_insert_policy" ON "app"."customers"
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "customer_update_policy" ON "app"."customers"
    FOR UPDATE
    USING (
        "created_by" = auth.uid()
        OR EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" = 'admin'
        )
    );

CREATE POLICY "customer_delete_policy" ON "app"."customers"
    FOR DELETE
    USING (
        "created_by" = auth.uid()
        OR EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" = 'admin'
        )
    );

CREATE POLICY "ticket_select_policy" ON "app"."tickets"
    FOR SELECT
    USING (
        "assigned_to" = auth.uid()
        OR "created_by" = auth.uid()
        OR EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" IN ('admin', 'staff')
        )
    );

CREATE POLICY "ticket_insert_policy" ON "app"."tickets"
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "ticket_update_policy" ON "app"."tickets"
    FOR UPDATE
    USING (
        "assigned_to" = auth.uid()
        OR "created_by" = auth.uid()
        OR EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" = 'admin'
        )
    );

CREATE POLICY "ticket_delete_policy" ON "app"."tickets"
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" = 'admin'
        )
    );

CREATE POLICY "quotation_select_policy" ON "app"."quotations"
    FOR SELECT
    USING (
        "created_by" = auth.uid()
        OR EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" IN ('admin', 'staff')
        )
    );

CREATE POLICY "quotation_insert_policy" ON "app"."quotations"
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "quotation_update_policy" ON "app"."quotations"
    FOR UPDATE
    USING (
        "created_by" = auth.uid()
        OR EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" = 'admin'
        )
    );

CREATE POLICY "quotation_delete_policy" ON "app"."quotations"
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" = 'admin'
        )
    );

CREATE POLICY "invoice_select_policy" ON "app"."invoices"
    FOR SELECT
    USING (
        "created_by" = auth.uid()
        OR EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" IN ('admin', 'staff')
        )
    );

CREATE POLICY "invoice_insert_policy" ON "app"."invoices"
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "invoice_update_policy" ON "app"."invoices"
    FOR UPDATE
    USING (
        "created_by" = auth.uid()
        OR EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" = 'admin'
        )
    );

CREATE POLICY "invoice_delete_policy" ON "app"."invoices"
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" = 'admin'
        )
    );

CREATE POLICY "payment_select_policy" ON "app"."payments"
    FOR SELECT
    USING (
        "received_by" = auth.uid()
        OR EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" IN ('admin', 'staff')
        )
    );

CREATE POLICY "payment_insert_policy" ON "app"."payments"
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "payment_update_policy" ON "app"."payments"
    FOR UPDATE
    USING (
        "received_by" = auth.uid()
        OR EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" = 'admin'
        )
    );

CREATE POLICY "ai_conversation_select_policy" ON "app"."ai_conversations"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" IN ('admin', 'staff')
        )
    );

CREATE POLICY "ai_conversation_insert_policy" ON "app"."ai_conversations"
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "audit_log_select_policy" ON "app"."audit_logs"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "app"."users" u WHERE u."id" = auth.uid() AND u."role" = 'admin'
        )
    );

CREATE POLICY "audit_log_insert_policy" ON "app"."audit_logs"
    FOR INSERT
    WITH CHECK (true);
