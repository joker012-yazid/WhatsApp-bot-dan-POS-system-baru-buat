

# Technical Documentation: WhatsApp POS System Requirements

## 1. Fitur-Fitur Utama

### 1.1 WhatsApp Bot Integration
- **Auto-reply System**: Respon otomatis untuk pesan masuk dengan AI-powered intent recognition
- **Status Checking**: Pelanggan dapat memeriksa status perbaikan melalui WhatsApp
- **Appointment Booking**: Sistem penjadwalan janji temu otomatis
- **Quotation & Invoice Delivery**: Pengiriman quotation dan invoice via WhatsApp
- **Payment Reminders**: Pengingat pembayaran otomatis
- **Customer Support**: Layanan pelanggan 24/7 dengan AI chatbot

### 1.2 CRM (Customer Relationship Management)
- **Customer Management**: Profil pelanggan lengkap dengan riwayat interaksi
- **Interaction Tracking**: Jejak semua interaksi WhatsApp, tiket, dan transaksi
- **Customer Segmentation**: Segmentasi pelanggan berdasarkan perilaku dan nilai
- **Feedback System**: Sistem pengumpulan dan analisis feedback pelanggan
- **Customer Analytics**: Dashboard analitik perilaku pelanggan
- **Notes System**: Catatan internal untuk setiap pelanggan

### 1.3 POS (Point of Sale) System
- **Quotation Management**: Pembuatan, pengiriman, dan pelacakan quotation
- **Invoice Generation**: Generate invoice otomatis dengan perhitungan pajak
- **Payment Processing**: Proses pembayaran multi-metode (cash, card, e-wallet, transfer)
- **Inventory Management**: Manajemen stok real-time dengan alert otomatis
- **Product Catalog**: Katalog produk dan layanan dengan harga dinamis
- **Tax Calculation**: Perhitungan pajak otomatis (SST 6%)
- **Reporting System**: Laporan penjualan, inventory, dan keuangan

### 1.4 AI-Powered Features
- **Smart Responses**: Respon WhatsApp yang dipersonalisasi berdasarkan konteks
- **Intent Recognition**: Identifikasi otomatis intent pelanggan (greeting, inquiry, complaint, etc.)
- **Sentiment Analysis**: Analisis sentimen pelanggan dari pesan WhatsApp
- **Product Recommendations**: Rekomendasi produk berdasarkan riwayat pembelian
- **Business Insights**: Generate insight otomatis dari data bisnis
- **Predictive Analytics**: Prediksi kebutuhan inventory dan perilaku pelanggan

### 1.5 Ticket Management System
- **Ticket Creation**: Pembuatan tiket otomatis dari WhatsApp
- **Status Tracking**: Pelacakan status perbaikan (pending, in_progress, completed)
- **Technician Assignment**: Penugasan teknisi untuk setiap tiket
- **Progress Updates**: Update progress perbaikan dengan gambar
- **Cost Estimation**: Estimasi biaya perbaikan dengan persetujuan pelanggan
- **Ticket Analytics**: Dashboard analitik tiket dan performa teknisi

### 1.6 Security & Compliance
- **User Authentication**: Sistem autentikasi dengan role-based access control
- **Data Encryption**: Enkripsi data sensitif pelanggan
- **Audit Trail**: Log semua aktivitas sistem untuk kepatuhan
- **GDPR Compliance**: Manajemen data pelanggan sesuai GDPR
- **Row Level Security**: Keamanan data tingkat baris di database
- **Backup & Recovery**: Sistem backup otomatis dan recovery

## 2. Alur User (User Flow)

### 2.1 Alur Pelanggan (Customer Flow)

