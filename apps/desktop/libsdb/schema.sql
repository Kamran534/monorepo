-- ============================================
-- SQLite DDL Schema for Offline Desktop POS System
-- Optimized for local-first, offline-capable operations
-- ============================================

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================
-- 1. CUSTOMER MANAGEMENT
-- ============================================

CREATE TABLE customer_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    discount_percent REAL DEFAULT 0,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0
);

CREATE INDEX idx_customer_groups_sync_status ON customer_groups(sync_status);

CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    customer_code TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    mobile_phone TEXT,
    date_of_birth TEXT,
    gender TEXT,
    tax_id TEXT,
    customer_type TEXT DEFAULT 'Regular', -- Regular, VIP, Wholesale, Employee
    loyalty_points INTEGER DEFAULT 0,
    lifetime_value REAL DEFAULT 0,
    total_spent REAL DEFAULT 0,
    notes TEXT,
    tags TEXT, -- JSON array stored as string
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_visit_date TEXT,
    default_payment_method TEXT,
    credit_limit REAL,
    current_balance REAL DEFAULT 0,
    marketing_opt_in INTEGER DEFAULT 0,
    email_opt_in INTEGER DEFAULT 0,
    sms_opt_in INTEGER DEFAULT 0,
    customer_group_id TEXT,

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    server_updated_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (customer_group_id) REFERENCES customer_groups(id) ON DELETE SET NULL
);

CREATE INDEX idx_customers_customer_code ON customers(customer_code);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_customer_group_id ON customers(customer_group_id);
CREATE INDEX idx_customers_sync_status ON customers(sync_status);

CREATE TABLE customer_addresses (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    address_type TEXT NOT NULL, -- Billing, Shipping, Both
    street1 TEXT NOT NULL,
    street2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- ============================================
-- 2. LOCATION/STORE MANAGEMENT
-- ============================================

CREATE TABLE locations (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- Store, Warehouse, Mobile
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    phone TEXT,
    email TEXT,
    timezone TEXT DEFAULT 'UTC',
    tax_rate REAL DEFAULT 0,
    tax_settings TEXT, -- JSON as string
    is_active INTEGER DEFAULT 1,
    opening_hours TEXT, -- JSON as string
    default_cash_account_id TEXT,
    default_bank_account_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0
);

CREATE INDEX idx_locations_code ON locations(code);
CREATE INDEX idx_locations_is_active ON locations(is_active);

-- ============================================
-- 3. PRODUCT & INVENTORY MANAGEMENT
-- ============================================

CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_category_id TEXT,
    description TEXT,
    image TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_categories_parent_category_id ON categories(parent_category_id);
CREATE INDEX idx_categories_is_active ON categories(is_active);

CREATE TABLE brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    contact_info TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0
);

CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    contact_info TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0
);

CREATE TABLE tax_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    tax_rates TEXT, -- JSON array as string
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0
);

