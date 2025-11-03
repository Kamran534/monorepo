-- ============================================================================
-- POS SYSTEM - PHASE 1 MVP (NORMALIZED DATABASE SCHEMA)
-- SQLite Database with Full Normalization & Proper Joins
-- ============================================================================
-- Phase 1 Scope:
-- 1. Products & Variants (basic)
-- 2. Inventory tracking
-- 3. Sales orders & checkout
-- 4. Cash/card payments
-- 5. Basic receipt printing
-- 6. User authentication & basic permissions
-- ============================================================================

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================================================
-- 1. USER AUTHENTICATION & BASIC PERMISSIONS
-- ============================================================================

-- Roles table (master data)
CREATE TABLE IF NOT EXISTS roles (
    role_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE,
    role_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table (master data)
CREATE TABLE IF NOT EXISTS permissions (
    permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    permission_code TEXT NOT NULL UNIQUE,
    permission_name TEXT NOT NULL,
    permission_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission mapping (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    pin_code TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CHECK (pin_code IS NULL OR (length(pin_code) >= 4 AND length(pin_code) <= 6))
);

-- User sessions table (for active login tracking)
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_at TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- 2. PRODUCTS & VARIANTS (BASIC)
-- ============================================================================

-- Categories table (hierarchical structure)
CREATE TABLE IF NOT EXISTS categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL,
    parent_category_id INTEGER,
    category_description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(category_id) ON DELETE SET NULL
);

-- Products table (parent product)
CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT NOT NULL UNIQUE,
    product_name TEXT NOT NULL,
    product_description TEXT,
    category_id INTEGER,
    has_variants BOOLEAN NOT NULL DEFAULT 0,
    track_inventory BOOLEAN NOT NULL DEFAULT 1,
    is_taxable BOOLEAN NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL
);