```
1. Pelanggan mengirim pesan WhatsApp
   ↓
2. AI Bot menganalisis intent dan merespons
   ↓
3. Jika diperlukan, bot meminta informasi tambahan
   ↓
4. Untuk perbaikan:
   - Bot mengumpulkan informasi perangkat
   - Generate QR code untuk check-in
   - Pelanggan scan QR dan isi form
   ↓
5. Sistem membuat tiket otomatis
   ↓
6. Teknisi memeriksa perangkat dan memberikan estimasi biaya
   ↓
7. Bot mengirim quotation ke pelanggan via WhatsApp
   ↓
8. Pelanggan menyetujui atau menolak quotation
   ↓
9. Jika disetujui:
   - Teknisi melakukan perbaikan
   - Bot mengirim update progress dengan gambar
   - Bot mengirim invoice setelah selesai
   ↓
10. Pelanggan melakukan pembayaran
    ↓
11. Pelanggan mengambil perangkat dan memberikan feedback
```

### 2.2 Alur Staff/Karyawan (Staff Flow)

```
1. Staff login ke sistem web
   ↓
2. Dashboard menampilkan:
   - Statistik bisnis real-time
   - Tiket yang perlu ditangani
   - Notifikasi penting
   ↓
3. Manajemen Pelanggan:
   - Melihat profil pelanggan
   - Menambah catatan internal
   - Melihat riwayat interaksi
   ↓
4. Manajemen Tiket:
   - Melihat semua tiket
   - Update status tiket
   - Upload gambar progress
   - Menambahkan catatan teknisi
   ↓
5. Operasi POS:
   - Membuat quotation
   - Mengkonversi quotation ke invoice
   - Memproses pembayaran
   - Mengelola inventory
   ↓
6. Analitik & Laporan:
   - Melihat dashboard CRM
   - Menganalisis AI insights
   - Generate laporan keuangan
   ↓
7. Manajemen Sistem:
   - Mengelola produk
   - Mengatur pengguna
   - Melihat log aktivitas
```

### 2.3 Alur Administrator (Admin Flow)

```
1. Admin login ke sistem
   ↓
2. Dashboard Administrator:
   - Overview sistem
   - Health monitoring
   - Security alerts
   ↓
3. Manajemen Pengguna:
   - Membuat/mengedit user
   - Mengatur role dan permission
   - Reset password
   ↓
4. Konfigurasi Sistem:
   - Pengaturan WhatsApp
   - Konfigurasi AI
   - Pengaturan email
   - Pengaturan backup
   ↓
5. Monitoring & Maintenance:
   - Melihat log sistem
   - Monitor performance
   - Generate backup
   - Update sistem
   ↓
6. Keamanan & Kepatuhan:
   - Audit log
   - Security reports
   - GDPR compliance
   ↓
7. Integrasi & API:
   - Mengelola API keys
   - Monitor webhook
   - Konfigurasi third-party integrations
```

## 3. Database Schema Lengkap dengan RLS (PostgreSQL)

### 3.1 Core Tables

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schema for RLS policies
CREATE SCHEMA IF NOT EXISTS app;

-- Users Table
CREATE TABLE app.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff', 'technician')),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE app.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    address TEXT,
    company_name VARCHAR(100),
    customer_type VARCHAR(20) DEFAULT 'individual' CHECK (customer_type IN ('individual', 'business')),
    notes TEXT,
    created_by UUID REFERENCES app.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE app.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    barcode VARCHAR(50),
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    unit_of_measure VARCHAR(20) DEFAULT 'unit',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES app.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets Table
CREATE TABLE app.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
    device_type VARCHAR(50) NOT NULL,
    device_model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(50),
    problem_description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'diagnosing', 'approved', 'in_progress', 'completed', 'ready_for_pickup', 'picked_up', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    estimated_completion_date DATE,
    technician_notes TEXT,
    assigned_to UUID REFERENCES app.users(id),
    created_by UUID REFERENCES app.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Updates Table
CREATE TABLE app.ticket_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES app.tickets(id) ON DELETE CASCADE,
    update_type VARCHAR(50) NOT NULL,
    description TEXT,
    image_url TEXT,
    updated_by UUID NOT NULL REFERENCES app.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotations Table
