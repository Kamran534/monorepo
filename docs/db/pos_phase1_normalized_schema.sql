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
CREATE TABLE roles (
    role_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE,
    role_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table (master data)
CREATE TABLE permissions (
    permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    permission_code TEXT NOT NULL UNIQUE,
    permission_name TEXT NOT NULL,
    permission_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission mapping (many-to-many)
CREATE TABLE role_permissions (
    role_permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- Users table
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    pin_code TEXT, -- 4-6 digit PIN for quick POS login
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CHECK (length(pin_code) >= 4 AND length(pin_code) <= 6)
);

-- User sessions table (for active login tracking)
CREATE TABLE user_sessions (
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
CREATE TABLE categories (
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
CREATE TABLE products (
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
CREATE TABLE product_variants (
    variant_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT UNIQUE,
    variant_name TEXT, -- e.g., "Red - Large"
    retail_price REAL NOT NULL CHECK (retail_price >= 0),
    cost REAL CHECK (cost >= 0),
    compare_at_price REAL CHECK (compare_at_price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- Variant options table (for storing variant attributes like color, size)
CREATE TABLE variant_options (
    variant_option_id INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id INTEGER NOT NULL,
    option_name TEXT NOT NULL, -- e.g., "Color", "Size"
    option_value TEXT NOT NULL, -- e.g., "Red", "Large"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE
);

-- Product images table (normalized)
CREATE TABLE product_images (
    image_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    variant_id INTEGER, -- NULL for product-level images
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
CREATE TABLE locations (
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
CREATE TABLE inventory_items (
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
CREATE TABLE inventory_adjustment_types (
    adjustment_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    adjustment_type_code TEXT NOT NULL UNIQUE,
    adjustment_type_name TEXT NOT NULL,
    adjustment_direction TEXT NOT NULL CHECK(adjustment_direction IN ('Increase', 'Decrease', 'Set'))
);

-- Inventory adjustments (header)
CREATE TABLE inventory_adjustments (
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
CREATE TABLE inventory_adjustment_details (
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
CREATE TABLE cash_registers (
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
CREATE TABLE shift_statuses (
    status_id INTEGER PRIMARY KEY AUTOINCREMENT,
    status_code TEXT NOT NULL UNIQUE,
    status_name TEXT NOT NULL
);

-- Shifts table
CREATE TABLE shifts (
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
CREATE TABLE order_types (
    order_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_type_code TEXT NOT NULL UNIQUE,
    order_type_name TEXT NOT NULL
);

-- Order statuses lookup
CREATE TABLE order_statuses (
    order_status_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_status_code TEXT NOT NULL UNIQUE,
    order_status_name TEXT NOT NULL
);

-- Sales orders (header)
CREATE TABLE sales_orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    order_type_id INTEGER NOT NULL,
    order_status_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    register_id INTEGER NOT NULL,
    shift_id INTEGER,
    cashier_user_id INTEGER NOT NULL,
    customer_name TEXT, -- Simple customer tracking for MVP
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
CREATE TABLE order_line_items (
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
CREATE TABLE payment_method_types (
    payment_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_type_code TEXT NOT NULL UNIQUE,
    payment_type_name TEXT NOT NULL,
    requires_reference BOOLEAN NOT NULL DEFAULT 0
);

-- Payment methods (specific payment options)
CREATE TABLE payment_methods (
    payment_method_id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_type_id INTEGER NOT NULL,
    method_name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_type_id) REFERENCES payment_method_types(payment_type_id)
);

-- Payment status lookup
CREATE TABLE payment_statuses (
    payment_status_id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_status_code TEXT NOT NULL UNIQUE,
    payment_status_name TEXT NOT NULL
);

-- Order payments (multiple payments per order supported)
CREATE TABLE order_payments (
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
CREATE TABLE tax_rates (
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
CREATE TABLE receipt_templates (
    template_id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER,
    template_name TEXT NOT NULL,
    header_text TEXT,
    footer_text TEXT,
    show_logo BOOLEAN NOT NULL DEFAULT 1,
    logo_url TEXT,
    paper_width INTEGER DEFAULT 80, -- mm
    is_default BOOLEAN NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User authentication indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_pin_code ON users(pin_code);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_active ON user_sessions(user_id, is_active);

-- Product indexes
CREATE INDEX idx_products_code ON products(product_code);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);

-- Variant indexes
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_barcode ON product_variants(barcode);
CREATE INDEX idx_variants_active ON product_variants(is_active);

-- Inventory indexes
CREATE INDEX idx_inventory_variant ON inventory_items(variant_id);
CREATE INDEX idx_inventory_location ON inventory_items(location_id);
CREATE INDEX idx_inventory_variant_location ON inventory_items(variant_id, location_id);

-- Sales order indexes
CREATE INDEX idx_orders_number ON sales_orders(order_number);
CREATE INDEX idx_orders_date ON sales_orders(order_date);
CREATE INDEX idx_orders_status ON sales_orders(order_status_id);
CREATE INDEX idx_orders_location ON sales_orders(location_id);
CREATE INDEX idx_orders_cashier ON sales_orders(cashier_user_id);
CREATE INDEX idx_orders_shift ON sales_orders(shift_id);
CREATE INDEX idx_orders_customer_phone ON sales_orders(customer_phone);

-- Order line items indexes
CREATE INDEX idx_line_items_order ON order_line_items(order_id);
CREATE INDEX idx_line_items_variant ON order_line_items(variant_id);

-- Payment indexes
CREATE INDEX idx_payments_order ON order_payments(order_id);
CREATE INDEX idx_payments_method ON order_payments(payment_method_id);
CREATE INDEX idx_payments_status ON order_payments(payment_status_id);

-- Shift indexes
CREATE INDEX idx_shifts_register ON shifts(register_id);
CREATE INDEX idx_shifts_user ON shifts(user_id);
CREATE INDEX idx_shifts_status ON shifts(status_id);
CREATE INDEX idx_shifts_opened ON shifts(opened_at);

-- ============================================================================
-- LOOKUP DATA (ENUMS/REFERENCE DATA)
-- ============================================================================

-- Insert shift statuses
INSERT INTO shift_statuses (status_code, status_name) VALUES
('OPEN', 'Open'),
('CLOSED', 'Closed');

-- Insert order types
INSERT INTO order_types (order_type_code, order_type_name) VALUES
('SALE', 'Sale'),
('RETURN', 'Return'),
('EXCHANGE', 'Exchange');

-- Insert order statuses
INSERT INTO order_statuses (order_status_code, order_status_name) VALUES
('DRAFT', 'Draft'),
('OPEN', 'Open'),
('COMPLETED', 'Completed'),
('VOIDED', 'Voided'),
('PARKED', 'Parked');

-- Insert payment method types
INSERT INTO payment_method_types (payment_type_code, payment_type_name, requires_reference) VALUES
('CASH', 'Cash', 0),
('CARD', 'Card', 1),
('DIGITAL', 'Digital Wallet', 1),
('OTHER', 'Other', 0);

-- Insert payment statuses
INSERT INTO payment_statuses (payment_status_code, payment_status_name) VALUES
('PENDING', 'Pending'),
('COMPLETED', 'Completed'),
('FAILED', 'Failed'),
('REFUNDED', 'Refunded');

-- Insert inventory adjustment types
INSERT INTO inventory_adjustment_types (adjustment_type_code, adjustment_type_name, adjustment_direction) VALUES
('RECEIVE', 'Stock Receipt', 'Increase'),
('SALE', 'Sale', 'Decrease'),
('RETURN', 'Customer Return', 'Increase'),
('DAMAGE', 'Damaged Goods', 'Decrease'),
('SHRINKAGE', 'Shrinkage/Theft', 'Decrease'),
('COUNT', 'Stock Count Adjustment', 'Set'),
('TRANSFER_IN', 'Transfer In', 'Increase'),
('TRANSFER_OUT', 'Transfer Out', 'Decrease');

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Permissions
INSERT INTO permissions (permission_code, permission_name, permission_description) VALUES
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

-- Roles
INSERT INTO roles (role_name, role_description) VALUES
('Administrator', 'Full system access'),
('Store Manager', 'Manage store operations'),
('Cashier', 'Process sales transactions'),
('Stock Clerk', 'Manage inventory');

-- Role-Permission assignments
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- Administrator gets all permissions
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10),
-- Store Manager
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7), (2, 8), (2, 9),
-- Cashier
(3, 1), (3, 3), (3, 5), (3, 7),
-- Stock Clerk
(4, 1), (4, 3), (4, 4);

-- Users (password hash is bcrypt of 'Password123!')
INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, pin_code, phone, is_active) VALUES
('admin', 'admin@posstore.com', '$2b$10$rO5nVK.HJZJmIx2xJ5z7qOvLXxXxXxXxXxXxXxXxXxXxXxXxXx', 'System', 'Administrator', 1, '1111', '555-0001', 1),
('manager1', 'manager@posstore.com', '$2b$10$rO5nVK.HJZJmIx2xJ5z7qOvLXxXxXxXxXxXxXxXxXxXxXxXxXx', 'Jane', 'Smith', 2, '2222', '555-0002', 1),
('cashier1', 'cashier1@posstore.com', '$2b$10$rO5nVK.HJZJmIx2xJ5z7qOvLXxXxXxXxXxXxXxXxXxXxXxXxXx', 'Mike', 'Johnson', 3, '3333', '555-0003', 1),
('cashier2', 'cashier2@posstore.com', '$2b$10$rO5nVK.HJZJmIx2xJ5z7qOvLXxXxXxXxXxXxXxXxXxXxXxXxXx', 'Sarah', 'Davis', 3, '4444', '555-0004', 1),
('stock1', 'stock@posstore.com', '$2b$10$rO5nVK.HJZJmIx2xJ5z7qOvLXxXxXxXxXxXxXxXxXxXxXxXxXx', 'Tom', 'Wilson', 4, '5555', '555-0005', 1);

-- Locations
INSERT INTO locations (location_code, location_name, location_type, address_line1, city, state_province, postal_code, country, phone, email, is_active) VALUES
('STORE-001', 'Downtown Store', 'Store', '123 Main Street', 'New York', 'NY', '10001', 'USA', '555-1000', 'downtown@posstore.com', 1),
('STORE-002', 'Mall Location', 'Store', '456 Shopping Plaza', 'Los Angeles', 'CA', '90001', 'USA', '555-2000', 'mall@posstore.com', 1);

-- Categories
INSERT INTO categories (category_name, parent_category_id, category_description, display_order, is_active) VALUES
('Electronics', NULL, 'Electronic devices and accessories', 1, 1),
('Clothing', NULL, 'Apparel and fashion', 2, 1),
('Food & Beverage', NULL, 'Food and drink items', 3, 1),
('Smartphones', 1, 'Mobile phones', 1, 1),
('Accessories', 1, 'Electronic accessories', 2, 1),
('Mens Wear', 2, 'Mens clothing', 1, 1),
('Womens Wear', 2, 'Womens clothing', 2, 1);

-- Products
INSERT INTO products (product_code, product_name, product_description, category_id, has_variants, track_inventory, is_taxable, is_active) VALUES
('PHONE-001', 'Smartphone Pro Max', 'Latest flagship smartphone', 4, 1, 1, 1, 1),
('EARBUDS-001', 'Wireless Earbuds', 'Premium wireless earbuds with ANC', 5, 0, 1, 1, 1),
('TSHIRT-001', 'Cotton T-Shirt', 'Comfortable 100% cotton t-shirt', 6, 1, 1, 1, 1),
('JEANS-001', 'Denim Jeans', 'Classic fit denim jeans', 6, 1, 1, 1, 1),
('COFFEE-001', 'Premium Coffee Beans', 'Arabica coffee beans 1kg', 3, 0, 1, 1, 1);

-- Product Variants
INSERT INTO product_variants (product_id, sku, barcode, variant_name, retail_price, cost, is_active) VALUES
-- Smartphone variants
(1, 'PHONE-001-BLK-128', '1111111111111', 'Black 128GB', 999.99, 650.00, 1),
(1, 'PHONE-001-BLK-256', '1111111111112', 'Black 256GB', 1199.99, 780.00, 1),
(1, 'PHONE-001-WHT-128', '1111111111113', 'White 128GB', 999.99, 650.00, 1),
-- Earbuds (single variant)
(2, 'EARBUDS-001-BLK', '2222222222222', 'Black', 149.99, 75.00, 1),
-- T-Shirt variants
(3, 'TSHIRT-001-BLU-M', '3333333333333', 'Blue Medium', 29.99, 12.00, 1),
(3, 'TSHIRT-001-BLU-L', '3333333333334', 'Blue Large', 29.99, 12.00, 1),
(3, 'TSHIRT-001-RED-M', '3333333333335', 'Red Medium', 29.99, 12.00, 1),
-- Jeans variants
(4, 'JEANS-001-BLU-32', '4444444444444', 'Blue 32W', 79.99, 35.00, 1),
(4, 'JEANS-001-BLU-34', '4444444444445', 'Blue 34W', 79.99, 35.00, 1),
-- Coffee (single variant)
(5, 'COFFEE-001-1KG', '5555555555555', '1kg Bag', 24.99, 12.00, 1);

-- Variant Options
INSERT INTO variant_options (variant_id, option_name, option_value) VALUES
(1, 'Color', 'Black'), (1, 'Storage', '128GB'),
(2, 'Color', 'Black'), (2, 'Storage', '256GB'),
(3, 'Color', 'White'), (3, 'Storage', '128GB'),
(4, 'Color', 'Black'),
(5, 'Color', 'Blue'), (5, 'Size', 'M'),
(6, 'Color', 'Blue'), (6, 'Size', 'L'),
(7, 'Color', 'Red'), (7, 'Size', 'M'),
(8, 'Color', 'Blue'), (8, 'Waist', '32'),
(9, 'Color', 'Blue'), (9, 'Waist', '34');

-- Inventory Items
INSERT INTO inventory_items (variant_id, location_id, quantity_on_hand, quantity_available, quantity_committed, reorder_point, reorder_quantity) VALUES
-- Store 1 inventory
(1, 1, 25, 23, 2, 10, 20),
(2, 1, 15, 15, 0, 5, 15),
(3, 1, 20, 20, 0, 10, 20),
(4, 1, 50, 48, 2, 20, 30),
(5, 1, 100, 95, 5, 30, 50),
(6, 1, 80, 80, 0, 30, 50),
(7, 1, 75, 75, 0, 25, 40),
(8, 1, 60, 58, 2, 20, 30),
(9, 1, 55, 55, 0, 20, 30),
(10, 1, 200, 195, 5, 50, 100),
-- Store 2 inventory
(1, 2, 30, 30, 0, 10, 20),
(4, 2, 60, 60, 0, 20, 30),
(5, 2, 120, 115, 5, 30, 50);

-- Cash Registers
INSERT INTO cash_registers (location_id, register_number, register_name, is_active) VALUES
(1, 'REG-01', 'Downtown Register 1', 1),
(1, 'REG-02', 'Downtown Register 2', 1),
(2, 'REG-01', 'Mall Register 1', 1);

-- Shifts
INSERT INTO shifts (register_id, user_id, shift_number, status_id, opening_amount, closing_amount, expected_amount, variance, opened_at, closed_at) VALUES
-- Closed shift
(1, 3, 'SHIFT-20241103-001', 2, 500.00, 3245.75, 3250.00, -4.25, '2024-11-03 08:00:00', '2024-11-03 16:00:00'),
-- Open shift
(1, 2, 'SHIFT-20241103-002', 1, 500.00, NULL, NULL, NULL, '2024-11-03 16:00:00', NULL);

-- Payment Methods
INSERT INTO payment_methods (payment_type_id, method_name, is_active) VALUES
(1, 'Cash', 1),
(2, 'Visa', 1),
(2, 'Mastercard', 1),
(2, 'American Express', 1),
(2, 'Debit Card', 1),
(3, 'Apple Pay', 1),
(3, 'Google Pay', 1);

-- Tax Rates
INSERT INTO tax_rates (location_id, tax_name, tax_rate, is_active, effective_from) VALUES
(1, 'NY Sales Tax', 8.875, 1, '2024-01-01'),
(2, 'CA Sales Tax', 9.5, 1, '2024-01-01');

-- Receipt Templates
INSERT INTO receipt_templates (location_id, template_name, header_text, footer_text, show_logo, paper_width, is_default, is_active) VALUES
(1, 'Downtown Standard Receipt', 'POS Store - Downtown\n123 Main Street\nNew York, NY 10001\nPhone: 555-1000', 'Thank you for your business!\nVisit us at www.posstore.com', 1, 80, 1, 1),
(2, 'Mall Standard Receipt', 'POS Store - Mall Location\n456 Shopping Plaza\nLos Angeles, CA 90001\nPhone: 555-2000', 'Thank you for shopping with us!\nFollow us @posstore', 1, 80, 1, 1);

-- Sales Orders
INSERT INTO sales_orders (order_number, order_type_id, order_status_id, location_id, register_id, shift_id, cashier_user_id, customer_name, customer_phone, order_date, completed_at, subtotal, tax_amount, discount_amount, total_amount, amount_paid, change_amount, amount_due, receipt_number) VALUES
-- Completed order 1 - Walk-in customer
(1, 'ORD-20241103-0001', 1, 4, 1, 1, 1, 3, 'John Smith', '555-1234', '2024-11-03 09:15:00', '2024-11-03 09:18:00', 1029.98, 91.41, 0, 1121.39, 1200.00, 78.61, 0, 'RCP-20241103-0001'),
-- Completed order 2 - Walk-in customer
(2, 'ORD-20241103-0002', 1, 4, 1, 1, 1, 3, NULL, NULL, '2024-11-03 10:30:00', '2024-11-03 10:32:00', 89.97, 7.98, 0, 97.95, 100.00, 2.05, 0, 'RCP-20241103-0002'),
-- Completed order 3 - Named customer
(3, 'ORD-20241103-0003', 1, 4, 1, 1, 1, 3, 'Sarah Johnson', '555-5678', '2024-11-03 11:45:00', '2024-11-03 11:48:00', 149.99, 13.31, 0, 163.30, 163.30, 0, 0, 'RCP-20241103-0003'),
-- Completed order 4 - Large sale
(4, 'ORD-20241103-0004', 1, 4, 1, 1, 1, 3, 'Mike Davis', '555-9012', '2024-11-03 13:20:00', '2024-11-03 13:25:00', 2459.92, 218.32, 100.00, 2578.24, 2578.24, 0, 0, 'RCP-20241103-0004'),
-- Open order (in progress)
(5, 'ORD-20241103-0005', 1, 2, 1, 1, 2, 2, NULL, NULL, '2024-11-03 16:30:00', NULL, 79.99, 7.09, 0, 87.08, 0, 0, 87.08, NULL);

-- Order Line Items
INSERT INTO order_line_items (order_id, variant_id, line_number, quantity, unit_price, line_discount, line_tax, line_subtotal, line_total, cost_price) VALUES
-- Order 1 line items
(1, 1, 1, 1, 999.99, 0, 88.77, 999.99, 1088.76, 650.00),
(1, 5, 2, 1, 29.99, 0, 2.66, 29.99, 32.65, 12.00),
-- Order 2 line items
(2, 5, 1, 3, 29.99, 0, 7.98, 89.97, 97.95, 12.00),
-- Order 3 line items
(3, 4, 1, 1, 149.99, 0, 13.31, 149.99, 163.30, 75.00),
-- Order 4 line items
(4, 1, 1, 2, 999.99, 100.00, 159.11, 1899.98, 2059.09, 650.00),
(4, 8, 2, 2, 79.99, 0, 14.18, 159.98, 174.16, 35.00),
(4, 10, 3, 4, 24.99, 0, 8.87, 99.96, 108.83, 12.00),
(4, 7, 4, 10, 29.99, 0, 26.64, 299.90, 326.54, 12.00),
-- Order 5 line items (open order)
(5, 8, 1, 1, 79.99, 0, 7.09, 79.99, 87.08, 35.00);

-- Order Payments
INSERT INTO order_payments (order_id, payment_method_id, payment_status_id, payment_amount, reference_number, card_last_four, card_type, authorization_code) VALUES
(1, 1, 2, 1200.00, NULL, NULL, NULL, NULL), -- Cash payment
(2, 1, 2, 100.00, NULL, NULL, NULL, NULL), -- Cash payment
(3, 2, 2, 163.30, 'TXN-ABC123', '4532', 'Visa', 'AUTH-789456'), -- Visa payment
(4, 6, 2, 2578.24, 'APPLEPAY-XYZ789', NULL, 'Apple Pay', 'AUTH-123789'); -- Apple Pay

-- Inventory Adjustments (for completed sales)
INSERT INTO inventory_adjustments (location_id, adjustment_type_id, adjustment_number, adjusted_by_user_id, adjustment_notes, adjustment_date) VALUES
(1, 2, 'ADJ-SALE-20241103-0001', 3, 'Sales order ORD-20241103-0001', '2024-11-03 09:18:00'),
(1, 2, 'ADJ-SALE-20241103-0002', 3, 'Sales order ORD-20241103-0002', '2024-11-03 10:32:00'),
(1, 2, 'ADJ-SALE-20241103-0003', 3, 'Sales order ORD-20241103-0003', '2024-11-03 11:48:00'),
(1, 2, 'ADJ-SALE-20241103-0004', 3, 'Sales order ORD-20241103-0004', '2024-11-03 13:25:00');

-- Inventory Adjustment Details
INSERT INTO inventory_adjustment_details (adjustment_id, variant_id, quantity_before, quantity_change, quantity_after, reason) VALUES
-- Adjustment 1 details
(1, 1, 25, -1, 24, 'Sold 1 unit'),
(1, 5, 100, -1, 99, 'Sold 1 unit'),
-- Adjustment 2 details
(2, 5, 99, -3, 96, 'Sold 3 units'),
-- Adjustment 3 details
(3, 4, 50, -1, 49, 'Sold 1 unit'),
-- Adjustment 4 details
(4, 1, 24, -2, 22, 'Sold 2 units'),
(4, 8, 60, -2, 58, 'Sold 2 units'),
(4, 10, 200, -4, 196, 'Sold 4 units'),
(4, 7, 75, -10, 65, 'Sold 10 units');

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Auto-update updated_at timestamp for users
CREATE TRIGGER trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
END;

-- Auto-update updated_at timestamp for products
CREATE TRIGGER trg_products_updated_at
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
    UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE product_id = NEW.product_id;
END;

-- Auto-update updated_at timestamp for product_variants
CREATE TRIGGER trg_variants_updated_at
AFTER UPDATE ON product_variants
FOR EACH ROW
BEGIN
    UPDATE product_variants SET updated_at = CURRENT_TIMESTAMP WHERE variant_id = NEW.variant_id;
END;

-- Auto-update updated_at timestamp for inventory_items
CREATE TRIGGER trg_inventory_updated_at
AFTER UPDATE ON inventory_items
FOR EACH ROW
BEGIN
    UPDATE inventory_items SET updated_at = CURRENT_TIMESTAMP WHERE inventory_id = NEW.inventory_id;
END;

-- Auto-update updated_at timestamp for sales_orders
CREATE TRIGGER trg_orders_updated_at
AFTER UPDATE ON sales_orders
FOR EACH ROW
BEGIN
    UPDATE sales_orders SET updated_at = CURRENT_TIMESTAMP WHERE order_id = NEW.order_id;
END;

-- Auto-calculate order totals when line items change
CREATE TRIGGER trg_calculate_line_total_insert
AFTER INSERT ON order_line_items
FOR EACH ROW
BEGIN
    -- Calculate line_subtotal
    UPDATE order_line_items 
    SET line_subtotal = (quantity * unit_price) - line_discount
    WHERE line_item_id = NEW.line_item_id;
    
    -- Calculate line_total
    UPDATE order_line_items 
    SET line_total = line_subtotal + line_tax
    WHERE line_item_id = NEW.line_item_id;
    
    -- Update order totals
    UPDATE sales_orders
    SET 
        subtotal = (SELECT COALESCE(SUM(line_subtotal), 0) FROM order_line_items WHERE order_id = NEW.order_id),
        tax_amount = (SELECT COALESCE(SUM(line_tax), 0) FROM order_line_items WHERE order_id = NEW.order_id),
        total_amount = (SELECT COALESCE(SUM(line_total), 0) FROM order_line_items WHERE order_id = NEW.order_id) - 
                       (SELECT discount_amount FROM sales_orders WHERE order_id = NEW.order_id)
    WHERE order_id = NEW.order_id;
END;

-- ============================================================================
-- USEFUL VIEWS FOR QUERIES
-- ============================================================================

-- Complete product catalog view with proper joins
CREATE VIEW v_product_catalog AS
SELECT 
    p.product_id,
    p.product_code,
    p.product_name,
    p.product_description,
    c.category_name,
    pv.variant_id,
    pv.sku,
    pv.barcode,
    pv.variant_name,
    pv.retail_price,
    pv.cost,
    pv.compare_at_price,
    ROUND((pv.retail_price - pv.cost) / pv.retail_price * 100, 2) AS margin_percent,
    p.has_variants,
    p.track_inventory,
    p.is_taxable,
    pv.is_active AS variant_active,
    p.is_active AS product_active
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id
INNER JOIN product_variants pv ON p.product_id = pv.product_id
WHERE p.is_active = 1 AND pv.is_active = 1;

-- Inventory status view with proper joins
CREATE VIEW v_inventory_status AS
SELECT 
    l.location_id,
    l.location_code,
    l.location_name,
    p.product_id,
    p.product_code,
    p.product_name,
    pv.variant_id,
    pv.sku,
    pv.variant_name,
    pv.retail_price,
    ii.quantity_on_hand,
    ii.quantity_available,
    ii.quantity_committed,
    ii.reorder_point,
    ii.reorder_quantity,
    CASE 
        WHEN ii.quantity_available = 0 THEN 'Out of Stock'
        WHEN ii.quantity_available <= ii.reorder_point THEN 'Low Stock'
        ELSE 'In Stock'
    END AS stock_status,
    ROUND(ii.quantity_on_hand * pv.cost, 2) AS inventory_value_cost,
    ROUND(ii.quantity_on_hand * pv.retail_price, 2) AS inventory_value_retail
FROM inventory_items ii
INNER JOIN product_variants pv ON ii.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id
INNER JOIN locations l ON ii.location_id = l.location_id
WHERE p.is_active = 1 AND pv.is_active = 1;

-- Sales order summary view with proper joins
CREATE VIEW v_sales_order_summary AS
SELECT 
    so.order_id,
    so.order_number,
    ot.order_type_name,
    os.order_status_name,
    l.location_name,
    cr.register_name,
    u.first_name || ' ' || u.last_name AS cashier_name,
    so.customer_name,
    so.customer_phone,
    so.order_date,
    so.completed_at,
    so.subtotal,
    so.tax_amount,
    so.discount_amount,
    so.total_amount,
    so.amount_paid,
    so.amount_due,
    COUNT(oli.line_item_id) AS item_count,
    SUM(oli.quantity) AS total_items_quantity,
    so.receipt_number
FROM sales_orders so
INNER JOIN order_types ot ON so.order_type_id = ot.order_type_id
INNER JOIN order_statuses os ON so.order_status_id = os.order_status_id
INNER JOIN locations l ON so.location_id = l.location_id
INNER JOIN cash_registers cr ON so.register_id = cr.register_id
INNER JOIN users u ON so.cashier_user_id = u.user_id
LEFT JOIN order_line_items oli ON so.order_id = oli.order_id
GROUP BY so.order_id;

-- Order details view with line items
CREATE VIEW v_order_details AS
SELECT 
    so.order_id,
    so.order_number,
    so.order_date,
    oli.line_item_id,
    oli.line_number,
    p.product_name,
    pv.variant_name,
    pv.sku,
    oli.quantity,
    oli.unit_price,
    oli.line_discount,
    oli.line_tax,
    oli.line_subtotal,
    oli.line_total,
    oli.cost_price,
    ROUND((oli.unit_price - oli.cost_price) * oli.quantity, 2) AS line_profit
FROM sales_orders so
INNER JOIN order_line_items oli ON so.order_id = oli.order_id
INNER JOIN product_variants pv ON oli.variant_id = pv.variant_id
INNER JOIN products p ON pv.product_id = p.product_id;

-- User permissions view
CREATE VIEW v_user_permissions AS
SELECT 
    u.user_id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    r.role_name,
    p.permission_code,
    p.permission_name,
    u.is_active
FROM users u
INNER JOIN roles r ON u.role_id = r.role_id
INNER JOIN role_permissions rp ON r.role_id = rp.role_id
INNER JOIN permissions p ON rp.permission_id = p.permission_id
WHERE u.is_active = 1;

-- Daily sales summary view
CREATE VIEW v_daily_sales_summary AS
SELECT 
    DATE(so.order_date) AS sale_date,
    l.location_name,
    COUNT(DISTINCT so.order_id) AS order_count,
    SUM(so.subtotal) AS total_subtotal,
    SUM(so.tax_amount) AS total_tax,
    SUM(so.discount_amount) AS total_discounts,
    SUM(so.total_amount) AS total_sales,
    AVG(so.total_amount) AS avg_order_value,
    SUM(oli.quantity) AS total_items_sold
FROM sales_orders so
INNER JOIN locations l ON so.location_id = l.location_id
INNER JOIN order_statuses os ON so.order_status_id = os.order_status_id
LEFT JOIN order_line_items oli ON so.order_id = oli.order_id
WHERE os.order_status_code = 'COMPLETED'
GROUP BY DATE(so.order_date), l.location_id;

-- Payment method summary view
CREATE VIEW v_payment_summary AS
SELECT 
    so.order_id,
    so.order_number,
    pm.method_name AS payment_method,
    pmt.payment_type_name,
    ps.payment_status_name,
    op.payment_amount,
    op.reference_number,
    op.processed_at
FROM order_payments op
INNER JOIN sales_orders so ON op.order_id = so.order_id
INNER JOIN payment_methods pm ON op.payment_method_id = pm.payment_method_id
INNER JOIN payment_method_types pmt ON pm.payment_type_id = pmt.payment_type_id
INNER JOIN payment_statuses ps ON op.payment_status_id = ps.payment_status_id;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
