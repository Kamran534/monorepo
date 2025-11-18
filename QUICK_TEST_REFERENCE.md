# Quick Test Reference Card

Quick reference for common sales order and payment testing scenarios.

---

## 🚀 Quick Start Commands

### Setup Payment Methods (Run Once)
```bash
# Desktop App
cd apps/desktop
sqlite3 libsdb/cpos.db < libsdb/seed-payment-methods.sql

# Verify
sqlite3 libsdb/cpos.db "SELECT id, code, name FROM PaymentMethod;"
```

### View Recent Orders
```bash
sqlite3 libsdb/cpos.db "
SELECT orderNumber, status, totalAmount, amountPaid
FROM SaleOrder
ORDER BY createdAt DESC
LIMIT 10;
"
```

### View Parked Orders
```bash
sqlite3 libsdb/cpos.db "
SELECT po.parkNumber, so.orderNumber, so.totalAmount
FROM ParkedOrder po
JOIN SaleOrder so ON po.orderId = so.id;
"
```

---

## 📝 Basic Test Scenarios

### Scenario 1: Simple Cash Order (2 minutes)
```
1. Add Product: Laptop $599.99
2. Add Product: Mouse $29.99
3. Cart Total: ~$692 (with 10% tax)
4. Payment: Cash $700
5. Change: ~$8
6. Click "Create Order"
✅ Done!
```

**Verify:**
```sql
SELECT * FROM SaleOrder WHERE status='Completed' ORDER BY createdAt DESC LIMIT 1;
```

---

### Scenario 2: Split Payment (3 minutes)
```
1. Add Product: Monitor $299.99
2. Cart Total: ~$330 (with tax)
3. Payment 1: Cash $200
4. Payment 2: Card $130
   - Last 4: 1234
   - Brand: Visa
5. Click "Create Order"
✅ Done!
```

**Verify:**
```sql
SELECT COUNT(*) FROM OrderPayment
WHERE orderId = (SELECT id FROM SaleOrder ORDER BY createdAt DESC LIMIT 1);
-- Should return: 2
```

---

### Scenario 3: Park Order (2 minutes)
```
1. Select Customer: "John Doe"
2. Add Product: Tablet $599
3. Add Discount: 10% off
4. Add Note: "Will return tomorrow"
5. Click "Park Order"
✅ Parked!
```

**Get Park Number:**
```sql
SELECT parkNumber, so.orderNumber
FROM ParkedOrder po
JOIN SaleOrder so ON po.orderId = so.id
ORDER BY po.parkedAt DESC LIMIT 1;
```

---

### Scenario 4: Load & Complete Parked (3 minutes)
```
1. Click "Load Parked"
2. Search: "John" or order number
3. Select order
4. Click "Load Order"
5. Verify form populated
6. Add Payment: Card $539.10 (or actual total)
   - Last 4: 5678
   - Brand: Mastercard
7. Click "Create Order"
✅ Completed!
```

**Verify Removed from Parked:**
```sql
SELECT COUNT(*) FROM ParkedOrder;
-- Should be one less than before
```

---

## 💳 Payment Methods Quick Reference

| Method | ID | Code | Requires Auth | Extra Fields |
|--------|----|----- |---------------|--------------|
| Cash | 1 | CASH | No | - |
| Card | 2 | CARD | Yes | last4, brand, authCode |
| Bank Transfer | 3 | BANK_TRANSFER | No | transactionId |
| Check | 4 | CHECK | Yes | checkNumber |
| Gift Card | 5 | GIFT_CARD | No | cardNumber |
| Store Credit | 6 | STORE_CREDIT | No | - |
| On Account | 7 | ON_ACCOUNT | Yes | - |

---

## 🔍 Quick Verification Queries

### Last Order Details
```sql
SELECT
  orderNumber,
  status,
  subtotal,
  taxAmount,
  totalAmount,
  amountPaid,
  changeAmount
FROM SaleOrder
ORDER BY createdAt DESC
LIMIT 1;
```