CREATE TABLE app.quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES app.tickets(id) ON DELETE SET NULL,
    valid_until DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 6.00,
    tax_amount DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    notes TEXT,
    terms TEXT,
    created_by UUID NOT NULL REFERENCES app.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotation Items Table
CREATE TABLE app.quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES app.quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES app.products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices Table
CREATE TABLE app.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES app.tickets(id) ON DELETE SET NULL,
    quotation_id UUID REFERENCES app.quotations(id) ON DELETE SET NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 6.00,
    tax_amount DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    balance DECIMAL(10,2) GENERATED ALWAYS AS (total - paid_amount) STORED,
    payment_method VARCHAR(20),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES app.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Items Table
CREATE TABLE app.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES app.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES app.products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE app.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(20) UNIQUE NOT NULL,
    invoice_id UUID NOT NULL REFERENCES app.invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'ewallet', 'cheque')),
    payment_reference VARCHAR(100),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    notes TEXT,
    received_by UUID NOT NULL REFERENCES app.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Movements Table
CREATE TABLE app.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'return')),
    quantity INTEGER NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES app.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 AI & Communication Tables

```sql
-- WhatsApp Sessions Table
CREATE TABLE app.whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES app.customers(id) ON DELETE CASCADE,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Messages Table
CREATE TABLE app.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES app.whatsapp_sessions(id) ON DELETE CASCADE,
    message_id VARCHAR(100),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_content TEXT NOT NULL,
    media_type VARCHAR(20),
    media_url TEXT,
    status VARCHAR(20) DEFAULT 'delivered',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Conversations Table
CREATE TABLE app.ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES app.customers(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    message_content TEXT NOT NULL,
    response_content TEXT NOT NULL,
    intent VARCHAR(50),
    confidence_score DECIMAL(5,4),
    sentiment_score DECIMAL(5,4),
    sentiment_label VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Intents Table
CREATE TABLE app.ai_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intent_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    keywords TEXT[],
    response_template TEXT,
    action_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Sentiments Table
CREATE TABLE app.customer_sentiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES app.tickets(id) ON DELETE SET NULL,
    message_id UUID REFERENCES app.whatsapp_messages(id) ON DELETE SET NULL,
    sentiment_score DECIMAL(5,4),
    sentiment_label VARCHAR(20) CHECK (sentiment_label IN ('positive', 'neutral', 'negative')),
    confidence DECIMAL(5,4),
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Recommendations Table
CREATE TABLE app.ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN ('similar', 'complementary', 'frequently_bought_together')),
    confidence_score DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    clicked BOOLEAN DEFAULT false,
    purchased BOOLEAN DEFAULT false
);

-- AI Insights Table
CREATE TABLE app.ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('customer_behavior', 'sales_trend', 'inventory_prediction', 'sentiment_analysis')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    data JSONB,
    confidence_score DECIMAL(5,4),
    is_actionable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES app.users(id),
    acknowledged_at TIMESTAMP
);
```

### 3.3 CRM & Analytics Tables

```sql
-- Customer Interactions Table
CREATE TABLE app.customer_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('whatsapp', 'call', 'email', 'visit', 'ticket', 'purchase')),
    interaction_id UUID,
    description TEXT,
    direction VARCHAR(20) CHECK (direction IN ('inbound', 'outbound')),
    created_by UUID REFERENCES app.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Feedback Table
CREATE TABLE app.customer_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES app.tickets(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES app.invoices(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    feedback_source VARCHAR(50) DEFAULT 'whatsapp',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Preferences Table
CREATE TABLE app.customer_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID UNIQUE NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
    preferred_contact_method VARCHAR(20) DEFAULT 'whatsapp',
    notification_preferences JSONB DEFAULT '{}',
    marketing_consent BOOLEAN DEFAULT true,
    language_preference VARCHAR(10) DEFAULT 'ms',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics Events Table
CREATE TABLE app.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    customer_id UUID REFERENCES app.customers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES app.users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports Table
CREATE TABLE app.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    parameters JSONB DEFAULT '{}',
    generated_by UUID NOT NULL REFERENCES app.users(id),
    file_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

### 3.4 System & Security Tables

```sql
-- Audit Log Table
CREATE TABLE app.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES app.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Settings Table
CREATE TABLE app.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES app.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Company Settings Table
CREATE TABLE app.company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(100),
    registration_number VARCHAR(50),
    tax_number VARCHAR(50),
    logo_url TEXT,
    currency VARCHAR(3) DEFAULT 'MYR',
    tax_rate DECIMAL(5,2) DEFAULT 6.00,
    invoice_prefix VARCHAR(10) DEFAULT 'INV',
    quotation_prefix VARCHAR(10) DEFAULT 'QTN',
    ticket_prefix VARCHAR(10) DEFAULT 'TKT',
    updated_by UUID REFERENCES app.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Sessions Table
