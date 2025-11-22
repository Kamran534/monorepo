/**
 * IndexedDB Schema for POS System
 *
 * This schema EXACTLY matches the SQLite schema for desktop app
 * Same table names (PascalCase), same columns, same structure
 * This ensures seamless sync between desktop SQLite and web IndexedDB
 */

import { IndexedDBSchema } from './local-db-client';

/**
 * Complete schema for the CPOS database
 * Matches SQLite schema exactly - same table names and structure
 */
export const CPOS_INDEXEDDB_SCHEMA: IndexedDBSchema = {
  stores: {
    // ============================================
    // 1. CUSTOMER MANAGEMENT
    // ============================================
    CustomerGroup: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name', unique: true },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    Customer: {
      keyPath: 'id',
      indexes: {
        customerCode: { keyPath: 'customerCode', unique: true },
        email: { keyPath: 'email' },
        phone: { keyPath: 'phone' },
        customerGroupId: { keyPath: 'customerGroupId' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    CustomerAddress: {
      keyPath: 'id',
      indexes: {
        customerId: { keyPath: 'customerId' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    // ============================================
    // 2. LOCATION/STORE MANAGEMENT
    // ============================================
    Location: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        isActive: { keyPath: 'isActive' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    // ============================================
    // 3. PRODUCT & INVENTORY MANAGEMENT
    // ============================================
    Category: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name' },
        parentCategoryId: { keyPath: 'parentCategoryId' },
        isActive: { keyPath: 'isActive' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    Brand: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name', unique: true },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    Supplier: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name', unique: true },
        email: { keyPath: 'email' },
        phone: { keyPath: 'phone' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    TaxCategory: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name', unique: true },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    Product: {
      keyPath: 'id',
      indexes: {
        productCode: { keyPath: 'productCode', unique: true },
        categoryId: { keyPath: 'categoryId' },
        brandId: { keyPath: 'brandId' },
        supplierId: { keyPath: 'supplierId' },
        isActive: { keyPath: 'isActive' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    ProductVariant: {
      keyPath: 'id',
      indexes: {
        productId: { keyPath: 'productId' },
        sku: { keyPath: 'sku', unique: true },
        barcode: { keyPath: 'barcode' },
        isActive: { keyPath: 'isActive' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    InventoryItem: {
      keyPath: 'id',
      indexes: {
        variantId: { keyPath: 'variantId' },
        locationId: { keyPath: 'locationId' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    Barcode: {
      keyPath: 'id',
      indexes: {
        variantId: { keyPath: 'variantId' },
        barcodeValue: { keyPath: 'barcodeValue' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    SerialNumber: {
      keyPath: 'id',
      indexes: {
        variantId: { keyPath: 'variantId' },
        serialNumber: { keyPath: 'serialNumber', unique: true },
        status: { keyPath: 'status' },
        orderId: { keyPath: 'orderId' },
        orderLineItemId: { keyPath: 'orderLineItemId' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    // ============================================
    // 4. USERS & PERMISSIONS
    // ============================================
    Role: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name', unique: true },
        isActive: { keyPath: 'isActive' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    User: {
      keyPath: 'id',
      indexes: {
        username: { keyPath: 'username', unique: true },
        email: { keyPath: 'email', unique: true },
        employeeCode: { keyPath: 'employeeCode', unique: true },
        roleId: { keyPath: 'roleId' },
        isActive: { keyPath: 'isActive' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    UserLocation: {
      keyPath: 'id',
      indexes: {
        userId: { keyPath: 'userId' },
        locationId: { keyPath: 'locationId' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    // ============================================
    // 5. STOCK MANAGEMENT
    // ============================================
    StockAdjustment: {
      keyPath: 'id',
      indexes: {
        locationId: { keyPath: 'locationId' },
        adjustedBy: { keyPath: 'adjustedBy' },
        adjustedAt: { keyPath: 'adjustedAt' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    StockAdjustmentLine: {
      keyPath: 'id',
      indexes: {
        adjustmentId: { keyPath: 'adjustmentId' },
        variantId: { keyPath: 'variantId' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    StockTransfer: {
      keyPath: 'id',
      indexes: {
        transferNumber: { keyPath: 'transferNumber', unique: true },
        fromLocationId: { keyPath: 'fromLocationId' },
        toLocationId: { keyPath: 'toLocationId' },
        status: { keyPath: 'status' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    StockTransferLine: {
      keyPath: 'id',
      indexes: {
        transferId: { keyPath: 'transferId' },
        variantId: { keyPath: 'variantId' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    // ============================================
    // 6. SHIFT MANAGEMENT
    // ============================================
    CashRegister: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        locationId: { keyPath: 'locationId' },
        isActive: { keyPath: 'isActive' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    Shift: {
      keyPath: 'id',
      indexes: {
        shiftNumber: { keyPath: 'shiftNumber', unique: true },
        registerId: { keyPath: 'registerId' },
        locationId: { keyPath: 'locationId' },
        userId: { keyPath: 'userId' },
        status: { keyPath: 'status' },
        openedAt: { keyPath: 'openedAt' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    CashMovement: {
      keyPath: 'id',
      indexes: {
        shiftId: { keyPath: 'shiftId' },
        type: { keyPath: 'type' },
        timestamp: { keyPath: 'timestamp' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    // ============================================
    // 7. PAYMENT METHODS
    // ============================================
    PaymentMethod: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        isActive: { keyPath: 'isActive' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    GiftCard: {
      keyPath: 'id',
      indexes: {
        cardNumber: { keyPath: 'cardNumber', unique: true },
        customerId: { keyPath: 'customerId' },
        isActive: { keyPath: 'isActive' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    StoreCredit: {
      keyPath: 'id',
      indexes: {
        customerId: { keyPath: 'customerId' },
        issuedBy: { keyPath: 'issuedBy' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    // ============================================
    // 8. SALES PERSON MANAGEMENT
    // ============================================
    SalesPerson: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        isActive: { keyPath: 'isActive' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    // ============================================
    // 9. SALES & ORDERS
    // ============================================
    SaleOrder: {
      keyPath: 'id',
      indexes: {
        orderNumber: { keyPath: 'orderNumber', unique: true },
        customerId: { keyPath: 'customerId' },
        locationId: { keyPath: 'locationId' },
        cashierId: { keyPath: 'cashierId' },
        salesPersonId: { keyPath: 'salesPersonId' },
        orderDate: { keyPath: 'orderDate' },
        status: { keyPath: 'status' },
        shiftId: { keyPath: 'shiftId' },
        sync_status: { keyPath: 'sync_status' },
        last_synced_at: { keyPath: 'last_synced_at' },
      },
    },

    OrderLineItem: {
      keyPath: 'id',
      indexes: {
        orderId: { keyPath: 'orderId' },
        variantId: { keyPath: 'variantId' },
        salesPersonId: { keyPath: 'salesPersonId' },
        sync_status: { keyPath: 'sync_status' },
        last_synced_at: { keyPath: 'last_synced_at' },
      },
    },

    OrderPayment: {
      keyPath: 'id',
      indexes: {
        orderId: { keyPath: 'orderId' },
        paymentMethodId: { keyPath: 'paymentMethodId' },
        status: { keyPath: 'status' },
        createdAt: { keyPath: 'createdAt' },
        sync_status: { keyPath: 'sync_status' },
        last_synced_at: { keyPath: 'last_synced_at' },
      },
    },

    OrderDiscount: {
      keyPath: 'id',
      indexes: {
        orderId: { keyPath: 'orderId' },
        discountId: { keyPath: 'discountId' },
        sync_status: { keyPath: 'sync_status' },
        last_synced_at: { keyPath: 'last_synced_at' },
      },
    },

    ShiftTransaction: {
      keyPath: 'id',
      indexes: {
        shiftId: { keyPath: 'shiftId' },
        type: { keyPath: 'type' },
        timestamp: { keyPath: 'timestamp' },
        orderId: { keyPath: 'orderId' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    // ============================================
    // 10. RETURNS & EXCHANGES
    // ============================================
    ReturnOrder: {
      keyPath: 'id',
      indexes: {
        returnNumber: { keyPath: 'returnNumber', unique: true },
        originalOrderId: { keyPath: 'originalOrderId' },
        customerId: { keyPath: 'customerId' },
        status: { keyPath: 'status' },
        returnDate: { keyPath: 'returnDate' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    ReturnLineItem: {
      keyPath: 'id',
      indexes: {
        returnId: { keyPath: 'returnId' },
        originalLineItemId: { keyPath: 'originalLineItemId' },
        variantId: { keyPath: 'variantId' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    ExchangeOrder: {
      keyPath: 'id',
      indexes: {
        exchangeNumber: { keyPath: 'exchangeNumber', unique: true },
        originalOrderId: { keyPath: 'originalOrderId' },
        newOrderId: { keyPath: 'newOrderId' },
        status: { keyPath: 'status' },
        exchangeDate: { keyPath: 'exchangeDate' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    ExchangeLineItem: {
      keyPath: 'id',
      indexes: {
        exchangeId: { keyPath: 'exchangeId' },
        returnedVariantId: { keyPath: 'returnedVariantId' },
        exchangedVariantId: { keyPath: 'exchangedVariantId' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    // ============================================
    // 11. DISCOUNTS & PROMOTIONS
    // ============================================
    Promotion: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        isActive: { keyPath: 'isActive' },
        startDate: { keyPath: 'startDate' },
        endDate: { keyPath: 'endDate' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    PromotionCategory: {
      keyPath: 'id',
      indexes: {
        promotionId: { keyPath: 'promotionId' },
        categoryId: { keyPath: 'categoryId' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    // ============================================
    // 12. TAXES
    // ============================================
    TaxRate: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name' },
        isActive: { keyPath: 'isActive' },
        effectiveDate: { keyPath: 'effectiveDate' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    // ============================================
    // 13. EXPENSES & ACCOUNTING
    // ============================================
    ExpenseAccount: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        parentAccountId: { keyPath: 'parentAccountId' },
        isActive: { keyPath: 'isActive' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    BankAccount: {
      keyPath: 'id',
      indexes: {
        accountNumber: { keyPath: 'accountNumber', unique: true },
        locationId: { keyPath: 'locationId' },
        isActive: { keyPath: 'isActive' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    Expense: {
      keyPath: 'id',
      indexes: {
        expenseNumber: { keyPath: 'expenseNumber', unique: true },
        expenseAccountId: { keyPath: 'expenseAccountId' },
        locationId: { keyPath: 'locationId' },
        status: { keyPath: 'status' },
        expenseDate: { keyPath: 'expenseDate' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    BankDeposit: {
      keyPath: 'id',
      indexes: {
        depositNumber: { keyPath: 'depositNumber', unique: true },
        bankAccountId: { keyPath: 'bankAccountId' },
        locationId: { keyPath: 'locationId' },
        status: { keyPath: 'status' },
        depositDate: { keyPath: 'depositDate' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    BankDepositShift: {
      keyPath: 'id',
      indexes: {
        depositId: { keyPath: 'depositId' },
        shiftId: { keyPath: 'shiftId' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    CashAccount: {
      keyPath: 'id',
      indexes: {
        locationId: { keyPath: 'locationId' },
        registerId: { keyPath: 'registerId' },
        sync_status: { keyPath: 'sync_status' },
      },
    },

    // ============================================
    // 14. ADDITIONAL FEATURES
    // ============================================
    ParkedOrder: {
      keyPath: 'id',
      indexes: {
        parkNumber: { keyPath: 'parkNumber', unique: true },
        orderId: { keyPath: 'orderId', unique: true },
        customerId: { keyPath: 'customerId' },
        parkedBy: { keyPath: 'parkedBy' },
        parkedAt: { keyPath: 'parkedAt' },
        expiryDate: { keyPath: 'expiryDate' },
        sync_status: { keyPath: 'sync_status' },
        last_synced_at: { keyPath: 'last_synced_at' },
      },
    },

    AuditLog: {
      keyPath: 'id',
      indexes: {
        userId: { keyPath: 'userId' },
        entityType: { keyPath: 'entityType' },
        entityId: { keyPath: 'entityId' },
        action: { keyPath: 'action' },
        timestamp: { keyPath: 'timestamp' },
      },
    },

    SystemSetting: {
      keyPath: 'id',
      indexes: {
        key: { keyPath: 'key', unique: true },
        category: { keyPath: 'category' },
      },
    },

    // ============================================
    // 15. STORE CONFIGURATION
    // ============================================
    StoreConfig: {
      keyPath: 'id',
      indexes: {
        organizationCode: { keyPath: 'organizationCode', unique: true },
        sync_status: { keyPath: 'sync_status' },
      },
    },
  },
};

/**
 * Database version
 * Increment this when schema changes
 */
export const CPOS_DB_VERSION = 6;

/**
 * Database name
 */
export const CPOS_DB_NAME = 'cpos';
