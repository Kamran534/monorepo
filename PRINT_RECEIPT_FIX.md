# Print Receipt Fix - Implementation Complete

## Problem
The print receipt confirmation dialog was not showing when completing an order.

## Root Cause
1. The `onCreateOrder` callback in `SalesOrderForm` was not returning the created order data
2. The `handleCreateOrder` function in `Sales.tsx` was not returning the order result
3. The print receipt integration was not added to `SalesOrderForm`

## Solution

### 1. Updated `SalesOrderForm.tsx`

**Added Print Receipt Integration:**
- Imported `usePrintReceipt` hook and `PrintConfirmationDialog` component
- Added new optional props for print configuration:
  - `enablePrintReceipt` (default: true)
  - `storeName`, `storeNameArabic`, `storeUrl`, `posNumber`
  - `currentCashier`
- Initialized the `usePrintReceipt` hook
- Modified `handleSubmit` to be async and show print dialog after successful order creation
- Added `PrintConfirmationDialog` component to the JSX

**Key Changes:**
```typescript
// New interface for order creation result
export interface CreateSalesOrderResult {
  success: boolean;
  order?: {
    id: string;
    orderNumber?: string;
    invoiceNumber?: string;
  };
  error?: string;
}

// Updated callback signature
onCreateOrder: (data: CreateSalesOrderInput) => Promise<CreateSalesOrderResult | void> | void;

// Print receipt integration in handleSubmit
const result = await onCreateOrder(orderData);

if (enablePrintReceipt && result && result.success && result.order) {
  promptPrintReceipt({
    invoiceNumber: result.order.invoiceNumber || result.order.orderNumber || result.order.id,
    lineItems: lineItems,
    payments: payments,
    customer: selectedCustomer || undefined,
    cashier: currentCashier,
    grossTotal,
    itemDiscount,
    netTotal,
    tendered,
    change,
  });
}
```

### 2. Updated `Sales.tsx`

**Modified `handleCreateOrder` to Return Order Result:**
```typescript
const handleCreateOrder = async (data: CreateSalesOrderInput) => {
  // ... existing code ...

  const result = await salesOrderRepo.createOrder(orderData);

  if (result.success && result.order) {
    show(`Sales order created successfully! Order #: ${result.order.orderNumber}`, 'success');

    // Return the order result for print receipt
    return {
      success: true,
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        invoiceNumber: result.order.invoiceNumber || result.order.orderNumber,
      },
    };
  } else {
    show(result.error || 'Failed to create order', 'error');
    return { success: false, error: result.error || 'Failed to create order' };
  }
};
```

### 3. Updated Exports

**Added `CreateSalesOrderResult` export in `sales/index.ts`:**
```typescript
export type { CreateSalesOrderResult } from './SalesOrderForm.js';
```

## How It Works Now

1. User fills out the sales order form with line items and payments
2. User clicks "Create Order" button
3. `handleSubmit` is called, which validates the order
4. `onCreateOrder` is called and creates the order in the repository
5. `onCreateOrder` returns a `CreateSalesOrderResult` with the order details
6. If `enablePrintReceipt` is true and order creation was successful:
   - Calculate receipt totals (gross total, discounts, net total, change)
   - Call `promptPrintReceipt` with all order details
   - Show `PrintConfirmationDialog` with receipt summary
7. User can then:
   - Click "Print Receipt" to print (Enter key)
   - Click "Don't Print" to skip printing
   - Click "Cancel" or press Esc to close dialog
8. Form is reset after showing the print dialog

## Testing

To test the fix:

1. Go to the Sales page
2. Add a customer (optional)
3. Add line items to the order
4. Add payment(s) until the order is fully paid
5. Click "Create Order"
6. **Expected:** Print confirmation dialog should appear with receipt summary
7. Click "Print Receipt" to test printing

## Configuration

### Disable Print Receipt (Optional)

If you want to disable the print receipt dialog:

```tsx
<SalesOrderForm
  {...otherProps}
  enablePrintReceipt={false}
/>
```

### Customize Store Info

Pass custom store information:

```tsx
<SalesOrderForm
  {...otherProps}
  storeName="YOUR STORE NAME"
  storeNameArabic="اسم متجرك"
  storeUrl="http://www.yourstore.com"
  posNumber="POS-001"
  currentCashier="John Doe"
/>
```

## Files Modified

1. `libs/shared/ui/src/components/sales/SalesOrderForm.tsx`
   - Added print receipt integration
   - Added `CreateSalesOrderResult` interface
   - Modified `handleSubmit` to show print dialog
   - Added `PrintConfirmationDialog` to JSX

2. `libs/shared/ui/src/pages/Sales.tsx`
   - Modified `handleCreateOrder` to return order result
   - Added `CreateSalesOrderResult` import

3. `libs/shared/ui/src/components/sales/index.ts`
   - Added `CreateSalesOrderResult` export

## Verification

The print receipt functionality should now work automatically when:
- ✅ An order is successfully created
- ✅ Payment is complete (amountDue <= 0)
- ✅ `enablePrintReceipt` is true (default)

The dialog will show:
- ✅ Store name and invoice number
- ✅ Total amount, amount paid, and change
- ✅ Print/Don't Print/Cancel buttons
- ✅ Keyboard shortcuts (Enter/Esc)
- ✅ Processing indicator while printing

## Troubleshooting

**Dialog still not showing:**
1. Check browser console for errors
2. Verify `onCreateOrder` is returning the order result
3. Ensure `enablePrintReceipt` is not set to false
4. Check that the order creation is successful

**Print fails:**
1. Check that the printer hook is working
2. Verify Electron IPC is set up (for desktop)
3. Check browser console for print errors

**Receipt format issues:**
1. Verify line items have required fields (sku, productName, etc.)
2. Check that totals are calculated correctly
3. Adjust `ReceiptTemplate.tsx` for custom formatting
