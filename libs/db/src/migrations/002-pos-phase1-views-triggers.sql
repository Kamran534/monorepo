-- ============================================================================
-- POS SYSTEM - PHASE 1 MVP - VIEWS AND TRIGGERS
-- ============================================================================
-- This migration adds:
-- 1. Useful views for common queries
-- 2. Triggers for automatic updates and calculations
-- ============================================================================

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Auto-update updated_at timestamp for users
DROP TRIGGER IF EXISTS trg_users_updated_at;
CREATE TRIGGER trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
END;

-- Auto-update updated_at timestamp for products
DROP TRIGGER IF EXISTS trg_products_updated_at;
CREATE TRIGGER trg_products_updated_at
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
    UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE product_id = NEW.product_id;
END;

-- Auto-update updated_at timestamp for product_variants
DROP TRIGGER IF EXISTS trg_variants_updated_at;
CREATE TRIGGER trg_variants_updated_at
AFTER UPDATE ON product_variants
FOR EACH ROW
BEGIN
    UPDATE product_variants SET updated_at = CURRENT_TIMESTAMP WHERE variant_id = NEW.variant_id;
END;

-- Auto-update updated_at timestamp for inventory_items
DROP TRIGGER IF EXISTS trg_inventory_updated_at;
CREATE TRIGGER trg_inventory_updated_at
AFTER UPDATE ON inventory_items
FOR EACH ROW
BEGIN
    UPDATE inventory_items SET updated_at = CURRENT_TIMESTAMP WHERE inventory_id = NEW.inventory_id;
END;

-- Auto-update updated_at timestamp for sales_orders
DROP TRIGGER IF EXISTS trg_orders_updated_at;
CREATE TRIGGER trg_orders_updated_at
AFTER UPDATE ON sales_orders
FOR EACH ROW
BEGIN
    UPDATE sales_orders SET updated_at = CURRENT_TIMESTAMP WHERE order_id = NEW.order_id;
END;

-- Auto-calculate order totals when line items change
DROP TRIGGER IF EXISTS trg_calculate_line_total_insert;
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
DROP VIEW IF EXISTS v_product_catalog;
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
DROP VIEW IF EXISTS v_inventory_status;
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
DROP VIEW IF EXISTS v_sales_order_summary;
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
DROP VIEW IF EXISTS v_order_details;
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
DROP VIEW IF EXISTS v_user_permissions;
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
DROP VIEW IF EXISTS v_daily_sales_summary;
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
DROP VIEW IF EXISTS v_payment_summary;
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

-- Record this migration
INSERT OR IGNORE INTO schema_migrations (version, description) VALUES
('002', 'POS Phase 1 Views and Triggers - Auto-update timestamps and calculation triggers');
