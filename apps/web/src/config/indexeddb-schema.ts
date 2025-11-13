/**
 * IndexedDB Schema for Web App
 * Mirrors the SQL schema from desktop app but adapted for IndexedDB structure
 */

export interface IndexedDBSchema {
  stores: {
    [storeName: string]: {
      keyPath: string;
      autoIncrement?: boolean;
      indexes?: {
        [indexName: string]: {
          keyPath: string | string[];
          unique?: boolean;
          multiEntry?: boolean;
        };
      };
    };
  };
}

/**
 * Complete schema for CPOS web app
 * Based on schema.sql from desktop app
 */
export const cposSchema: IndexedDBSchema = {
  stores: {
    // Customer Management
    CustomerGroup: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name', unique: true },
      },
    },
    Customer: {
      keyPath: 'id',
      indexes: {
        customerCode: { keyPath: 'customerCode', unique: true },
        email: { keyPath: 'email' },
        phone: { keyPath: 'phone' },
        customerGroupId: { keyPath: 'customerGroupId' },
      },
    },
    CustomerAddress: {
      keyPath: 'id',
      indexes: {
        customerId: { keyPath: 'customerId' },
      },
    },

    // Location/Store Management
    Location: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
      },
    },

    // Product Management
    Category: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name', unique: false }, // Changed to non-unique as categories can have same name in different parents
        parentCategoryId: { keyPath: 'parentCategoryId' }, // Fixed: was parentId, should be parentCategoryId
      },
    },
    Brand: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name', unique: true },
      },
    },
    Supplier: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        name: { keyPath: 'name' },
      },
    },
    Product: {
      keyPath: 'id',
      indexes: {
        sku: { keyPath: 'sku', unique: true },
        name: { keyPath: 'name' },
        categoryId: { keyPath: 'categoryId' },
        brandId: { keyPath: 'brandId' },
        supplierId: { keyPath: 'supplierId' },
      },
    },
    ProductVariant: {
      keyPath: 'id',
      indexes: {
        productId: { keyPath: 'productId' },
        sku: { keyPath: 'sku', unique: true },
      },
    },
    InventoryItem: {
      keyPath: 'id',
      indexes: {
        productVariantId: { keyPath: 'productVariantId' },
        locationId: { keyPath: 'locationId' },
      },
    },
    Barcode: {
      keyPath: 'id',
      indexes: {
        barcode: { keyPath: 'barcode', unique: true },
        productVariantId: { keyPath: 'productVariantId' },
      },
    },
    SerialNumber: {
      keyPath: 'id',
      indexes: {
        serialNumber: { keyPath: 'serialNumber', unique: true },
        productVariantId: { keyPath: 'productVariantId' },
      },
    },

    // User Management
    Role: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name', unique: true },
      },
    },
    User: {
      keyPath: 'id',
      indexes: {
        username: { keyPath: 'username', unique: true },
        email: { keyPath: 'email', unique: true },
        roleId: { keyPath: 'roleId' },
      },
    },
    UserLocation: {
      keyPath: 'id',
      indexes: {
        userId: { keyPath: 'userId' },
        locationId: { keyPath: 'locationId' },
      },
    },

    // Tax Management
    TaxCategory: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name', unique: true },
      },
    },
    TaxRate: {
      keyPath: 'id',
      indexes: {
        taxCategoryId: { keyPath: 'taxCategoryId' },
      },
    },

    // Payment Methods
    PaymentMethod: {
      keyPath: 'id',
      indexes: {
        name: { keyPath: 'name', unique: true },
      },
    },

    // Sales Orders
    SaleOrder: {
      keyPath: 'id',
      indexes: {
        orderNumber: { keyPath: 'orderNumber', unique: true },
        customerId: { keyPath: 'customerId' },
        userId: { keyPath: 'userId' },
        locationId: { keyPath: 'locationId' },
        shiftId: { keyPath: 'shiftId' },
        createdAt: { keyPath: 'createdAt' },
      },
    },
    OrderLineItem: {
      keyPath: 'id',
      indexes: {
        orderId: { keyPath: 'orderId' },
        productVariantId: { keyPath: 'productVariantId' },
      },
    },
    OrderPayment: {
      keyPath: 'id',
      indexes: {
        orderId: { keyPath: 'orderId' },
        paymentMethodId: { keyPath: 'paymentMethodId' },
      },
    },
    OrderDiscount: {
      keyPath: 'id',
      indexes: {
        orderId: { keyPath: 'orderId' },
      },
    },

    // Returns & Exchanges
    ReturnOrder: {
      keyPath: 'id',
      indexes: {
        returnNumber: { keyPath: 'returnNumber', unique: true },
        originalOrderId: { keyPath: 'originalOrderId' },
        customerId: { keyPath: 'customerId' },
      },
    },
    ReturnLineItem: {
      keyPath: 'id',
      indexes: {
        returnOrderId: { keyPath: 'returnOrderId' },
        productVariantId: { keyPath: 'productVariantId' },
      },
    },
    ExchangeOrder: {
      keyPath: 'id',
      indexes: {
        returnOrderId: { keyPath: 'returnOrderId' },
        newOrderId: { keyPath: 'newOrderId' },
      },
    },

    // Inventory Operations
    StockAdjustment: {
      keyPath: 'id',
      indexes: {
        adjustmentNumber: { keyPath: 'adjustmentNumber', unique: true },
        locationId: { keyPath: 'locationId' },
      },
    },
    StockAdjustmentLine: {
      keyPath: 'id',
      indexes: {
        stockAdjustmentId: { keyPath: 'stockAdjustmentId' },
        productVariantId: { keyPath: 'productVariantId' },
      },
    },
    StockTransfer: {
      keyPath: 'id',
      indexes: {
        transferNumber: { keyPath: 'transferNumber', unique: true },
        fromLocationId: { keyPath: 'fromLocationId' },
        toLocationId: { keyPath: 'toLocationId' },
      },
    },
    StockTransferLine: {
      keyPath: 'id',
      indexes: {
        stockTransferId: { keyPath: 'stockTransferId' },
        productVariantId: { keyPath: 'productVariantId' },
      },
    },

    // Cash Management
    CashRegister: {
      keyPath: 'id',
      indexes: {
        registerNumber: { keyPath: 'registerNumber', unique: true },
        locationId: { keyPath: 'locationId' },
      },
    },
    Shift: {
      keyPath: 'id',
      indexes: {
        shiftNumber: { keyPath: 'shiftNumber', unique: true },
        cashRegisterId: { keyPath: 'cashRegisterId' },
        userId: { keyPath: 'userId' },
        status: { keyPath: 'status' },
      },
    },
    ShiftTransaction: {
      keyPath: 'id',
      indexes: {
        shiftId: { keyPath: 'shiftId' },
      },
    },
    CashMovement: {
      keyPath: 'id',
      indexes: {
        referenceNumber: { keyPath: 'referenceNumber', unique: true },
        shiftId: { keyPath: 'shiftId' },
      },
    },

    // Financial Management
    ExpenseAccount: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        name: { keyPath: 'name' },
      },
    },
    Expense: {
      keyPath: 'id',
      indexes: {
        expenseNumber: { keyPath: 'expenseNumber', unique: true },
        expenseAccountId: { keyPath: 'expenseAccountId' },
        locationId: { keyPath: 'locationId' },
      },
    },
    BankAccount: {
      keyPath: 'id',
      indexes: {
        accountNumber: { keyPath: 'accountNumber', unique: true },
        locationId: { keyPath: 'locationId' },
      },
    },
    BankDeposit: {
      keyPath: 'id',
      indexes: {
        depositNumber: { keyPath: 'depositNumber', unique: true },
        bankAccountId: { keyPath: 'bankAccountId' },
        shiftId: { keyPath: 'shiftId' },
      },
    },
    CashAccount: {
      keyPath: 'id',
      indexes: {
        accountNumber: { keyPath: 'accountNumber', unique: true },
        locationId: { keyPath: 'locationId' },
      },
    },

    // Gift Cards & Store Credit
    GiftCard: {
      keyPath: 'id',
      indexes: {
        cardNumber: { keyPath: 'cardNumber', unique: true },
        customerId: { keyPath: 'customerId' },
      },
    },
    StoreCredit: {
      keyPath: 'id',
      indexes: {
        customerId: { keyPath: 'customerId' },
      },
    },

    // Promotions & Marketing
    Promotion: {
      keyPath: 'id',
      indexes: {
        code: { keyPath: 'code', unique: true },
        isActive: { keyPath: 'isActive' },
      },
    },

    // Parked Orders
    ParkedOrder: {
      keyPath: 'id',
      indexes: {
        parkedOrderNumber: { keyPath: 'parkedOrderNumber', unique: true },
        userId: { keyPath: 'userId' },
      },
    },

    // System & Audit
    AuditLog: {
      keyPath: 'id',
      indexes: {
        userId: { keyPath: 'userId' },
        action: { keyPath: 'action' },
        tableName: { keyPath: 'tableName' },
        createdAt: { keyPath: 'createdAt' },
      },
    },
    SystemSetting: {
      keyPath: 'id',
      indexes: {
        key: { keyPath: 'key', unique: true },
      },
    },
  },
};