-- Product variants table (actual sellable items)
CREATE TABLE IF NOT EXISTS product_variants (
    variant_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT UNIQUE,
    variant_name TEXT,
    retail_price REAL NOT NULL CHECK (retail_price >= 0),
    cost REAL CHECK (cost >= 0),
    compare_at_price REAL CHECK (compare_at_price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- Variant options table (for storing variant attributes like color, size)
CREATE TABLE IF NOT EXISTS variant_options (
    variant_option_id INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id INTEGER NOT NULL,
    option_name TEXT NOT NULL,
    option_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE
);

-- Product images table (normalized)
CREATE TABLE IF NOT EXISTS product_images (
    image_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    image_url TEXT NOT NULL,
    image_alt_text TEXT,
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE
);

-- ============================================================================
-- 3. INVENTORY TRACKING
-- ============================================================================

-- Locations/Stores table
CREATE TABLE IF NOT EXISTS locations (
    location_id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_code TEXT NOT NULL UNIQUE,
    location_name TEXT NOT NULL,
    location_type TEXT NOT NULL CHECK(location_type IN ('Store', 'Warehouse', 'Mobile')) DEFAULT 'Store',
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state_province TEXT,
    postal_code TEXT,
    country TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory items (stock per variant per location)
CREATE TABLE IF NOT EXISTS inventory_items (
    inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
    quantity_committed INTEGER NOT NULL DEFAULT 0 CHECK (quantity_committed >= 0),
    reorder_point INTEGER DEFAULT 0,
    reorder_quantity INTEGER DEFAULT 0,
    last_counted_at TIMESTAMP,
    last_received_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(location_id) ON DELETE CASCADE,
    UNIQUE(variant_id, location_id),
    CHECK (quantity_available <= quantity_on_hand)
);

-- Inventory adjustment types lookup
CREATE TABLE IF NOT EXISTS inventory_adjustment_types (
    adjustment_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    adjustment_type_code TEXT NOT NULL UNIQUE,
    adjustment_type_name TEXT NOT NULL,
    adjustment_direction TEXT NOT NULL CHECK(adjustment_direction IN ('Increase', 'Decrease', 'Set'))
);

-- Inventory adjustments (header)
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    adjustment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    adjustment_type_id INTEGER NOT NULL,
    adjustment_number TEXT NOT NULL UNIQUE,
    reference_number TEXT,
    adjusted_by_user_id INTEGER NOT NULL,
    adjustment_notes TEXT,
    adjustment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(location_id),
    FOREIGN KEY (adjustment_type_id) REFERENCES inventory_adjustment_types(adjustment_type_id),
    FOREIGN KEY (adjusted_by_user_id) REFERENCES users(user_id)
);

-- Inventory adjustment details (lines)
CREATE TABLE IF NOT EXISTS inventory_adjustment_details (
    adjustment_detail_id INTEGER PRIMARY KEY AUTOINCREMENT,
    adjustment_id INTEGER NOT NULL,
    variant_id INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (adjustment_id) REFERENCES inventory_adjustments(adjustment_id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id)
);

-- ============================================================================
-- 4. CASH REGISTER & SHIFTS
-- ============================================================================

-- Cash registers table
CREATE TABLE IF NOT EXISTS cash_registers (
    register_id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    register_number TEXT NOT NULL,
    register_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(location_id),
    UNIQUE(location_id, register_number)
);

-- Shift status lookup
CREATE TABLE IF NOT EXISTS shift_statuses (
    status_id INTEGER PRIMARY KEY AUTOINCREMENT,
    status_code TEXT NOT NULL UNIQUE,
    status_name TEXT NOT NULL
);

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
    shift_id INTEGER PRIMARY KEY AUTOINCREMENT,
    register_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    shift_number TEXT NOT NULL UNIQUE,
    status_id INTEGER NOT NULL,
    opening_amount REAL NOT NULL DEFAULT 0 CHECK (opening_amount >= 0),
    closing_amount REAL CHECK (closing_amount >= 0),
    expected_amount REAL CHECK (expected_amount >= 0),
    variance REAL,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (register_id) REFERENCES cash_registers(register_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (status_id) REFERENCES shift_statuses(status_id)
);

-- ============================================================================
-- 5. SALES ORDERS & CHECKOUT
-- ============================================================================

-- Order types lookup
CREATE TABLE IF NOT EXISTS order_types (
    order_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_type_code TEXT NOT NULL UNIQUE,
    order_type_name TEXT NOT NULL
);

-- Order statuses lookup
CREATE TABLE IF NOT EXISTS order_statuses (
    order_status_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_status_code TEXT NOT NULL UNIQUE,
    order_status_name TEXT NOT NULL
);

-- Sales orders (header)
CREATE TABLE IF NOT EXISTS sales_orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    order_type_id INTEGER NOT NULL,
    order_status_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    register_id INTEGER NOT NULL,
    shift_id INTEGER,
    cashier_user_id INTEGER NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    -- Financial fields
    subtotal REAL NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount REAL NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount REAL NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    amount_paid REAL NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    change_amount REAL NOT NULL DEFAULT 0 CHECK (change_amount >= 0),
    amount_due REAL NOT NULL DEFAULT 0,

    -- Additional fields
    order_notes TEXT,
    internal_notes TEXT,

    -- Receipt tracking
    receipt_number TEXT UNIQUE,
    receipt_printed_at TIMESTAMP,
    receipt_emailed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_type_id) REFERENCES order_types(order_type_id),
    FOREIGN KEY (order_status_id) REFERENCES order_statuses(order_status_id),
    FOREIGN KEY (location_id) REFERENCES locations(location_id),
    FOREIGN KEY (register_id) REFERENCES cash_registers(register_id),
    FOREIGN KEY (shift_id) REFERENCES shifts(shift_id),
    FOREIGN KEY (cashier_user_id) REFERENCES users(user_id)
);