CREATE TABLE app.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backup Logs Table
CREATE TABLE app.backup_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT,
    backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('full', 'incremental')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT
);

-- API Keys Table
CREATE TABLE app.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '[]',
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES app.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.5 Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users Table RLS
CREATE POLICY users_isolation_policy ON app.users
    FOR ALL
    USING (id = auth.uid() OR role = 'admin');

-- Customers Table RLS
CREATE POLICY customer_access_policy ON app.customers
    FOR SELECT
    USING (true); -- All authenticated users can view customers
    
CREATE POLICY customer_insert_policy ON app.customers
    FOR INSERT
    WITH CHECK (true); -- All authenticated users can insert customers
    
CREATE POLICY customer_update_policy ON app.customers
    FOR UPDATE
    USING (created_by = auth.uid() OR role = 'admin');
    
CREATE POLICY customer_delete_policy ON app.customers
    FOR DELETE
    USING (created_by = auth.uid() OR role = 'admin');

-- Tickets Table RLS
CREATE POLICY ticket_select_policy ON app.tickets
    FOR SELECT
    USING (
        assigned_to = auth.uid() OR 
        created_by = auth.uid() OR 
        role IN ('admin', 'staff')
    );
    
CREATE POLICY ticket_insert_policy ON app.tickets
    FOR INSERT
    WITH CHECK (true); -- All authenticated users can create tickets
    
CREATE POLICY ticket_update_policy ON app.tickets
    FOR UPDATE
    USING (
        assigned_to = auth.uid() OR 
        created_by = auth.uid() OR 
        role = 'admin'
    );
    
CREATE POLICY ticket_delete_policy ON app.tickets
    FOR DELETE
    USING (role = 'admin');

-- Quotations Table RLS
CREATE POLICY quotation_select_policy ON app.quotations
    FOR SELECT
    USING (
        created_by = auth.uid() OR 
        role IN ('admin', 'staff')
    );
    
CREATE POLICY quotation_insert_policy ON app.quotations
    FOR INSERT
    WITH CHECK (true);
    
CREATE POLICY quotation_update_policy ON app.quotations
    FOR UPDATE
    USING (created_by = auth.uid() OR role = 'admin');
    
CREATE POLICY quotation_delete_policy ON app.quotations
    FOR DELETE
    USING (role = 'admin');

-- Invoices Table RLS
CREATE POLICY invoice_select_policy ON app.invoices
    FOR SELECT
    USING (
        created_by = auth.uid() OR 
        role IN ('admin', 'staff')
    );
    
CREATE POLICY invoice_insert_policy ON app.invoices
    FOR INSERT
    WITH CHECK (true);
    
CREATE POLICY invoice_update_policy ON app.invoices
    FOR UPDATE
    USING (created_by = auth.uid() OR role = 'admin');
    
CREATE POLICY invoice_delete_policy ON app.invoices
    FOR DELETE
    USING (role = 'admin');

-- Payments Table RLS
CREATE POLICY payment_select_policy ON app.payments
    FOR SELECT
    USING (
        received_by = auth.uid() OR 
        role IN ('admin', 'staff')
    );
    