CREATE TABLE products (
    id TEXT PRIMARY KEY,
    product_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT,
    brand_id TEXT,
    supplier_id TEXT,
    has_variants INTEGER DEFAULT 0,
    track_inventory INTEGER DEFAULT 1,
    is_taxable INTEGER DEFAULT 1,
    tax_category_id TEXT,
    images TEXT, -- JSON array as string
    tags TEXT, -- JSON array as string
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (tax_category_id) REFERENCES tax_categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_products_product_code ON products(product_code);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_supplier_id ON products(supplier_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_name ON products(name);

CREATE TABLE product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT,
    upc TEXT,
    variant_name TEXT NOT NULL,
    options TEXT, -- JSON as string
    retail_price REAL NOT NULL,
    wholesale_price REAL,
    cost REAL,
    compare_at_price REAL,
    weight REAL,
    dimensions TEXT, -- JSON as string
    image TEXT,
    position INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_product_variants_barcode ON product_variants(barcode);

CREATE TABLE inventory_items (
    id TEXT PRIMARY KEY,
    variant_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    quantity_on_hand INTEGER DEFAULT 0,
    quantity_available INTEGER DEFAULT 0,
    quantity_committed INTEGER DEFAULT 0,
    quantity_incoming INTEGER DEFAULT 0,
    reorder_point INTEGER,
    reorder_quantity INTEGER,
    last_counted_at TEXT,
    last_received_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    UNIQUE (variant_id, location_id)
);

CREATE INDEX idx_inventory_items_variant_id ON inventory_items(variant_id);
CREATE INDEX idx_inventory_items_location_id ON inventory_items(location_id);

CREATE TABLE stock_adjustments (
    id TEXT PRIMARY KEY,
    location_id TEXT NOT NULL,
    adjustment_type TEXT NOT NULL, -- Increase, Decrease, StockTake
    reason TEXT NOT NULL, -- NEW_PRODUCTS, RETURN, DAMAGE, SHRINKAGE, etc.
    reference_number TEXT,
    notes TEXT,
    adjusted_by TEXT NOT NULL,
    adjusted_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (adjusted_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_stock_adjustments_location_id ON stock_adjustments(location_id);
CREATE INDEX idx_stock_adjustments_adjusted_by ON stock_adjustments(adjusted_by);
CREATE INDEX idx_stock_adjustments_adjusted_at ON stock_adjustments(adjusted_at);

CREATE TABLE stock_adjustment_lines (
    id TEXT PRIMARY KEY,
    adjustment_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,

    FOREIGN KEY (adjustment_id) REFERENCES stock_adjustments(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
);

CREATE INDEX idx_stock_adjustment_lines_adjustment_id ON stock_adjustment_lines(adjustment_id);
CREATE INDEX idx_stock_adjustment_lines_variant_id ON stock_adjustment_lines(variant_id);

CREATE TABLE stock_transfers (
    id TEXT PRIMARY KEY,
    from_location_id TEXT NOT NULL,
    to_location_id TEXT NOT NULL,
    transfer_number TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'Draft', -- Draft, InTransit, Received, Cancelled
    transfer_date TEXT NOT NULL,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (from_location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (to_location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_stock_transfers_transfer_number ON stock_transfers(transfer_number);
CREATE INDEX idx_stock_transfers_from_location_id ON stock_transfers(from_location_id);
CREATE INDEX idx_stock_transfers_to_location_id ON stock_transfers(to_location_id);
CREATE INDEX idx_stock_transfers_status ON stock_transfers(status);

CREATE TABLE stock_transfer_lines (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    received INTEGER,

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,

    FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
);

CREATE INDEX idx_stock_transfer_lines_transfer_id ON stock_transfer_lines(transfer_id);
CREATE INDEX idx_stock_transfer_lines_variant_id ON stock_transfer_lines(variant_id);

CREATE TABLE barcodes (
    id TEXT PRIMARY KEY,
    variant_id TEXT NOT NULL,
    barcode_value TEXT NOT NULL,
    barcode_type TEXT NOT NULL, -- UPC, EAN13, CODE128, QR, etc.
    is_primary INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

CREATE INDEX idx_barcodes_variant_id ON barcodes(variant_id);
CREATE INDEX idx_barcodes_barcode_value ON barcodes(barcode_value);

CREATE TABLE serial_numbers (
    id TEXT PRIMARY KEY,
    variant_id TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'InStock', -- InStock, Sold, Returned, Defective
    order_id TEXT,
    order_line_item_id TEXT,
    location_id TEXT,
    received_date TEXT,
    sold_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES sale_orders(id) ON DELETE SET NULL,
    FOREIGN KEY (order_line_item_id) REFERENCES order_line_items(id) ON DELETE SET NULL
);

CREATE INDEX idx_serial_numbers_variant_id ON serial_numbers(variant_id);
CREATE INDEX idx_serial_numbers_serial_number ON serial_numbers(serial_number);
CREATE INDEX idx_serial_numbers_status ON serial_numbers(status);

-- ============================================
-- 4. USERS & PERMISSIONS
-- ============================================

CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    permissions TEXT, -- JSON array as string
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0
);

CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_is_active ON roles(is_active);

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    pin TEXT,
    password_hash TEXT NOT NULL,
    role_id TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    hire_date TEXT,
    termination_date TEXT,
    phone TEXT,
    employee_code TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE TABLE user_locations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    UNIQUE (user_id, location_id)
);

CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX idx_user_locations_location_id ON user_locations(location_id);

-- ============================================
-- 5. PAYMENT METHODS
-- ============================================

CREATE TABLE payment_methods (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- Cash, Card, BankTransfer, Check, GiftCard, StoreCredit, OnAccount
    is_active INTEGER DEFAULT 1,
    requires_authorization INTEGER DEFAULT 0,
    account_id TEXT,
    sort_order INTEGER DEFAULT 0,
    icon TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0
);

CREATE INDEX idx_payment_methods_code ON payment_methods(code);
CREATE INDEX idx_payment_methods_is_active ON payment_methods(is_active);

CREATE TABLE gift_cards (
    id TEXT PRIMARY KEY,
    card_number TEXT NOT NULL UNIQUE,
    pin TEXT,
    customer_id TEXT,
    initial_value REAL NOT NULL,
    current_balance REAL NOT NULL,
    issued_date TEXT DEFAULT (datetime('now')),
    expiry_date TEXT,
    is_active INTEGER DEFAULT 1,
    issued_order_id TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (issued_order_id) REFERENCES sale_orders(id) ON DELETE SET NULL
);

CREATE INDEX idx_gift_cards_card_number ON gift_cards(card_number);
CREATE INDEX idx_gift_cards_customer_id ON gift_cards(customer_id);
CREATE INDEX idx_gift_cards_is_active ON gift_cards(is_active);

CREATE TABLE store_credits (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    amount REAL NOT NULL,
    balance REAL NOT NULL,
    reason TEXT,
    issued_date TEXT DEFAULT (datetime('now')),
    expiry_date TEXT,
    issued_by TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_store_credits_customer_id ON store_credits(customer_id);
CREATE INDEX idx_store_credits_issued_by ON store_credits(issued_by);

-- ============================================
-- 6. SHIFT MANAGEMENT
-- ============================================

CREATE TABLE cash_registers (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    location_id TEXT NOT NULL,
    current_shift_id TEXT UNIQUE,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT
);

CREATE INDEX idx_cash_registers_code ON cash_registers(code);
CREATE INDEX idx_cash_registers_location_id ON cash_registers(location_id);
CREATE INDEX idx_cash_registers_is_active ON cash_registers(is_active);

CREATE TABLE shifts (
    id TEXT PRIMARY KEY,
    shift_number TEXT NOT NULL UNIQUE,
    register_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    opened_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT,
    status TEXT DEFAULT 'Open', -- Open, Closed, Reconciled
    opening_cash REAL NOT NULL,
    expected_cash REAL DEFAULT 0,
    actual_cash REAL,
    cash_difference REAL,
    total_sales REAL DEFAULT 0,
    total_returns REAL DEFAULT 0,
    total_payouts REAL DEFAULT 0,
    notes TEXT,
    closed_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (register_id) REFERENCES cash_registers(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_shifts_shift_number ON shifts(shift_number);
CREATE INDEX idx_shifts_register_id ON shifts(register_id);
CREATE INDEX idx_shifts_user_id ON shifts(user_id);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_opened_at ON shifts(opened_at);

CREATE TABLE shift_transactions (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL,
    type TEXT NOT NULL, -- Sale, Return, CashIn, CashOut, Payout
    amount REAL NOT NULL,
    payment_method_id TEXT,
    order_id TEXT,
    notes TEXT,
    timestamp TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,

    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES sale_orders(id) ON DELETE SET NULL
);

CREATE INDEX idx_shift_transactions_shift_id ON shift_transactions(shift_id);
CREATE INDEX idx_shift_transactions_type ON shift_transactions(type);
CREATE INDEX idx_shift_transactions_timestamp ON shift_transactions(timestamp);

CREATE TABLE cash_movements (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL,
    type TEXT NOT NULL, -- Addition, Removal
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    added_by TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,

    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_cash_movements_shift_id ON cash_movements(shift_id);
CREATE INDEX idx_cash_movements_type ON cash_movements(type);

-- ============================================
-- 7. SALES & ORDERS
-- ============================================

CREATE TABLE sale_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    order_type TEXT DEFAULT 'Sale', -- Sale, Return, Exchange
    location_id TEXT NOT NULL,
    customer_id TEXT,
    cashier_id TEXT NOT NULL,
    order_date TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    status TEXT DEFAULT 'Open', -- Open, Completed, Voided, Parked, OnHold
    subtotal REAL NOT NULL,
    tax_amount REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    change_amount REAL DEFAULT 0,
    amount_due REAL DEFAULT 0,
    notes TEXT,
    customer_notes TEXT,
    internal_notes TEXT,
    reference_order_id TEXT,
    source TEXT DEFAULT 'POS', -- POS, Online, Mobile
    receipt_number TEXT,
    receipt_emailed_at TEXT,
    receipt_printed_at TEXT,
    shift_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
);

CREATE INDEX idx_sale_orders_order_number ON sale_orders(order_number);
CREATE INDEX idx_sale_orders_customer_id ON sale_orders(customer_id);
CREATE INDEX idx_sale_orders_location_id ON sale_orders(location_id);
CREATE INDEX idx_sale_orders_cashier_id ON sale_orders(cashier_id);
CREATE INDEX idx_sale_orders_order_date ON sale_orders(order_date);
CREATE INDEX idx_sale_orders_status ON sale_orders(status);
CREATE INDEX idx_sale_orders_shift_id ON sale_orders(shift_id);
CREATE INDEX idx_sale_orders_sync_status ON sale_orders(sync_status);

CREATE TABLE order_line_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    line_discount REAL DEFAULT 0,
    line_tax REAL DEFAULT 0,
    line_total REAL NOT NULL,
    cost REAL,
    is_refunded INTEGER DEFAULT 0,
    refunded_quantity INTEGER DEFAULT 0,
    notes TEXT,
    customizations TEXT, -- JSON as string
    serial_numbers TEXT, -- JSON array as string
    created_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,

    FOREIGN KEY (order_id) REFERENCES sale_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
);

CREATE INDEX idx_order_line_items_order_id ON order_line_items(order_id);
CREATE INDEX idx_order_line_items_variant_id ON order_line_items(variant_id);

CREATE TABLE order_payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    payment_method_id TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'Pending', -- Pending, Completed, Failed, Refunded
    transaction_id TEXT,
    authorization_code TEXT,
    card_last4 TEXT,
    card_brand TEXT,
    processed_at TEXT DEFAULT (datetime('now')),
    refunded_amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,

    FOREIGN KEY (order_id) REFERENCES sale_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT
);

CREATE INDEX idx_order_payments_order_id ON order_payments(order_id);
CREATE INDEX idx_order_payments_payment_method_id ON order_payments(payment_method_id);
CREATE INDEX idx_order_payments_status ON order_payments(status);

-- ============================================
-- 8. RETURNS & EXCHANGES
-- ============================================

CREATE TABLE return_orders (
    id TEXT PRIMARY KEY,
    return_number TEXT NOT NULL UNIQUE,
    original_order_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    customer_id TEXT,
    processed_by TEXT NOT NULL,
    return_date TEXT DEFAULT (datetime('now')),
    return_type TEXT NOT NULL, -- Full, Partial
    return_reason TEXT,
    notes TEXT,
    refund_method TEXT,
    refund_amount REAL NOT NULL,
    restock_fee REAL DEFAULT 0,
    status TEXT DEFAULT 'Pending', -- Pending, Completed, Rejected
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (original_order_id) REFERENCES sale_orders(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_return_orders_return_number ON return_orders(return_number);
CREATE INDEX idx_return_orders_original_order_id ON return_orders(original_order_id);
CREATE INDEX idx_return_orders_customer_id ON return_orders(customer_id);
CREATE INDEX idx_return_orders_status ON return_orders(status);

CREATE TABLE return_line_items (
    id TEXT PRIMARY KEY,
    return_id TEXT NOT NULL,
    original_line_item_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    quantity_returned INTEGER NOT NULL,
    refund_amount REAL NOT NULL,
    condition TEXT NOT NULL, -- New, Used, Damaged
    restockable INTEGER DEFAULT 1,

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,

    FOREIGN KEY (return_id) REFERENCES return_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (original_line_item_id) REFERENCES order_line_items(id) ON DELETE RESTRICT,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
);

CREATE INDEX idx_return_line_items_return_id ON return_line_items(return_id);
CREATE INDEX idx_return_line_items_original_line_item_id ON return_line_items(original_line_item_id);
CREATE INDEX idx_return_line_items_variant_id ON return_line_items(variant_id);

CREATE TABLE exchange_orders (
    id TEXT PRIMARY KEY,
    exchange_number TEXT NOT NULL UNIQUE,
    original_order_id TEXT NOT NULL,
    new_order_id TEXT NOT NULL,
    price_difference REAL NOT NULL,
    additional_payment REAL DEFAULT 0,
    refund_amount REAL DEFAULT 0,
    exchange_date TEXT DEFAULT (datetime('now')),
    processed_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (original_order_id) REFERENCES sale_orders(id) ON DELETE RESTRICT,
    FOREIGN KEY (new_order_id) REFERENCES sale_orders(id) ON DELETE RESTRICT,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_exchange_orders_exchange_number ON exchange_orders(exchange_number);
CREATE INDEX idx_exchange_orders_original_order_id ON exchange_orders(original_order_id);
CREATE INDEX idx_exchange_orders_new_order_id ON exchange_orders(new_order_id);

-- ============================================
-- 9. EXPENSES & ACCOUNTING
-- ============================================

CREATE TABLE expense_accounts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- COGS, Operating, Utilities, Payroll, Marketing, etc.
    parent_account_id TEXT,
    is_active INTEGER DEFAULT 1,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (parent_account_id) REFERENCES expense_accounts(id) ON DELETE SET NULL
);

CREATE INDEX idx_expense_accounts_code ON expense_accounts(code);
CREATE INDEX idx_expense_accounts_parent_account_id ON expense_accounts(parent_account_id);
CREATE INDEX idx_expense_accounts_is_active ON expense_accounts(is_active);

CREATE TABLE expenses (
    id TEXT PRIMARY KEY,
    expense_number TEXT NOT NULL UNIQUE,
    expense_account_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    amount REAL NOT NULL,
    expense_date TEXT NOT NULL,
    paid_date TEXT,
    payment_method_id TEXT,
    bank_account_id TEXT,
    vendor_id TEXT,
    description TEXT NOT NULL,
    notes TEXT,
    receipt_image TEXT,
    created_by TEXT NOT NULL,
    approved_by TEXT,
    status TEXT DEFAULT 'Draft', -- Draft, Approved, Paid, Rejected
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (expense_account_id) REFERENCES expense_accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_expenses_expense_number ON expenses(expense_number);
CREATE INDEX idx_expenses_expense_account_id ON expenses(expense_account_id);
CREATE INDEX idx_expenses_location_id ON expenses(location_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);

CREATE TABLE bank_accounts (
    id TEXT PRIMARY KEY,
    account_number TEXT NOT NULL UNIQUE,
    bank_name TEXT NOT NULL,
    account_type TEXT NOT NULL, -- Checking, Savings, CreditCard
    current_balance REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    is_active INTEGER DEFAULT 1,
    location_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE INDEX idx_bank_accounts_account_number ON bank_accounts(account_number);
CREATE INDEX idx_bank_accounts_location_id ON bank_accounts(location_id);
CREATE INDEX idx_bank_accounts_is_active ON bank_accounts(is_active);

CREATE TABLE bank_deposits (
    id TEXT PRIMARY KEY,
    deposit_number TEXT NOT NULL UNIQUE,
    bank_account_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    deposit_date TEXT NOT NULL,
    amount REAL NOT NULL,
    deposited_by TEXT NOT NULL,
    shift_ids TEXT, -- JSON array as string
    notes TEXT,
    status TEXT DEFAULT 'Pending', -- Pending, Completed, Cancelled
    reference_number TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (deposited_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_bank_deposits_deposit_number ON bank_deposits(deposit_number);
CREATE INDEX idx_bank_deposits_bank_account_id ON bank_deposits(bank_account_id);
CREATE INDEX idx_bank_deposits_location_id ON bank_deposits(location_id);
CREATE INDEX idx_bank_deposits_status ON bank_deposits(status);
CREATE INDEX idx_bank_deposits_deposit_date ON bank_deposits(deposit_date);

-- Junction table for many-to-many relationship
CREATE TABLE bank_deposit_shifts (
    id TEXT PRIMARY KEY,
    deposit_id TEXT NOT NULL,
    shift_id TEXT NOT NULL,

    FOREIGN KEY (deposit_id) REFERENCES bank_deposits(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    UNIQUE (deposit_id, shift_id)
);

CREATE INDEX idx_bank_deposit_shifts_deposit_id ON bank_deposit_shifts(deposit_id);
CREATE INDEX idx_bank_deposit_shifts_shift_id ON bank_deposit_shifts(shift_id);

CREATE TABLE cash_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location_id TEXT NOT NULL,
    register_id TEXT,
    current_balance REAL NOT NULL,
    type TEXT NOT NULL, -- Register, PettyCash
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (register_id) REFERENCES cash_registers(id) ON DELETE SET NULL
);

CREATE INDEX idx_cash_accounts_location_id ON cash_accounts(location_id);
CREATE INDEX idx_cash_accounts_register_id ON cash_accounts(register_id);

-- ============================================
-- 10. DISCOUNTS & PROMOTIONS
-- ============================================

CREATE TABLE promotions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- Percentage, FixedAmount, BuyXGetY, FreeShipping
    value REAL NOT NULL,
    applicable_to TEXT NOT NULL, -- EntireOrder, Category, Product, Customer
    min_purchase_amount REAL,
    max_discount_amount REAL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    customer_group_ids TEXT, -- JSON array as string
    category_ids TEXT, -- JSON array as string
    product_ids TEXT, -- JSON array as string
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0
);

CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_is_active ON promotions(is_active);
CREATE INDEX idx_promotions_start_date ON promotions(start_date);
CREATE INDEX idx_promotions_end_date ON promotions(end_date);

-- Junction table for promotions and categories
CREATE TABLE promotion_categories (
    id TEXT PRIMARY KEY,
    promotion_id TEXT NOT NULL,
    category_id TEXT NOT NULL,

    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE (promotion_id, category_id)
);

CREATE INDEX idx_promotion_categories_promotion_id ON promotion_categories(promotion_id);
CREATE INDEX idx_promotion_categories_category_id ON promotion_categories(category_id);

CREATE TABLE order_discounts (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    discount_id TEXT,
    discount_amount REAL NOT NULL,
    applied_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,

    FOREIGN KEY (order_id) REFERENCES sale_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (discount_id) REFERENCES promotions(id) ON DELETE SET NULL,
    FOREIGN KEY (applied_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_order_discounts_order_id ON order_discounts(order_id);
CREATE INDEX idx_order_discounts_discount_id ON order_discounts(discount_id);

-- ============================================
-- 11. TAXES
-- ============================================

CREATE TABLE tax_rates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rate REAL NOT NULL,
    type TEXT DEFAULT 'Percentage', -- Percentage, Fixed
    applicable_locations TEXT, -- JSON array as string
    is_compound INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    effective_date TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0
);

CREATE INDEX idx_tax_rates_name ON tax_rates(name);
CREATE INDEX idx_tax_rates_is_active ON tax_rates(is_active);
CREATE INDEX idx_tax_rates_effective_date ON tax_rates(effective_date);

-- ============================================
-- 12. ADDITIONAL FEATURES
-- ============================================

CREATE TABLE parked_orders (
    id TEXT PRIMARY KEY,
    park_number TEXT NOT NULL UNIQUE,
    customer_id TEXT,
    order_id TEXT NOT NULL UNIQUE,
    parked_at TEXT DEFAULT (datetime('now')),
    parked_by TEXT NOT NULL,
    expiry_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT,
    is_deleted INTEGER DEFAULT 0,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES sale_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (parked_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_parked_orders_park_number ON parked_orders(park_number);
CREATE INDEX idx_parked_orders_customer_id ON parked_orders(customer_id);
CREATE INDEX idx_parked_orders_parked_at ON parked_orders(parked_at);
CREATE INDEX idx_parked_orders_expiry_date ON parked_orders(expiry_date);

CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL, -- Create, Update, Delete, View
    entity_type TEXT NOT NULL, -- Product, Order, Customer, etc.
    entity_id TEXT NOT NULL,
    old_value TEXT, -- JSON as string
    new_value TEXT, -- JSON as string
    timestamp TEXT DEFAULT (datetime('now')),
    ip_address TEXT,
    device_info TEXT,

    -- Sync fields
    sync_status TEXT DEFAULT 'pending',
    last_synced_at TEXT,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_sync_status ON audit_logs(sync_status);

CREATE TABLE system_settings (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL, -- JSON as string
    category TEXT NOT NULL, -- Store, Receipt, Email, Tax, Hardware, Sync
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync fields
    sync_status TEXT DEFAULT 'synced',
    last_synced_at TEXT
);

CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- ============================================
-- 13. OFFLINE SYNC MANAGEMENT
-- ============================================

CREATE TABLE sync_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL, -- Table name
    entity_id TEXT NOT NULL, -- Record ID
    operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    data TEXT NOT NULL, -- JSON payload with full record data
    status TEXT DEFAULT 'pending', -- pending, syncing, synced, failed
    attempts INTEGER DEFAULT 0,
    last_attempt TEXT,
    error_message TEXT,
    priority INTEGER DEFAULT 0, -- Higher priority synced first
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_entity_type ON sync_queue(entity_type);
CREATE INDEX idx_sync_queue_created_at ON sync_queue(created_at);
CREATE INDEX idx_sync_queue_priority ON sync_queue(priority DESC);

CREATE TABLE sync_logs (
    id TEXT PRIMARY KEY,
    sync_type TEXT NOT NULL, -- full, incremental, entity-specific
    direction TEXT NOT NULL, -- upload, download, bidirectional
    status TEXT NOT NULL, -- in-progress, completed, failed
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    records_synced INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_log TEXT, -- JSON as string
    metadata TEXT -- JSON as string with additional context
);

CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_started_at ON sync_logs(started_at);

CREATE TABLE sync_conflicts (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    local_data TEXT NOT NULL, -- JSON of local version
    server_data TEXT NOT NULL, -- JSON of server version
    conflict_type TEXT NOT NULL, -- update-update, update-delete, delete-update
    status TEXT DEFAULT 'unresolved', -- unresolved, resolved-local, resolved-server, resolved-merged
    detected_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    resolved_by TEXT,
    resolution_data TEXT, -- JSON of resolved version

    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_sync_conflicts_status ON sync_conflicts(status);
CREATE INDEX idx_sync_conflicts_entity_type ON sync_conflicts(entity_type);
CREATE INDEX idx_sync_conflicts_detected_at ON sync_conflicts(detected_at);

-- ============================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================

-- Customer updated_at trigger
CREATE TRIGGER update_customers_timestamp
AFTER UPDATE ON customers
BEGIN
    UPDATE customers SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Product updated_at trigger
CREATE TRIGGER update_products_timestamp
AFTER UPDATE ON products
BEGIN
    UPDATE products SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ProductVariant updated_at trigger
CREATE TRIGGER update_product_variants_timestamp
AFTER UPDATE ON product_variants
BEGIN
    UPDATE product_variants SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- SaleOrder updated_at trigger
CREATE TRIGGER update_sale_orders_timestamp
AFTER UPDATE ON sale_orders
BEGIN
    UPDATE sale_orders SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Location updated_at trigger
CREATE TRIGGER update_locations_timestamp
AFTER UPDATE ON locations
BEGIN
    UPDATE locations SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- User updated_at trigger
CREATE TRIGGER update_users_timestamp
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================
-- TRIGGERS FOR SYNC QUEUE POPULATION
-- ============================================

-- Automatically add INSERT operations to sync queue
CREATE TRIGGER sync_queue_after_insert_sale_orders
AFTER INSERT ON sale_orders
WHEN NEW.sync_status = 'pending'
BEGIN
    INSERT INTO sync_queue (id, entity_type, entity_id, operation, data, priority)
    VALUES (
        lower(hex(randomblob(16))),
        'sale_orders',
        NEW.id,
        'INSERT',
        json_object(
            'id', NEW.id,
            'order_number', NEW.order_number,
            'order_type', NEW.order_type,
            'location_id', NEW.location_id,
            'customer_id', NEW.customer_id,
            'cashier_id', NEW.cashier_id,
            'total_amount', NEW.total_amount,
            'status', NEW.status
        ),
        10
    );
END;

-- Automatically add UPDATE operations to sync queue
CREATE TRIGGER sync_queue_after_update_sale_orders
AFTER UPDATE ON sale_orders
WHEN NEW.sync_status = 'pending' AND OLD.sync_status = 'synced'
BEGIN
    INSERT INTO sync_queue (id, entity_type, entity_id, operation, data, priority)
    VALUES (
        lower(hex(randomblob(16))),
        'sale_orders',
        NEW.id,
        'UPDATE',
        json_object(
            'id', NEW.id,
            'order_number', NEW.order_number,
            'status', NEW.status,
            'total_amount', NEW.total_amount
        ),
        10
    );
END;

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Current inventory levels with product info
CREATE VIEW v_inventory_levels AS
SELECT
    ii.id,
    ii.variant_id,
    pv.sku,
    pv.barcode,
    pv.variant_name,
    p.product_code,
    p.name as product_name,
    c.name as category_name,
    ii.location_id,
    l.name as location_name,
    ii.quantity_on_hand,
    ii.quantity_available,
    ii.quantity_committed,
    ii.quantity_incoming,
    ii.reorder_point,
    ii.reorder_quantity,
    pv.retail_price,
    pv.cost,
    (ii.quantity_on_hand * pv.cost) as inventory_value
FROM inventory_items ii
INNER JOIN product_variants pv ON ii.variant_id = pv.id
INNER JOIN products p ON pv.product_id = p.id
INNER JOIN locations l ON ii.location_id = l.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_deleted = 0 AND pv.is_deleted = 0;

-- View: Low stock alerts
CREATE VIEW v_low_stock_alerts AS
SELECT
    ii.id,
    pv.sku,
    pv.variant_name,
    p.name as product_name,
    l.name as location_name,
    ii.quantity_on_hand,
    ii.reorder_point,
    ii.reorder_quantity,
    (ii.reorder_point - ii.quantity_on_hand) as units_below_reorder
FROM inventory_items ii
INNER JOIN product_variants pv ON ii.variant_id = pv.id
INNER JOIN products p ON pv.product_id = p.id
INNER JOIN locations l ON ii.location_id = l.id
WHERE ii.reorder_point IS NOT NULL
  AND ii.quantity_on_hand <= ii.reorder_point
  AND p.is_deleted = 0
  AND pv.is_deleted = 0;

-- View: Daily sales summary
CREATE VIEW v_daily_sales_summary AS
SELECT
    DATE(order_date) as sale_date,
    location_id,
    COUNT(*) as total_orders,
    SUM(subtotal) as total_subtotal,
    SUM(tax_amount) as total_tax,
    SUM(discount_amount) as total_discounts,
    SUM(total_amount) as total_sales,
    AVG(total_amount) as average_order_value
FROM sale_orders
WHERE status = 'Completed' AND is_deleted = 0
GROUP BY DATE(order_date), location_id;

-- View: Open shifts
CREATE VIEW v_open_shifts AS
SELECT
    s.id,
    s.shift_number,
    s.register_id,
    cr.name as register_name,
    s.location_id,
    l.name as location_name,
    s.user_id,
    u.first_name || ' ' || u.last_name as cashier_name,
    s.opened_at,
    s.opening_cash,
    s.total_sales,
    s.expected_cash
FROM shifts s
INNER JOIN cash_registers cr ON s.register_id = cr.id
INNER JOIN locations l ON s.location_id = l.id
INNER JOIN users u ON s.user_id = u.id
WHERE s.status = 'Open' AND s.is_deleted = 0;

-- View: Customer purchase summary
CREATE VIEW v_customer_purchase_summary AS
SELECT
    c.id as customer_id,
    c.customer_code,
    c.first_name || ' ' || c.last_name as customer_name,
    c.email,
    c.phone,
    COUNT(so.id) as total_orders,
    SUM(so.total_amount) as total_spent,
    AVG(so.total_amount) as average_order_value,
    MAX(so.order_date) as last_purchase_date,
    c.loyalty_points
FROM customers c
LEFT JOIN sale_orders so ON c.id = so.customer_id AND so.status = 'Completed' AND so.is_deleted = 0
WHERE c.is_deleted = 0
GROUP BY c.id;

-- View: Pending sync items
CREATE VIEW v_pending_sync_items AS
SELECT
    entity_type,
    COUNT(*) as pending_count,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
    MIN(created_at) as oldest_pending,
    MAX(created_at) as newest_pending
FROM sync_queue
WHERE status IN ('pending', 'failed')
GROUP BY entity_type;

-- ============================================
-- INITIAL DATA POPULATION
-- ============================================

-- Insert default payment methods
INSERT INTO payment_methods (id, code, name, type, sort_order) VALUES
('pm_cash', 'CASH', 'Cash', 'Cash', 1),
('pm_card', 'CARD', 'Credit/Debit Card', 'Card', 2),
('pm_giftcard', 'GIFTCARD', 'Gift Card', 'GiftCard', 3),
('pm_credit', 'STORECREDIT', 'Store Credit', 'StoreCredit', 4),
('pm_account', 'ONACCOUNT', 'On Account', 'OnAccount', 5);

-- Insert default admin role
INSERT INTO roles (id, name, description, permissions) VALUES
('role_admin', 'Administrator', 'Full system access', json_array(
    'view_products', 'create_products', 'edit_products', 'delete_products',
    'manage_inventory', 'adjust_stock',
    'view_orders', 'create_orders', 'edit_orders', 'void_orders',
    'view_customers', 'create_customers', 'edit_customers',
    'process_returns', 'process_exchanges',
    'apply_discounts', 'override_prices',
    'open_shift', 'close_shift', 'manage_cash',
    'view_reports', 'manage_users', 'manage_settings'
));

-- Insert default cashier role
INSERT INTO roles (id, name, description, permissions) VALUES
('role_cashier', 'Cashier', 'Basic POS operations', json_array(
    'view_products',
    'create_orders', 'view_orders',
    'view_customers', 'create_customers',
    'process_returns',
    'apply_discounts',
    'open_shift', 'close_shift'
));

-- ============================================
-- DATABASE OPTIMIZATION SETTINGS
-- ============================================

-- Set journal mode to WAL for better concurrent access
PRAGMA journal_mode = WAL;

-- Set synchronous mode for better performance while maintaining data integrity
PRAGMA synchronous = NORMAL;

-- Set temp store to memory for better performance
PRAGMA temp_store = MEMORY;

-- Set cache size (negative number means KB, here 64MB)
PRAGMA cache_size = -64000;

-- Enable memory-mapped I/O for better performance (256MB)
PRAGMA mmap_size = 268435456;

-- Analyze the database for query optimization
ANALYZE;