-- Order line items (details)
CREATE TABLE IF NOT EXISTS order_line_items (
    line_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    variant_id INTEGER NOT NULL,
    line_number INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    line_discount REAL NOT NULL DEFAULT 0 CHECK (line_discount >= 0),
    line_tax REAL NOT NULL DEFAULT 0 CHECK (line_tax >= 0),
    line_subtotal REAL NOT NULL CHECK (line_subtotal >= 0),
    line_total REAL NOT NULL CHECK (line_total >= 0),
    cost_price REAL CHECK (cost_price >= 0),
    line_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES sales_orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id),
    UNIQUE(order_id, line_number)
);

-- ============================================================================
-- 6. CASH/CARD PAYMENTS
-- ============================================================================

-- Payment method types lookup
CREATE TABLE IF NOT EXISTS payment_method_types (
    payment_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_type_code TEXT NOT NULL UNIQUE,
    payment_type_name TEXT NOT NULL,
    requires_reference BOOLEAN NOT NULL DEFAULT 0
);

-- Payment methods (specific payment options)
CREATE TABLE IF NOT EXISTS payment_methods (
    payment_method_id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_type_id INTEGER NOT NULL,
    method_name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_type_id) REFERENCES payment_method_types(payment_type_id)
);

-- Payment status lookup
CREATE TABLE IF NOT EXISTS payment_statuses (
    payment_status_id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_status_code TEXT NOT NULL UNIQUE,
    payment_status_name TEXT NOT NULL
);

-- Order payments (multiple payments per order supported)
CREATE TABLE IF NOT EXISTS order_payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    payment_method_id INTEGER NOT NULL,
    payment_status_id INTEGER NOT NULL,
    payment_amount REAL NOT NULL CHECK (payment_amount > 0),
    reference_number TEXT,
    card_last_four TEXT,
    card_type TEXT,
    authorization_code TEXT,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES sales_orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(payment_method_id),
    FOREIGN KEY (payment_status_id) REFERENCES payment_statuses(payment_status_id)
);

-- ============================================================================
-- 7. TAX CONFIGURATION (BASIC FOR MVP)
-- ============================================================================