CREATE POLICY payment_insert_policy ON app.payments
    FOR INSERT
    WITH CHECK (true);
    
CREATE POLICY payment_update_policy ON app.payments
    FOR UPDATE
    USING (received_by = auth.uid() OR role = 'admin');

-- AI Conversations Table RLS
CREATE POLICY ai_conversation_select_policy ON app.ai_conversations
    FOR SELECT
    USING (role IN ('admin', 'staff'));
    
CREATE POLICY ai_conversation_insert_policy ON app.ai_conversations
    FOR INSERT
    WITH CHECK (true);

-- Audit Logs Table RLS
CREATE POLICY audit_log_select_policy ON app.audit_logs
    FOR SELECT
    USING (role = 'admin');
    
CREATE POLICY audit_log_insert_policy ON app.audit_logs
    FOR INSERT
    WITH CHECK (true);
```

### 3.6 Indexes for Performance

```sql
-- Customer Indexes
CREATE INDEX idx_customers_phone ON app.customers(phone);
CREATE INDEX idx_customers_name ON app.customers(name);
CREATE INDEX idx_customers_email ON app.customers(email);
CREATE INDEX idx_customers_created_at ON app.customers(created_at);

-- Ticket Indexes
CREATE INDEX idx_tickets_customer_id ON app.tickets(customer_id);
CREATE INDEX idx_tickets_status ON app.tickets(status);
CREATE INDEX idx_tickets_assigned_to ON app.tickets(assigned_to);
CREATE INDEX idx_tickets_created_at ON app.tickets(created_at);
CREATE INDEX idx_tickets_ticket_number ON app.tickets(ticket_number);

-- Product Indexes
CREATE INDEX idx_products_sku ON app.products(sku);
CREATE INDEX idx_products_category ON app.products(category);
CREATE INDEX idx_products_name ON app.products(name);
CREATE INDEX idx_products_stock_quantity ON app.products(stock_quantity);

-- Quotation Indexes
CREATE INDEX idx_quotations_customer_id ON app.quotations(customer_id);
CREATE INDEX idx_quotations_status ON app.quotations(status);
CREATE INDEX idx_quotations_valid_until ON app.quotations(valid_until);
CREATE INDEX idx_quotations_quotation_number ON app.quotations(quotation_number);

-- Invoice Indexes
CREATE INDEX idx_invoices_customer_id ON app.invoices(customer_id);
CREATE INDEX idx_invoices_status ON app.invoices(status);
CREATE INDEX idx_invoices_due_date ON app.invoices(due_date);
CREATE INDEX idx_invoices_invoice_number ON app.invoices(invoice_number);
CREATE INDEX idx_invoices_created_at ON app.invoices(created_at);

-- Payment Indexes
CREATE INDEX idx_payments_invoice_id ON app.payments(invoice_id);
CREATE INDEX idx_payments_payment_method ON app.payments(payment_method);
CREATE INDEX idx_payments_payment_date ON app.payments(payment_date);
CREATE INDEX idx_payments_status ON app.payments(status);

-- AI Indexes
CREATE INDEX idx_ai_conversations_customer_id ON app.ai_conversations(customer_id);
CREATE INDEX idx_ai_conversations_intent ON app.ai_conversations(intent);
CREATE INDEX idx_ai_conversations_created_at ON app.ai_conversations(created_at);
CREATE INDEX idx_customer_sentiments_customer_id ON app.customer_sentiments(customer_id);
CREATE INDEX idx_customer_sentiments_sentiment_label ON app.customer_sentiments(sentiment_label);

-- WhatsApp Indexes
CREATE INDEX idx_whatsapp_sessions_customer_id ON app.whatsapp_sessions(customer_id);
CREATE INDEX idx_whatsapp_sessions_phone_number ON app.whatsapp_sessions(phone_number);
CREATE INDEX idx_whatsapp_messages_session_id ON app.whatsapp_messages(session_id);
CREATE INDEX idx_whatsapp_messages_direction ON app.whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_timestamp ON app.whatsapp_messages(timestamp);