### Last Order Payments
```sql
SELECT
  pm.name,
  op.amount,
  op.cardLast4,
  op.cardBrand
FROM OrderPayment op
JOIN PaymentMethod pm ON op.paymentMethodId = pm.id
WHERE op.orderId = (SELECT id FROM SaleOrder ORDER BY createdAt DESC LIMIT 1);
```

### All Parked Orders with Customer
```sql
SELECT
  po.parkNumber,
  so.orderNumber,
  COALESCE(c.firstName || ' ' || c.lastName, 'Walk-in') as customer,
  so.totalAmount,
  po.parkedAt
FROM ParkedOrder po
JOIN SaleOrder so ON po.orderId = so.id
LEFT JOIN Customer c ON po.customerId = c.id
ORDER BY po.parkedAt DESC;
```

### Today's Sales Summary
```sql
SELECT
  COUNT(*) as orderCount,
  SUM(totalAmount) as totalSales,
  SUM(amountPaid) as totalPaid
FROM SaleOrder
WHERE status = 'Completed'
  AND DATE(completedAt) = DATE('now');
```

### Payment Method Breakdown (Today)
```sql
SELECT
  pm.name,
  COUNT(op.id) as count,
  SUM(op.amount) as total
FROM OrderPayment op
JOIN PaymentMethod pm ON op.paymentMethodId = pm.id
JOIN SaleOrder so ON op.orderId = so.id
WHERE so.status = 'Completed'
  AND DATE(so.completedAt) = DATE('now')
GROUP BY pm.name;
```

---

## ⚡ Common Issues & Solutions

### Issue: "Please add at least one payment"
**Cause:** No payment added
**Solution:** Add at least one payment before creating order

### Issue: "Payment incomplete. Amount due: $X.XX"
**Cause:** Total payments < Order total
**Solution:** Add more payment(s) to cover remaining amount

### Issue: Parked order not appearing
**Cause:** Wrong status or deleted
**Solution:** Check database:
```sql
SELECT * FROM SaleOrder WHERE status='Parked';
```

### Issue: Can't find order in parked list
**Cause:** Order status not 'Parked' or ParkedOrder record missing
**Solution:** Verify both tables:
```sql
SELECT so.status, po.id as parkedRecordExists
FROM SaleOrder so
LEFT JOIN ParkedOrder po ON so.id = po.orderId
WHERE so.orderNumber = 'ORD-XXXXX';
```

### Issue: Load parked shows no items
**Cause:** OrderLineItems not saved
**Solution:** Check:
```sql
SELECT COUNT(*) FROM OrderLineItem WHERE orderId = 'ORDER_ID';
```

---

## 📊 Test Data Templates

### Small Order (~$100)
```
- Product: Mouse $29.99 x 1
- Product: Keyboard $69.99 x 1
= Subtotal: $99.98
= Tax: $10.00
= Total: $109.98
```

### Medium Order (~$500)
```
- Product: Monitor $299.99 x 1
- Product: Speakers $89.99 x 1
- Product: Webcam $109.99 x 1
= Subtotal: $499.97
= Tax: $50.00
= Total: $549.97
```

### Large Order (~$2000)
```
- Product: Laptop $1,499.00 x 1
- Product: Monitor $399.99 x 1
- Product: Keyboard $89.99 x 1
= Subtotal: $1,988.98
= Tax: $198.90
= Total: $2,187.88
```

---

## 🧪 5-Minute Smoke Test

Run this quick test to verify basic functionality:

### Step 1: Complete Order (1 min)
```
✓ Add 1 product
✓ Pay with cash
✓ Create order
```

### Step 2: Park Order (1 min)
```
✓ Add 1 product
✓ Park order
✓ Note park number
```

### Step 3: Load Parked (1 min)
```
✓ Click "Load Parked"
✓ Find parked order
✓ Load it
```

### Step 4: Complete Parked (1 min)
```
✓ Add payment
✓ Create order
```

