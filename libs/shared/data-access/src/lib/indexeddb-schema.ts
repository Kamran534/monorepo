/**
 * IndexedDB Schema for POS System
 *
 * This schema mirrors the SQLite schema for offline-first web applications
 * Note: IndexedDB is NoSQL, so we create object stores instead of tables
 */

import { IndexedDBSchema } from './local-db-client';

/**
 * Complete schema for the CPOS database
 * Based on the SQLite DDL schema
 */
export const CPOS_INDEXEDDB_SCHEMA: IndexedDBSchema = {
  stores: {
    // Customer Management
    customer_groups: {
      keyPath: 'id',
      indexes: {
        sync_status: { keyPath: 'sync_status' },
      },
    },

    customers: {
      keyPath: 'id',
      indexes: {
        customer_code: { keyPath: 'customer_code', unique: true },
        email: { keyPath: 'email' },
        phone: { keyPath: 'phone' },
        customer_group_id: { keyPath: 'customer_group_id' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    customer_addresses: {
      keyPath: 'id',
      indexes: {
        customer_id: { keyPath: 'customer_id' },
      },
    },

    // Location/Store Management
    locations: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    // Product Management
    categories: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name' },
        parent_category_id: { keyPath: 'parent_category_id' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    products: {
      keyPath: 'id',
      indexes: {
        sku: { keyPath: 'sku', unique: true },
        barcode: { keyPath: 'barcode' },
        category_id: { keyPath: 'category_id' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    product_variants: {
      keyPath: 'id',
      indexes: {
        product_id: { keyPath: 'product_id' },
        sku: { keyPath: 'sku', unique: true },
        barcode: { keyPath: 'barcode' },
      },
    },

    // Inventory Management
    inventory: {
      keyPath: 'id',
      indexes: {
        product_id: { keyPath: 'product_id' },
        location_id: { keyPath: 'location_id' },
        variant_id: { keyPath: 'variant_id' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    inventory_adjustments: {
      keyPath: 'id',
      indexes: {
        inventory_id: { keyPath: 'inventory_id' },
        created_at: { keyPath: 'created_at' },
      },
    },

    // Sales/Transactions
    sales: {
      keyPath: 'id',
      indexes: {
        receipt_number: { keyPath: 'receipt_number', unique: true },
        customer_id: { keyPath: 'customer_id' },
        location_id: { keyPath: 'location_id' },
        cashier_id: { keyPath: 'cashier_id' },
        created_at: { keyPath: 'created_at' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    sale_items: {
      keyPath: 'id',
      indexes: {
        sale_id: { keyPath: 'sale_id' },
        product_id: { keyPath: 'product_id' },
        variant_id: { keyPath: 'variant_id' },
      },
    },

    // Payment Methods
    payment_methods: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
      },
    },

    payments: {
      keyPath: 'id',
      indexes: {
        sale_id: { keyPath: 'sale_id' },
        payment_method_id: { keyPath: 'payment_method_id' },
        created_at: { keyPath: 'created_at' },
      },
    },

    // Discounts and Promotions
    discounts: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        active: { keyPath: 'active' },
      },
    },

    // Tax Management
    taxes: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        active: { keyPath: 'active' },
      },
    },

    // User Management
    users: {
      keyPath: 'id',
      indexes: {
        email: { keyPath: 'email', unique: true },
        employee_code: { keyPath: 'employee_code', unique: true },
        role_id: { keyPath: 'role_id' },
      },
    },

    roles: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name', unique: true },
      },
    },

    // Cash Management
    cash_drawers: {
      keyPath: 'id',
      indexes: {
        location_id: { keyPath: 'location_id' },
        cashier_id: { keyPath: 'cashier_id' },
        opened_at: { keyPath: 'opened_at' },
      },
    },

    cash_drawer_transactions: {
      keyPath: 'id',
      indexes: {
        cash_drawer_id: { keyPath: 'cash_drawer_id' },
        created_at: { keyPath: 'created_at' },
      },
    },

    // Suppliers
    suppliers: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        email: { keyPath: 'email' },
      },
    },

    // Purchase Orders
    purchase_orders: {
      keyPath: 'id',
      indexes: {
        po_number: { keyPath: 'po_number', unique: true },
        supplier_id: { keyPath: 'supplier_id' },
        created_at: { keyPath: 'created_at' },
      },
    },

    purchase_order_items: {
      keyPath: 'id',
      indexes: {
        purchase_order_id: { keyPath: 'purchase_order_id' },
        product_id: { keyPath: 'product_id' },
      },
    },

    // Sync Management
    sync_queue: {
      keyPath: 'id',
      indexes: {
        entity_type: { keyPath: 'entity_type' },
        operation: { keyPath: 'operation' },
        status: { keyPath: 'status' },
        created_at: { keyPath: 'created_at' },
      },
    },

    sync_conflicts: {
      keyPath: 'id',
      indexes: {
        entity_type: { keyPath: 'entity_type' },
        status: { keyPath: 'status' },
        detected_at: { keyPath: 'detected_at' },
      },
    },

    // Audit Logs
    audit_logs: {
      keyPath: 'id',
      indexes: {
        entity_type: { keyPath: 'entity_type' },
        user_id: { keyPath: 'user_id' },
        created_at: { keyPath: 'created_at' },
      },
    },

    // Additional tables for complete schema
    product_images: {
      keyPath: 'id',
      indexes: {
        product_id: { keyPath: 'product_id' },
      },
    },

    loyalty_programs: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name', unique: true },
        active: { keyPath: 'active' },
      },
    },

    loyalty_transactions: {
      keyPath: 'id',
      indexes: {
        customer_id: { keyPath: 'customer_id' },
        sale_id: { keyPath: 'sale_id' },
        created_at: { keyPath: 'created_at' },
      },
    },

    returns: {
      keyPath: 'id',
      indexes: {
        return_number: { keyPath: 'return_number', unique: true },
        original_sale_id: { keyPath: 'original_sale_id' },
        created_at: { keyPath: 'created_at' },
      },
    },

    return_items: {
      keyPath: 'id',
      indexes: {
        return_id: { keyPath: 'return_id' },
        sale_item_id: { keyPath: 'sale_item_id' },
      },
    },

    shifts: {
      keyPath: 'id',
      indexes: {
        cashier_id: { keyPath: 'cashier_id' },
        location_id: { keyPath: 'location_id' },
        start_time: { keyPath: 'start_time' },
      },
    },

    gift_cards: {
      keyPath: 'id',
      indexes: {
        card_number: { keyPath: 'card_number', unique: true },
        customer_id: { keyPath: 'customer_id' },
      },
    },

    gift_card_transactions: {
      keyPath: 'id',
      indexes: {
        gift_card_id: { keyPath: 'gift_card_id' },
        sale_id: { keyPath: 'sale_id' },
        created_at: { keyPath: 'created_at' },
      },
    },

    store_credit: {
      keyPath: 'id',
      indexes: {
        customer_id: { keyPath: 'customer_id' },
      },
    },

    store_credit_transactions: {
      keyPath: 'id',
      indexes: {
        store_credit_id: { keyPath: 'store_credit_id' },
        sale_id: { keyPath: 'sale_id' },
        created_at: { keyPath: 'created_at' },
      },
    },

    device_info: {
      keyPath: 'id',
      indexes: {
        device_id: { keyPath: 'device_id', unique: true },
        location_id: { keyPath: 'location_id' },
      },
    },

    app_settings: {
      keyPath: 'key',
    },
  },
};

/**
 * Database version
 * Increment this when schema changes
 */
export const CPOS_DB_VERSION = 1;

/**
 * Database name
 */
export const CPOS_DB_NAME = 'cpos';