-- Audit Indexes
CREATE INDEX idx_audit_logs_user_id ON app.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON app.audit_logs(action);
CREATE INDEX idx_audit_logs_table_name ON app.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON app.audit_logs(created_at);
```

### 3.7 Triggers for Data Integrity

```sql
-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON app.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON app.customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON app.tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON app.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON app.quotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON app.invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update ticket status when all updates are completed
CREATE OR REPLACE FUNCTION check_ticket_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        -- Update customer last interaction
        UPDATE app.customers 
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER ticket_completion_trigger AFTER UPDATE ON app.tickets
    FOR EACH ROW EXECUTE FUNCTION check_ticket_completion();

-- Update product stock when invoice is created
CREATE OR REPLACE FUNCTION update_product_stock_on_invoice()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN SELECT * FROM app.invoice_items WHERE invoice_id = NEW.id
    LOOP
        UPDATE app.products 
        SET stock_quantity = stock_quantity - item.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = item.product_id;
        
        INSERT INTO app.inventory_movements (
            product_id, movement_type, quantity, reference_type, reference_id, created_by
        ) VALUES (
            item.product_id, 'out', item.quantity, 'sale', NEW.id, NEW.created_by
        );
    END LOOP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER invoice_stock_update_trigger AFTER INSERT ON app.invoices
    FOR EACH ROW EXECUTE FUNCTION update_product_stock_on_invoice();