-- Tax rates table (simplified for MVP)
CREATE TABLE IF NOT EXISTS tax_rates (
    tax_rate_id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER,
    tax_name TEXT NOT NULL,
    tax_rate REAL NOT NULL CHECK (tax_rate >= 0 AND tax_rate <= 100),
    is_active BOOLEAN NOT NULL DEFAULT 1,
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

-- ============================================================================
-- 8. RECEIPT CONFIGURATION (BASIC FOR MVP)
-- ============================================================================

-- Receipt templates table
CREATE TABLE IF NOT EXISTS receipt_templates (
    template_id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER,
    template_name TEXT NOT NULL,
    header_text TEXT,
    footer_text TEXT,
    show_logo BOOLEAN NOT NULL DEFAULT 1,
    logo_url TEXT,
    paper_width INTEGER DEFAULT 80,
    is_default BOOLEAN NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

-- ============================================================================
-- 9. DATABASE METADATA (FOR MIGRATIONS)
-- ============================================================================

-- Database version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE,
    description TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User authentication indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_pin_code ON users(pin_code);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active);

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- Variant indexes
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_variants_active ON product_variants(is_active);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory_items(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variant_location ON inventory_items(variant_id, location_id);

-- Sales order indexes
CREATE INDEX IF NOT EXISTS idx_orders_number ON sales_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_date ON sales_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON sales_orders(order_status_id);
CREATE INDEX IF NOT EXISTS idx_orders_location ON sales_orders(location_id);
CREATE INDEX IF NOT EXISTS idx_orders_cashier ON sales_orders(cashier_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_shift ON sales_orders(shift_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON sales_orders(customer_phone);

-- Order line items indexes
CREATE INDEX IF NOT EXISTS idx_line_items_order ON order_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_line_items_variant ON order_line_items(variant_id);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_order ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_method ON order_payments(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON order_payments(payment_status_id);

-- Shift indexes
CREATE INDEX IF NOT EXISTS idx_shifts_register ON shifts(register_id);
CREATE INDEX IF NOT EXISTS idx_shifts_user ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status_id);
CREATE INDEX IF NOT EXISTS idx_shifts_opened ON shifts(opened_at);

-- ============================================================================
-- LOOKUP DATA (ESSENTIAL REFERENCE DATA FOR SYSTEM TO FUNCTION)
-- ============================================================================

-- Insert shift statuses
INSERT OR IGNORE INTO shift_statuses (status_code, status_name) VALUES
('OPEN', 'Open'),
('CLOSED', 'Closed');

-- Insert order types
INSERT OR IGNORE INTO order_types (order_type_code, order_type_name) VALUES
('SALE', 'Sale'),
('RETURN', 'Return'),
('EXCHANGE', 'Exchange');

-- Insert order statuses
INSERT OR IGNORE INTO order_statuses (order_status_code, order_status_name) VALUES
('DRAFT', 'Draft'),
('OPEN', 'Open'),
('COMPLETED', 'Completed'),
('VOIDED', 'Voided'),
('PARKED', 'Parked');

-- Insert payment method types
INSERT OR IGNORE INTO payment_method_types (payment_type_code, payment_type_name, requires_reference) VALUES
('CASH', 'Cash', 0),
('CARD', 'Card', 1),
('DIGITAL', 'Digital Wallet', 1),
('OTHER', 'Other', 0);

-- Insert payment statuses
INSERT OR IGNORE INTO payment_statuses (payment_status_code, payment_status_name) VALUES
('PENDING', 'Pending'),
('COMPLETED', 'Completed'),
('FAILED', 'Failed'),
('REFUNDED', 'Refunded');

-- Insert inventory adjustment types
INSERT OR IGNORE INTO inventory_adjustment_types (adjustment_type_code, adjustment_type_name, adjustment_direction) VALUES
('RECEIVE', 'Stock Receipt', 'Increase'),
('SALE', 'Sale', 'Decrease'),
('RETURN', 'Customer Return', 'Increase'),
('DAMAGE', 'Damaged Goods', 'Decrease'),
('SHRINKAGE', 'Shrinkage/Theft', 'Decrease'),
('COUNT', 'Stock Count Adjustment', 'Set'),
('TRANSFER_IN', 'Transfer In', 'Increase'),
('TRANSFER_OUT', 'Transfer Out', 'Decrease');

-- Insert basic permissions
INSERT OR IGNORE INTO permissions (permission_code, permission_name, permission_description) VALUES
('VIEW_PRODUCTS', 'View Products', 'Can view product information'),
('MANAGE_PRODUCTS', 'Manage Products', 'Can create, edit, delete products'),
('VIEW_INVENTORY', 'View Inventory', 'Can view inventory levels'),
('MANAGE_INVENTORY', 'Manage Inventory', 'Can adjust inventory levels'),
('PROCESS_SALES', 'Process Sales', 'Can process sales transactions'),
('VOID_SALES', 'Void Sales', 'Can void completed sales'),
('PROCESS_RETURNS', 'Process Returns', 'Can process returns and exchanges'),
('MANAGE_CASH', 'Manage Cash', 'Can open/close shifts and count cash'),
('VIEW_REPORTS', 'View Reports', 'Can view sales and inventory reports'),
('MANAGE_USERS', 'Manage Users', 'Can create and manage users');

-- Insert basic roles
INSERT OR IGNORE INTO roles (role_name, role_description) VALUES
('Administrator', 'Full system access'),
('Store Manager', 'Manage store operations'),
('Cashier', 'Process sales transactions'),
('Stock Clerk', 'Manage inventory');

-- Assign permissions to roles
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
-- Administrator gets all permissions (1-10)
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10),
-- Store Manager (2-9, no user management)
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7), (2, 8), (2, 9),
-- Cashier (limited to sales operations)
(3, 1), (3, 3), (3, 5), (3, 7),
-- Stock Clerk (inventory only)
(4, 1), (4, 3), (4, 4);

-- Record this migration
INSERT OR IGNORE INTO schema_migrations (version, description) VALUES
('001', 'Initial POS Phase 1 Schema - Core tables, indexes, and lookup data');
