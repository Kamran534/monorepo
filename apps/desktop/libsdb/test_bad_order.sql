BEGIN TRANSACTION;
INSERT INTO SaleOrder (
  id, orderNumber, locationId, customerId, cashierId, orderDate, status,
  subtotal, taxAmount, discountAmount, discountPercent,
  adjustmentAmount, adjustmentReason, couponCode,
  totalAmount, amountPaid, amountDue, changeAmount,
  notes, customerNotes, createdAt, updatedAt,
  sync_status, last_synced_at, is_deleted
) VALUES (
  'test-order-2', 'TEST-ORDER-2', '3611a285-9a3c-4080-94f9-e57d5ab7a05b', NULL, 'missing-user', datetime('now'), 'Completed',
  100, 10, 0, 0,
  0, NULL, NULL,
  110, 110, 0, 0,
  NULL, NULL, datetime('now'), datetime('now'),
  'pending', NULL, 0
);
COMMIT;