### Step 5: Verify (1 min)
```bash
# Check completed orders
sqlite3 libsdb/cpos.db "SELECT COUNT(*) FROM SaleOrder WHERE status='Completed';"

# Check no parked remain
sqlite3 libsdb/cpos.db "SELECT COUNT(*) FROM ParkedOrder;"
```

**Expected:**
- At least 2 completed orders
- Parked count reduced or 0

---

## 📱 Test Scenarios by Time

### Quick Tests (< 5 min)
- Simple cash order
- Park order
- Delete parked order
- Search parked orders

### Medium Tests (5-10 min)
- Split payment order
- Load and complete parked
- Multiple payment methods
- Order with discounts

### Full Tests (10-20 min)
- Complete test flow 1-8
- Validation testing
- Database verification

### Comprehensive Test (1 hour)
- All test flows in MANUAL_TESTING_GUIDE.md
- Edge cases
- Error scenarios
- Offline mode
- Full database audit

---

## 🎯 Success Criteria Checklist

### Basic Functionality
- [ ] Can create order with cash payment
- [ ] Can create order with card payment
- [ ] Can create order with split payment
- [ ] Order totals calculate correctly
- [ ] Tax calculates correctly
- [ ] Change calculates correctly

### Parked Orders
- [ ] Can park order
- [ ] Can search parked orders by customer
- [ ] Can search parked orders by order number
- [ ] Can load parked order
- [ ] Form populates with all parked data
- [ ] Can complete parked order
- [ ] Parked order removed after completion
- [ ] Can delete parked order

### Database Integrity
- [ ] Orders save to SaleOrder table
- [ ] Line items save to OrderLineItem table
- [ ] Payments save to OrderPayment table
- [ ] Parked orders save to ParkedOrder table
- [ ] Completed orders have status 'Completed'
- [ ] Parked orders have status 'Parked'
- [ ] No orphaned records

### User Experience
- [ ] Form resets after order creation
- [ ] Success messages appear
- [ ] Error messages are clear
- [ ] Search is real-time
- [ ] Loading states show
- [ ] Buttons enable/disable correctly

---

## 🔧 Troubleshooting Commands

### Clear All Test Data
```sql
-- DANGER: This will delete ALL orders!
DELETE FROM OrderPayment;
DELETE FROM OrderLineItem;
DELETE FROM ParkedOrder;
DELETE FROM SaleOrder;

-- Vacuum to reclaim space
VACUUM;
```

### Reset Parked Orders Only
```sql
UPDATE SaleOrder SET status='Voided' WHERE status='Parked';
DELETE FROM ParkedOrder;
```

### Find Orphaned Records
```sql
-- ParkedOrders without SaleOrder
SELECT po.* FROM ParkedOrder po
LEFT JOIN SaleOrder so ON po.orderId = so.id
WHERE so.id IS NULL;

-- OrderPayments without SaleOrder
SELECT op.* FROM OrderPayment op
LEFT JOIN SaleOrder so ON op.orderId = so.id
WHERE so.id IS NULL;
```

### Fix Parked Order Status Mismatch
```sql
-- Find parked records where order status isn't 'Parked'
SELECT po.parkNumber, so.orderNumber, so.status
FROM ParkedOrder po
JOIN SaleOrder so ON po.orderId = so.id
WHERE so.status != 'Parked';

-- Fix them
UPDATE SaleOrder
SET status = 'Parked'
WHERE id IN (
  SELECT orderId FROM ParkedOrder
);
```

---

## 📞 Quick Help

**Documentation:**
- Full Guide: `MANUAL_TESTING_GUIDE.md`
- Implementation: `PARKED_ORDERS_IMPLEMENTATION.md`
- Payment System: `SALES_IMPLEMENTATION.md`

**Database Location:**
- Desktop: `apps/desktop/libsdb/cpos.db`
- Web: Browser IndexedDB

**Access Database:**
```bash
# Desktop
sqlite3 apps/desktop/libsdb/cpos.db

# Inside SQLite
.tables          # List all tables
.schema TABLE    # Show table structure
.mode column     # Better display
.headers on      # Show column names
```

---

**Happy Testing! 🎉**