-- Create audit log for data changes
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO app.audit_logs (
            user_id, action, table_name, record_id, old_values, new_values
        ) VALUES (
            current_setting('app.current_user_id', true)::UUID,
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            jsonb_build_object(
                'old', ROW(OLD.*)
            ),
            jsonb_build_object(
                'new', ROW(NEW.*)
            )
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO app.audit_logs (
            user_id, action, table_name, record_id, old_values
        ) VALUES (
            current_setting('app.current_user_id', true)::UUID,
            TG_OP,
            TG_TABLE_NAME,
            OLD.id,
            jsonb_build_object(
                'old', ROW(OLD.*)
            )
        );
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO app.audit_logs (
            user_id, action, table_name, record_id, new_values
        ) VALUES (
            current_setting('app.current_user_id', true)::UUID,
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            jsonb_build_object(
                'new', ROW(NEW.*)
            )
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Apply audit logging to key tables
CREATE TRIGGER users_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON app.users
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER customers_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON app.customers
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER tickets_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON app.tickets
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER invoices_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON app.invoices
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
```

### 3.8 Views for Common Queries

```sql
-- Customer Dashboard View
CREATE OR REPLACE VIEW app.customer_dashboard_view AS
SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    COUNT(DISTINCT t.id) as total_tickets,
    COUNT(DISTINCT i.id) as total_invoices,
    COALESCE(SUM(i.total), 0) as total_spent,
    MAX(t.created_at) as last_ticket_date,
    MAX(i.created_at) as last_invoice_date,
    AVG(cf.rating) as average_rating,
    COUNT(DISTINCT cf.id) as total_feedback
FROM app.customers c
LEFT JOIN app.tickets t ON c.id = t.customer_id
LEFT JOIN app.invoices i ON c.id = i.customer_id
LEFT JOIN app.customer_feedback cf ON c.id = cf.customer_id
GROUP BY c.id, c.name, c.phone, c.email;

-- Ticket Status View
CREATE OR REPLACE VIEW app.ticket_status_view AS
SELECT 
    t.id,
    t.ticket_number,
    t.status,
    t.priority,
    c.name as customer_name,
    c.phone as customer_phone,
    t.device_type,
    t.device_model,
    t.estimated_cost,
    t.actual_cost,
    u.full_name as assigned_technician,
    t.created_at,
    t.updated_at,
    CASE 
        WHEN t.status = 'pending' THEN 'Menunggu diagnosis'
        WHEN t.status = 'diagnosing' THEN 'Sedang diperiksa'
        WHEN t.status = 'approved' THEN 'Menunggu persetujuan'
        WHEN t.status = 'in_progress' THEN 'Sedang dibaiki'
        WHEN t.status = 'completed' THEN 'Selesai dibaiki'
        WHEN t.status = 'ready_for_pickup' THEN 'Siap diambil'
        WHEN t.status = 'picked_up' THEN 'Telah diambil'
        WHEN t.status = 'cancelled' THEN 'Dibatalkan'
    END as status_description
FROM app.tickets t
LEFT JOIN app.customers c ON t.customer_id = c.id
LEFT JOIN app.users u ON t.assigned_to = u.id;

-- Inventory Status View
CREATE OR REPLACE VIEW app.inventory_status_view AS
SELECT 
    p.id,
    p.name,
    p.category,
    p.sku,
    p.price,
    p.cost,
    p.stock_quantity,
    p.reorder_level,
    CASE 
        WHEN p.stock_quantity <= p.reorder_level THEN 'critical'
        WHEN p.stock_quantity <= p.reorder_level * 2 THEN 'low'
        ELSE 'normal'
    END as stock_status,
    (p.stock_quantity * p.price) as inventory_value,
    COUNT(im.id) as total_movements,
    MAX(im.created_at) as last_movement_date
FROM app.products p
LEFT JOIN app.inventory_movements im ON p.id = im.product_id
GROUP BY p.id, p.name, p.category, p.sku, p.price, p.cost, p.stock_quantity, p.reorder_level;

-- Financial Summary View
CREATE OR REPLACE VIEW app.financial_summary_view AS
SELECT 
    DATE_TRUNC('month', i.created_at) as month,
    COUNT(DISTINCT i.id) as total_invoices,
    COUNT(DISTINCT i.customer_id) as unique_customers,
    COALESCE(SUM(i.subtotal), 0) as total_subtotal,
    COALESCE(SUM(i.tax_amount), 0) as total_tax,
    COALESCE(SUM(i.total), 0) as total_revenue,
    COALESCE(SUM(i.paid_amount), 0) as total_paid,
    COALESCE(SUM(i.balance), 0) as total_outstanding,
    COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_invoices
FROM app.invoices i
GROUP BY DATE_TRUNC('month', i.created_at)
ORDER BY month DESC;

-- AI Insights View
CREATE OR REPLACE VIEW app.ai_insights_view AS
SELECT 
    ai.id,
    ai.insight_type,
    ai.title,
    ai.description,
    ai.confidence_score,
    ai.is_actionable,
    ai.acknowledged,
    ai.created_at,
    CASE 
        WHEN ai.insight_type = 'customer_behavior' THEN 'Perilaku Pelanggan'
        WHEN ai.insight_type = 'sales_trend' THEN 'Trend Penjualan'
        WHEN ai.insight_type = 'inventory_prediction' THEN 'Prediksi Inventori'
        WHEN ai.insight_type = 'sentiment_analysis' THEN 'Analisis Sentimen'
    END as insight_type_description
FROM app.ai_insights ai
ORDER BY ai.created_at DESC;
```

Database schema ini menyediakan fondasi yang kuat untuk WhatsApp POS System dengan:
- **Struktur data yang terorganisir** untuk semua fitur utama
- **Row Level Security (RLS)** untuk memastikan keamanan data
- **Trigger dan fungsi** untuk menjaga integritas data
- **Index yang dioptimalkan** untuk performa query
- **View yang berguna** untuk laporan dan dashboard
- **Audit trail lengkap** untuk kepatuhan dan debugging

Schema ini dirancang untuk:
- **Skalabilitas**: Dapat menangani pertumbuhan data dan pengguna
- **Keamanan**: Perlindungan data tingkat baris dengan RLS
- **Performa**: Query cepat dengan indexing yang tepat
- **Integritas**: Trigger dan constraint untuk validasi data
- **Kepatuhan**: Audit trail untuk regulasi seperti GDPR
