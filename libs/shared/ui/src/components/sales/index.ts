/**
 * Sales Components
 * Components for sales order management
 */

// Export CustomerSelector but exclude Customer type to avoid conflict with customer/CustomerCard
export { CustomerSelector } from './CustomerSelector.js';
export type { CustomerSelectorProps } from './CustomerSelector.js';
// Re-export Customer type with a different name to avoid conflict
export type { Customer as SalesCustomer } from './CustomerSelector.js';

// Export LineItemEditor but rename conflicting types
export { LineItemEditor } from './LineItemEditor.js';
export type {
  LineItemEditorProps,
  SalesPerson,
  LineItem as SalesLineItem,
  ProductVariant as SalesProductVariant,
} from './LineItemEditor.js';

export * from './DiscountPanel.js';
export * from './CouponCodeInput.js';
export * from './AdjustmentPanel.js';
export * from './OrderSummary.js';
export * from './PaymentCollection.js';
export * from './ParkedOrderSearch.js';
export * from './SalesOrderForm.js';
