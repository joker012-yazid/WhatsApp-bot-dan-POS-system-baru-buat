CREATE TYPE "invoice_status" AS ENUM ('draft', 'sent', 'due', 'overdue', 'paid', 'void');
CREATE TYPE "quotation_status" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
CREATE TYPE "wa_message_direction" AS ENUM ('inbound', 'outbound');
CREATE TYPE "wa_message_status" AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed', 'received', 'deleted');

CREATE TABLE "customers" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" varchar(120) NOT NULL,
    "phone" varchar(32) NOT NULL UNIQUE,
    "email" varchar(120),
    "company" varchar(120),
    "notes" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "products" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" varchar(160) NOT NULL,
    "sku" varchar(64) UNIQUE,
    "description" text,
    "price" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "quotations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "number" varchar(40) NOT NULL UNIQUE,
    "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
    "status" "quotation_status" DEFAULT 'draft' NOT NULL,
    "valid_until" date NOT NULL,
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 0 NOT NULL,
    "tax_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "notes" text,
    "terms" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "quotation_items" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "quotation_id" uuid NOT NULL REFERENCES "quotations"("id") ON DELETE CASCADE,
    "product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL,
    "description" text NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "discount" numeric(12,2) DEFAULT 0 NOT NULL,
    "total" numeric(12,2) NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "invoices" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "number" varchar(40) NOT NULL UNIQUE,
    "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
    "quotation_id" uuid REFERENCES "quotations"("id") ON DELETE SET NULL,
    "status" "invoice_status" DEFAULT 'draft' NOT NULL,
    "issued_at" date DEFAULT CURRENT_DATE NOT NULL,
    "due_at" date,
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 0 NOT NULL,
    "tax_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "paid_total" numeric(12,2) DEFAULT 0 NOT NULL,
    "balance" numeric(12,2),
    "notes" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "invoice_items" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "invoice_id" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
    "product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL,
    "description" text NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "discount" numeric(12,2) DEFAULT 0 NOT NULL,
    "total" numeric(12,2) NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "wa_messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
    "session_id" varchar(255) NOT NULL,
    "external_id" varchar(255),
    "direction" "wa_message_direction" NOT NULL,
    "status" "wa_message_status" DEFAULT 'pending' NOT NULL,
    "body" text NOT NULL,
    "sent_at" timestamp DEFAULT now() NOT NULL,
    "metadata" jsonb
);

CREATE INDEX "idx_quotation_items_quotation" ON "quotation_items" ("quotation_id");
CREATE INDEX "idx_invoice_items_invoice" ON "invoice_items" ("invoice_id");
CREATE INDEX "idx_wa_messages_session" ON "wa_messages" ("session_id");
CREATE INDEX "idx_wa_messages_customer" ON "wa_messages" ("customer_id");
