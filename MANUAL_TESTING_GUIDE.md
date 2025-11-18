# Manual Testing Guide - Sales Orders & Payments

Complete step-by-step manual testing guide for sales orders, payments, and parked orders functionality.

---

## 📋 Table of Contents

1. [Test Prerequisites](#test-prerequisites)
2. [Test Flow 1: Complete Order - Single Payment (Cash)](#test-flow-1-complete-order---single-payment-cash)
3. [Test Flow 2: Complete Order - Split Payment (Cash + Card)](#test-flow-2-complete-order---split-payment-cash--card)
4. [Test Flow 3: Complete Order - Multiple Payment Methods](#test-flow-3-complete-order---multiple-payment-methods)
5. [Test Flow 4: Park Order Without Payment](#test-flow-4-park-order-without-payment)
6. [Test Flow 5: Park Order With Partial Payment](#test-flow-5-park-order-with-partial-payment)
7. [Test Flow 6: Load and Complete Parked Order](#test-flow-6-load-and-complete-parked-order)
8. [Test Flow 7: Search Parked Orders](#test-flow-7-search-parked-orders)
9. [Test Flow 8: Delete Parked Order](#test-flow-8-delete-parked-order)
10. [Test Flow 9: Payment Validation Tests](#test-flow-9-payment-validation-tests)
11. [Test Flow 10: Offline Mode Testing](#test-flow-10-offline-mode-testing)
12. [Database Verification Queries](#database-verification-queries)

---

## Test Prerequisites

### Required Setup

1. **Database Setup** (Desktop App)
   ```bash
   # Ensure payment methods are seeded
   cd apps/desktop
   sqlite3 libsdb/cpos.db < libsdb/seed-payment-methods.sql
   ```

2. **Verify Payment Methods**
   ```bash
   # Check payment methods exist
   sqlite3 libsdb/cpos.db "SELECT * FROM PaymentMethod;"
   ```

   Expected output (at least these):
   - Cash (ID: 1, Code: CASH)
   - Card (ID: 2, Code: CARD)
   - Bank Transfer (ID: 3, Code: BANK_TRANSFER)
   - Check (ID: 4, Code: CHECK)
   - Gift Card (ID: 5, Code: GIFT_CARD)
   - Store Credit (ID: 6, Code: STORE_CREDIT)
   - On Account (ID: 7, Code: ON_ACCOUNT)

3. **Test Data Required**
   - At least 5 products with variants
   - At least 2 customers
   - At least 1 sales person
   - At least 1 active location
   - At least 1 cashier user

4. **Test User Login**
   - Login as a cashier/admin user
   - Navigate to Sales/Transaction page

---

## Test Flow 1: Complete Order - Single Payment (Cash)

### Objective
Test creating a complete order with a single cash payment.

### Test Steps

#### Step 1: Start New Transaction
1. ✓ Navigate to Sales/Transaction page
2. ✓ Verify form is empty and ready
3. ✓ Note the current date/time for verification later

#### Step 2: Select Customer (Optional)
1. ✓ Click on customer dropdown/selector
2. ✓ Select "John Doe" (or any test customer)
3. ✓ Verify customer name displays correctly

**Expected Result:**
- Customer name shows in the customer selector
- Customer ID is captured in the form

#### Step 3: Add Products to Cart
1. ✓ Click "Add Product to Order" button
2. ✓ Select Product: "Laptop - Dell Inspiron 15"
3. ✓ Quantity: 1
4. ✓ Unit Price: $599.99
5. ✓ Click Add/Confirm

**Product 2:**
1. ✓ Click "Add Product to Order" button
2. ✓ Select Product: "Mouse - Logitech Wireless"
3. ✓ Quantity: 2
4. ✓ Unit Price: $29.99 each
5. ✓ Click Add/Confirm

**Expected Result:**
- Order Items section shows 2 line items
- Item 1: Laptop - Dell Inspiron 15, Qty: 1, Subtotal: $599.99
- Item 2: Mouse - Logitech Wireless, Qty: 2, Subtotal: $59.98
- Cart Subtotal: $659.97

#### Step 4: Verify Order Summary
Check the right panel "Order Summary":
```
Subtotal:           $659.97
Discounts:          $0.00
Tax (10%):          $65.997 → $66.00
─────────────────────────────
Total:              $725.97
```

**Expected Result:**
- All calculations are correct
- Total amount displayed prominently

#### Step 5: Add Payment (Cash)
1. ✓ Scroll to "Payment Collection" section
2. ✓ Verify "Amount Due" shows $725.97
3. ✓ Verify "Amount Paid" shows $0.00

**Add Cash Payment:**
1. ✓ Click "Cash" quick pay button (should auto-fill amount due)
   OR
2. ✓ Select Payment Method: "Cash"
3. ✓ Enter Amount: $730.00 (overpayment to test change)
4. ✓ Click "Add Payment" button

**Expected Result:**
- Payment appears in payments list
- Amount Paid: $730.00
- Amount Due: $0.00
- Change: $4.03

#### Step 6: Add Order Notes (Optional)
1. ✓ Scroll to "Order Notes" textarea
2. ✓ Enter: "Customer requested gift wrapping"
3. ✓ Verify text is saved

#### Step 7: Complete the Order
1. ✓ Click "Create Order" button (should show total: $725.97)
2. ✓ Wait for confirmation message
3. ✓ Note the order number (e.g., ORD-1737148800-001)

**Expected Result:**
- Success message: "Order created successfully"
- Order number displayed
- Form resets to empty state
- Receipt can be printed/emailed (if implemented)

#### Step 8: Verify in Database
```bash
# Check the order was created
sqlite3 libsdb/cpos.db "
SELECT
  orderNumber,
  status,
  subtotal,
  taxAmount,
  totalAmount,
  amountPaid,
  changeAmount,
  amountDue
FROM SaleOrder
WHERE orderNumber = 'ORD-1737148800-001';
"
```

**Expected Database Values:**
```
orderNumber:  ORD-1737148800-001
status:       Completed
subtotal:     659.97
taxAmount:    65.997 (or 66.00)
totalAmount:  725.97
amountPaid:   730.00
changeAmount: 4.03
amountDue:    0.00
```

#### Step 9: Verify Line Items
```bash
sqlite3 libsdb/cpos.db "
SELECT
  oli.quantity,
  oli.unitPrice,
  oli.lineTotal,
  pv.variantName,
  p.name as productName
FROM OrderLineItem oli
JOIN ProductVariant pv ON oli.variantId = pv.id
JOIN Product p ON pv.productId = p.id
WHERE oli.orderId = (
  SELECT id FROM SaleOrder WHERE orderNumber = 'ORD-1737148800-001'
);
"
```

**Expected Result:**
- 2 line items returned
- Line 1: Laptop, Qty: 1, Price: 599.99, Total: 599.99
- Line 2: Mouse, Qty: 2, Price: 29.99, Total: 59.98

#### Step 10: Verify Payment
```bash
sqlite3 libsdb/cpos.db "
SELECT
  op.amount,
  op.status,
  pm.name as paymentMethod
FROM OrderPayment op
JOIN PaymentMethod pm ON op.paymentMethodId = pm.id
WHERE op.orderId = (
  SELECT id FROM SaleOrder WHERE orderNumber = 'ORD-1737148800-001'
);
"
```

**Expected Result:**
```
amount:         730.00
status:         Completed
paymentMethod:  Cash
```

### ✅ Test Result: PASS / FAIL

---

## Test Flow 2: Complete Order - Split Payment (Cash + Card)

### Objective
Test creating an order with split payment (two payment methods).

### Test Steps

#### Step 1-3: Setup Order (Same as Test Flow 1)
1. ✓ Start new transaction
2. ✓ Select customer: "Jane Smith"
3. ✓ Add products:
   - Product: "Monitor - Samsung 27 inch", Qty: 1, Price: $299.99
   - Product: "Keyboard - Mechanical RGB", Qty: 1, Price: $89.99

**Cart Summary:**
```
Subtotal: $389.98
Tax (10%): $38.998 → $39.00
Total: $428.98
```

#### Step 4: Add First Payment (Cash)
1. ✓ Go to Payment Collection section
2. ✓ Select Payment Method: "Cash"
3. ✓ Enter Amount: $200.00
4. ✓ Click "Add Payment"

**Expected Result:**
- Payment 1 listed: Cash $200.00
- Amount Paid: $200.00
- Amount Due: $228.98

#### Step 5: Add Second Payment (Card)
1. ✓ Select Payment Method: "Credit/Debit Card"
2. ✓ Enter Amount: $228.98
3. ✓ Enter Card Last 4: 4321
4. ✓ Enter Card Brand: Visa
5. ✓ Enter Authorization Code: AUTH789XYZ
6. ✓ Click "Add Payment"

**Expected Result:**
- Payment 2 listed: Card $228.98 (Visa ****4321)
- Total payments listed: 2
- Amount Paid: $428.98
- Amount Due: $0.00
- Change: $0.00

#### Step 6: Review Payments
**Payments Summary should show:**
```
Payment 1: Cash                    $200.00
Payment 2: Card (Visa ****4321)    $228.98
─────────────────────────────────────────
Total Paid:                        $428.98
Change:                              $0.00
```

#### Step 7: Complete Order
1. ✓ Click "Create Order" button
2. ✓ Note order number
3. ✓ Verify success message

#### Step 8: Verify Payments in Database
```bash
sqlite3 libsdb/cpos.db "
SELECT
  op.amount,
  op.cardLast4,
  op.cardBrand,
  op.authorizationCode,
  op.status,
  pm.name as paymentMethod
FROM OrderPayment op
JOIN PaymentMethod pm ON op.paymentMethodId = pm.id
WHERE op.orderId = (
  SELECT id FROM SaleOrder WHERE orderNumber = 'ORD-XXXXX'
)
ORDER BY op.createdAt;
"
```

**Expected Result:**
```
Payment 1:
  amount: 200.00
  paymentMethod: Cash
  cardLast4: NULL
  status: Completed

Payment 2:
  amount: 228.98
  paymentMethod: Credit/Debit Card
  cardLast4: 4321
  cardBrand: Visa
  authorizationCode: AUTH789XYZ
  status: Completed
```

### ✅ Test Result: PASS / FAIL

---

## Test Flow 3: Complete Order - Multiple Payment Methods

### Objective
Test order with 3+ different payment methods.

### Test Steps

#### Step 1: Create Order
**Products:**
- "Gaming Console - PlayStation 5", Qty: 1, Price: $499.99
- "Controller - DualSense", Qty: 2, Price: $69.99 each

**Cart:**
```
Subtotal: $639.97
Tax (10%): $64.00
Total: $703.97
```

#### Step 2: Add Multiple Payments

**Payment 1 - Cash:**
- Method: Cash
- Amount: $300.00

**Payment 2 - Gift Card:**
- Method: Gift Card
- Amount: $100.00
- (Optional: Gift Card Number)

**Payment 3 - Card:**
- Method: Credit/Debit Card
- Amount: $303.97
- Card Last 4: 9876
- Card Brand: Mastercard
- Auth Code: MC123AUTH

**Payment Summary:**
```
Cash:                 $300.00
Gift Card:            $100.00
Card (MC ****9876):   $303.97
─────────────────────────────
Total Paid:           $703.97
Amount Due:             $0.00
```

#### Step 3: Complete and Verify
1. ✓ Complete order
2. ✓ Verify 3 payment records in database
3. ✓ Verify all payment details saved correctly

### ✅ Test Result: PASS / FAIL

---

## Test Flow 4: Park Order Without Payment

### Objective
Park an incomplete order without any payments.

### Test Steps

#### Step 1: Start New Transaction
1. ✓ Navigate to Sales page
2. ✓ Select customer: "Mike Johnson"

#### Step 2: Add Products
**Products:**
- "Tablet - iPad Air", Qty: 1, Price: $599.00
- "Tablet Case", Qty: 1, Price: $39.99

**Cart:**
```
Subtotal: $638.99
Tax (10%): $63.90
Total: $702.89
```

#### Step 3: Add Optional Discount
1. ✓ Open "Order Discount" panel
2. ✓ Select "Percentage"
3. ✓ Enter: 10%
4. ✓ Apply discount

**Updated Cart:**
```
Subtotal: $638.99
Order Discount (10%): -$63.90
Subtotal after discount: $575.09
Tax (10%): $57.51
Total: $632.60
```

#### Step 4: Add Notes
1. ✓ Enter notes: "Customer needs to check with spouse, will return in 1 hour"

#### Step 5: Park the Order
1. ✓ DO NOT add any payments
2. ✓ Click "Park Order" button
3. ✓ Verify confirmation message

**Expected Result:**
- Success message: "Order parked successfully! Park #: PARK-XXXXX"
- Form resets to empty
- Park number displayed (note it down: ____________)

#### Step 6: Verify in Database

**Check SaleOrder:**
```bash
sqlite3 libsdb/cpos.db "
SELECT
  orderNumber,
  status,
  subtotal,
  discountAmount,
  totalAmount,
  amountPaid,
  notes
FROM SaleOrder
WHERE status = 'Parked'
ORDER BY createdAt DESC
LIMIT 1;
"
```

**Expected Result:**
```
status: Parked
subtotal: 638.99
discountAmount: 63.90
totalAmount: 632.60
amountPaid: 0.00
notes: "Customer needs to check..."
```

**Check ParkedOrder:**
```bash
sqlite3 libsdb/cpos.db "
SELECT
  po.parkNumber,
  po.parkedAt,
  po.notes,
  c.firstName || ' ' || c.lastName as customerName,
  so.orderNumber
FROM ParkedOrder po
JOIN SaleOrder so ON po.orderId = so.id
LEFT JOIN Customer c ON po.customerId = c.id
ORDER BY po.parkedAt DESC
LIMIT 1;
"
```

**Expected Result:**
- parkNumber: PARK-XXXXX
- customerName: Mike Johnson
- orderNumber: ORD-XXXXX
- parkedAt: (current timestamp)

#### Step 7: Verify Line Items Preserved
```bash
sqlite3 libsdb/cpos.db "
SELECT COUNT(*) as itemCount
FROM OrderLineItem
WHERE orderId = (
  SELECT orderId FROM ParkedOrder
  WHERE parkNumber = 'PARK-XXXXX'
);
"
```

**Expected Result:**
- itemCount: 2

### ✅ Test Result: PASS / FAIL

---

## Test Flow 5: Park Order With Partial Payment

### Objective
Park an order that has partial payment already collected.

### Test Steps

#### Step 1: Create Order
**Customer:** Sarah Williams
**Products:**
- "Laptop - MacBook Pro", Qty: 1, Price: $1,999.00

**Cart:**
```
Subtotal: $1,999.00
Tax (10%): $199.90
Total: $2,198.90
```

#### Step 2: Add Partial Payment
**Customer says:** "I'll pay $1,000 now and the rest later"

1. ✓ Select Payment Method: Cash
2. ✓ Enter Amount: $1,000.00
3. ✓ Click "Add Payment"

**Payment Status:**
```
Amount Paid: $1,000.00
Amount Due: $1,198.90
```

#### Step 3: Add Notes
1. ✓ Notes: "Customer will pay remaining $1,198.90 tomorrow"

#### Step 4: Park Order
1. ✓ Click "Park Order" button
2. ✓ Note park number: ____________

#### Step 5: Verify Payment Saved
```bash
sqlite3 libsdb/cpos.db "
SELECT
  op.amount,
  pm.name as paymentMethod,
  so.status,
  so.amountPaid,
  so.amountDue
FROM OrderPayment op
JOIN PaymentMethod pm ON op.paymentMethodId = pm.id
JOIN SaleOrder so ON op.orderId = so.id
WHERE so.status = 'Parked'
AND so.orderNumber = 'ORD-XXXXX';
"
```

**Expected Result:**
```
amount: 1000.00
paymentMethod: Cash
status: Parked
amountPaid: 1000.00
amountDue: 1198.90
```

### ✅ Test Result: PASS / FAIL

---

## Test Flow 6: Load and Complete Parked Order

### Objective
Load a previously parked order and complete it with final payment.

### Prerequisites
- At least one parked order exists (from Test Flow 4 or 5)

### Test Steps

#### Step 1: Open Load Parked Orders
1. ✓ Navigate to Sales page
2. ✓ Ensure form is empty
3. ✓ Click "Load Parked" button

**Expected Result:**
- Modal dialog opens
- Title: "Load Parked Order"
- Search input visible
- List of parked orders displayed

#### Step 2: Verify Parked Orders List
**Check display shows:**
- Order number
- Customer name (or "Walk-in Customer")
- Park number
- Total amount
- Parked date/time
- Delete button (if enabled)

**Example Display:**
```
┌─────────────────────────────────────────────────┐
│ ORD-1737148800-005              [Parked]        │
│ Customer: Mike Johnson                          │
│ Park #: PARK-1737148800-002                     │
│ Parked: 1/18/2025, 10:30 AM                     │
│ Notes: Customer needs to check with spouse...   │
│                                    $632.60      │
└─────────────────────────────────────────────────┘
```

#### Step 3: Search by Customer Name
1. ✓ Click in search input
2. ✓ Type: "Mike"
3. ✓ Observe real-time filtering

**Expected Result:**
- Only orders for "Mike Johnson" shown
- Other orders filtered out
- Search is case-insensitive

#### Step 4: Search by Order Number
1. ✓ Clear search input
2. ✓ Type: "ORD-1737148800-005"
3. ✓ Observe filtering

**Expected Result:**
- Only that specific order shown

#### Step 5: Select and Load Order
1. ✓ Clear search to see all orders
2. ✓ Click on the parked order for "Mike Johnson"
3. ✓ Verify order is highlighted/selected
4. ✓ Click "Load Order" button

**Expected Result:**
- Modal closes
- Form populates with order data

#### Step 6: Verify Form Population

**Check Customer:**
- ✓ Customer selector shows: "Mike Johnson"

**Check Line Items:**
```
Item 1: Tablet - iPad Air
  Quantity: 1
  Unit Price: $599.00
  Line Total: $599.00

Item 2: Tablet Case
  Quantity: 1
  Unit Price: $39.99
  Line Total: $39.99
```

**Check Discounts:**
- ✓ Order Discount: 10% applied

**Check Order Summary:**
```
Subtotal:           $638.99
Order Discount:     -$63.90
Tax (10%):          $57.51
─────────────────────────────
Total:              $632.60
```

**Check Notes:**
- ✓ Notes field contains: "Customer needs to check with spouse..."

**Check Payments:**
- ✓ No payments yet (or partial payment if test flow 5)

#### Step 7: Modify Order (Optional Test)
1. ✓ Change quantity of "Tablet Case" from 1 to 2
2. ✓ Verify totals update correctly

**New totals:**
```
Subtotal:           $678.98
Order Discount:     -$67.90
Tax (10%):          $61.11
Total:              $672.19
```

#### Step 8: Add Final Payment
**Scenario: Customer pays full amount**

1. ✓ Select Payment Method: Card
2. ✓ Enter Amount: $672.19 (or $632.60 if no modifications)
3. ✓ Card Last 4: 5555
4. ✓ Card Brand: Visa
5. ✓ Auth Code: AUTH555
6. ✓ Click "Add Payment"

**Payment Status:**
```
Amount Paid: $672.19
Amount Due: $0.00
Change: $0.00
```

#### Step 9: Complete the Order
1. ✓ Click "Create Order" button
2. ✓ Wait for confirmation
3. ✓ Note order number

**Expected Result:**
- Success message shown
- Form resets
- Order status changed to "Completed"

#### Step 10: Verify Parked Order Removed
1. ✓ Click "Load Parked" again
2. ✓ Search for "Mike Johnson"

**Expected Result:**
- The completed order no longer appears in parked orders list
- Only other parked orders shown

#### Step 11: Verify in Database

**Check order status:**
```bash
sqlite3 libsdb/cpos.db "
SELECT
  orderNumber,
  status,
  totalAmount,
  amountPaid,
  completedAt
FROM SaleOrder
WHERE orderNumber = 'ORD-1737148800-005';
"
```

**Expected Result:**
```
status: Completed
totalAmount: 672.19 (or 632.60)
amountPaid: 672.19 (or 632.60)
completedAt: (current timestamp, not NULL)
```

**Check ParkedOrder removed:**
```bash
sqlite3 libsdb/cpos.db "
SELECT COUNT(*)
FROM ParkedOrder
WHERE parkNumber = 'PARK-1737148800-002';
"
```

**Expected Result:**
- COUNT: 0 (parked order record deleted)

### ✅ Test Result: PASS / FAIL

---

## Test Flow 7: Search Parked Orders

### Objective
Test search functionality with multiple parked orders.

### Prerequisites
Create 5+ parked orders with different customers:
1. "Alice Brown" - $150
2. "Bob Smith" - $500
3. "Charlie Davis" - $75
4. "Alice Johnson" - $200
5. "David Wilson" - $350

### Test Steps

#### Step 1: Open Parked Orders
1. ✓ Click "Load Parked" button
2. ✓ Verify all 5+ orders shown

#### Step 2: Search by Partial Name
1. ✓ Type: "Alice"

**Expected Result:**
- Shows orders for "Alice Brown" and "Alice Johnson"
- 2 orders displayed
- Others hidden

#### Step 3: Search by Full Name
1. ✓ Clear search
2. ✓ Type: "Bob Smith"

**Expected Result:**
- Only "Bob Smith" order shown
- 1 order displayed

#### Step 4: Search by Order Number
1. ✓ Clear search
2. ✓ Type order number: "ORD-1737148800-010"

**Expected Result:**
- Only that specific order shown

#### Step 5: Test Case Insensitivity
1. ✓ Clear search
2. ✓ Type: "ALICE" (all caps)

**Expected Result:**
- Still shows Alice Brown and Alice Johnson
- Search is case-insensitive

#### Step 6: Test No Results
1. ✓ Clear search
2. ✓ Type: "XYZ123NotExists"

**Expected Result:**
- No orders shown
- Message: "No parked orders found matching your search"
- Empty state icon displayed

#### Step 7: Clear Search
1. ✓ Clear search input

**Expected Result:**
- All parked orders shown again

### ✅ Test Result: PASS / FAIL

---

## Test Flow 8: Delete Parked Order

### Objective
Test deleting a parked order.

### Test Steps

#### Step 1: Create Order to Delete
1. ✓ Create new order
2. ✓ Add products: "Test Product", $50
3. ✓ Park order
4. ✓ Note park number: ____________

#### Step 2: Open Parked Orders
1. ✓ Click "Load Parked"
2. ✓ Find the test order

#### Step 3: Delete Order
1. ✓ Click "Delete" button on the parked order
2. ✓ Confirmation dialog appears

**Expected Confirmation:**
```
"Are you sure you want to delete this parked order?"
[Cancel] [OK]
```

#### Step 4: Cancel Delete
1. ✓ Click "Cancel"

**Expected Result:**
- Dialog closes
- Order still in list
- No changes made

#### Step 5: Delete Order (Confirm)
1. ✓ Click "Delete" button again
2. ✓ Click "OK" to confirm

**Expected Result:**
- Success message: "Parked order deleted successfully"
- Order removed from list immediately
- List refreshes

#### Step 6: Verify in Database

**Check ParkedOrder:**
```bash
sqlite3 libsdb/cpos.db "
SELECT COUNT(*)
FROM ParkedOrder
WHERE parkNumber = 'PARK-XXXXX';
"
```

**Expected Result:**
- COUNT: 0

**Check SaleOrder status:**
```bash
sqlite3 libsdb/cpos.db "
SELECT status
FROM SaleOrder
WHERE orderNumber = 'ORD-XXXXX';
"
```

**Expected Result:**
- status: Voided

### ✅ Test Result: PASS / FAIL

---

## Test Flow 9: Payment Validation Tests

### Objective
Test payment validation rules and error handling.

### Test 9.1: Submit Without Payment

#### Steps:
1. ✓ Create order with products
2. ✓ DO NOT add any payment
3. ✓ Click "Create Order"

**Expected Result:**
- ❌ Error message: "Please add at least one payment"
- Order NOT created
- Form remains with data

### Test 9.2: Insufficient Payment

#### Steps:
1. ✓ Create order total: $500
2. ✓ Add payment: Cash $300
3. ✓ Click "Create Order"

**Expected Result:**
- ❌ Error message: "Payment incomplete. Amount due: $200.00"
- Order NOT created
- Can add more payments

### Test 9.3: Exact Payment

#### Steps:
1. ✓ Create order total: $500
2. ✓ Add payment: Cash $500
3. ✓ Click "Create Order"

**Expected Result:**
- ✅ Success
- Order created
- Change: $0.00

### Test 9.4: Overpayment (Change Calculation)

#### Steps:
1. ✓ Create order total: $127.50
2. ✓ Add payment: Cash $150.00
3. ✓ Verify "Change" shows: $22.50
4. ✓ Click "Create Order"

**Expected Result:**
- ✅ Success
- Order created
- changeAmount in DB: 22.50

### Test 9.5: Remove Payment

#### Steps:
1. ✓ Add payment: Cash $100
2. ✓ Add payment: Card $200
3. ✓ Verify 2 payments listed
4. ✓ Click "Remove" on Cash payment
5. ✓ Verify only Card payment remains

**Expected Result:**
- Cash payment removed from list
- Only Card $200 shown
- Amount Paid updates to $200

### Test 9.6: Multiple Quick Pays

#### Steps:
1. ✓ Order total: $200
2. ✓ Click "Cash" quick pay button
3. ✓ Verify cash payment for $200 added
4. ✓ Click "Card" quick pay button

**Expected Result:**
- First quick pay: Adds $200 cash (full amount due)
- Second quick pay: Should add $0 or not allow (amount due is $0)

### ✅ Test Results:
- 9.1: PASS / FAIL
- 9.2: PASS / FAIL
- 9.3: PASS / FAIL
- 9.4: PASS / FAIL
- 9.5: PASS / FAIL
- 9.6: PASS / FAIL

---

## Test Flow 10: Offline Mode Testing

### Objective
Test order creation and parked orders in offline mode.

### Prerequisites (Desktop App Only)

#### Step 1: Go Offline
**For Desktop App:**
1. ✓ Disconnect from internet
   OR
2. ✓ Stop the backend server

#### Step 2: Create Order Offline
1. ✓ Create order with products
2. ✓ Add payment
3. ✓ Click "Create Order"

**Expected Result:**
- ✅ Order created successfully
- Saved to local SQLite database
- Message may indicate "Saved offline"

#### Step 3: Verify Local Storage
```bash
sqlite3 libsdb/cpos.db "
SELECT orderNumber, status, totalAmount
FROM SaleOrder
ORDER BY createdAt DESC
LIMIT 1;
"
```

**Expected Result:**
- Order found in local database

#### Step 4: Park Order Offline
1. ✓ Create new order
2. ✓ Click "Park Order"

**Expected Result:**
- ✅ Order parked successfully
- Saved to local database

#### Step 5: Load Parked Order Offline
1. ✓ Click "Load Parked"
2. ✓ Select parked order
3. ✓ Click "Load Order"

**Expected Result:**
- ✅ Order loaded from local database
- Form populated correctly

#### Step 6: Complete Parked Order Offline
1. ✓ Add payments
2. ✓ Complete order

**Expected Result:**
- ✅ Order completed
- ParkedOrder removed from local database

#### Step 7: Go Back Online
1. ✓ Reconnect to internet
2. ✓ Start backend server

#### Step 8: Verify Sync (If Implemented)
**Check if offline orders sync to server**
- Orders created offline should sync to server
- Completed parked orders should sync

### ✅ Test Result: PASS / FAIL

---

## Database Verification Queries

### Query 1: All Parked Orders
```sql
SELECT
  po.parkNumber,
  po.parkedAt,
  c.firstName || ' ' || c.lastName as customerName,
  so.orderNumber,
  so.totalAmount,
  u.firstName || ' ' || u.lastName as parkedBy
FROM ParkedOrder po
JOIN SaleOrder so ON po.orderId = so.id
LEFT JOIN Customer c ON po.customerId = c.id
LEFT JOIN User u ON po.parkedBy = u.id
ORDER BY po.parkedAt DESC;
```

### Query 2: Order with All Details
```sql
-- Replace ORDER_ID with actual order ID
SELECT
  'ORDER INFO' as section,
  so.orderNumber,
  so.status,
  so.orderDate,
  so.subtotal,
  so.taxAmount,
  so.totalAmount,
  so.amountPaid,
  so.changeAmount
FROM SaleOrder so
WHERE so.id = 'ORDER_ID'

UNION ALL

SELECT
  'LINE ITEMS',
  p.name || ' - ' || pv.variantName,
  oli.quantity,
  oli.unitPrice,
  oli.lineDiscount,
  oli.lineTotal,
  NULL,
  NULL,
  NULL
FROM OrderLineItem oli
JOIN ProductVariant pv ON oli.variantId = pv.id
JOIN Product p ON pv.productId = p.id
WHERE oli.orderId = 'ORDER_ID'

UNION ALL

SELECT
  'PAYMENTS',
  pm.name,
  op.amount,
  op.cardLast4,
  op.cardBrand,
  op.status,
  NULL,
  NULL,
  NULL
FROM OrderPayment op
JOIN PaymentMethod pm ON op.paymentMethodId = pm.id
WHERE op.orderId = 'ORDER_ID';
```

### Query 3: Today's Completed Orders
```sql
SELECT
  orderNumber,
  totalAmount,
  amountPaid,
  completedAt,
  (SELECT COUNT(*) FROM OrderPayment WHERE orderId = so.id) as paymentCount
FROM SaleOrder so
WHERE status = 'Completed'
  AND DATE(completedAt) = DATE('now')
ORDER BY completedAt DESC;
```

### Query 4: Payment Method Breakdown
```sql
SELECT
  pm.name as paymentMethod,
  COUNT(op.id) as transactionCount,
  SUM(op.amount) as totalAmount
FROM OrderPayment op
JOIN PaymentMethod pm ON op.paymentMethodId = pm.id
JOIN SaleOrder so ON op.orderId = so.id
WHERE so.status = 'Completed'
  AND DATE(so.completedAt) = DATE('now')
GROUP BY pm.name
ORDER BY totalAmount DESC;
```

### Query 5: Parked Orders Summary
```sql
SELECT
  DATE(parkedAt) as parkDate,
  COUNT(*) as parkedCount,
  SUM(so.totalAmount) as totalValue
FROM ParkedOrder po
JOIN SaleOrder so ON po.orderId = so.id
GROUP BY DATE(parkedAt)
ORDER BY parkDate DESC;
```

---

## Test Execution Checklist

### Preparation
- [ ] Database seeded with payment methods
- [ ] Test products created (at least 5)
- [ ] Test customers created (at least 5)
- [ ] Test users/cashiers created
- [ ] Location configured
- [ ] Application running (web or desktop)

### Complete Orders
- [ ] Test Flow 1: Single payment (Cash) - PASS/FAIL
- [ ] Test Flow 2: Split payment (Cash + Card) - PASS/FAIL
- [ ] Test Flow 3: Multiple payments (3+) - PASS/FAIL

### Parked Orders
- [ ] Test Flow 4: Park without payment - PASS/FAIL
- [ ] Test Flow 5: Park with partial payment - PASS/FAIL
- [ ] Test Flow 6: Load and complete - PASS/FAIL
- [ ] Test Flow 7: Search functionality - PASS/FAIL
- [ ] Test Flow 8: Delete parked order - PASS/FAIL

### Validation & Edge Cases
- [ ] Test Flow 9.1: No payment error - PASS/FAIL
- [ ] Test Flow 9.2: Insufficient payment - PASS/FAIL
- [ ] Test Flow 9.3: Exact payment - PASS/FAIL
- [ ] Test Flow 9.4: Overpayment/change - PASS/FAIL
- [ ] Test Flow 9.5: Remove payment - PASS/FAIL
- [ ] Test Flow 9.6: Quick pay buttons - PASS/FAIL

### Offline Mode
- [ ] Test Flow 10: Offline operations - PASS/FAIL (Desktop only)

### Database Verification
- [ ] All queries executed successfully
- [ ] Data integrity confirmed
- [ ] No orphaned records

---

## Test Notes / Issues Found

### Issue Log

**Issue #1:**
- Date: ___________
- Test Flow: ___________
- Description: ___________
- Severity: High / Medium / Low
- Status: Open / Fixed / Won't Fix

**Issue #2:**
- Date: ___________
- Test Flow: ___________
- Description: ___________
- Severity: High / Medium / Low
- Status: Open / Fixed / Won't Fix

---

## Sign-Off

**Tested By:** _____________________
**Date:** _____________________
**Application Version:** _____________________
**Overall Test Result:** PASS / FAIL

**Notes:**
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________

---

**End of Manual Testing Guide**
