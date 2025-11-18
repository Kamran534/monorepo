BEGIN TRANSACTION;
INSERT INTO SaleOrder (
  id, orderNumber, locationId, customerId, cashierId, orderDate, status,
  subtotal, taxAmount, discountAmount, discountPercent,
  adjustmentAmount, adjustmentReason, couponCode,
  totalAmount, amountPaid, amountDue, changeAmount,
  notes, customerNotes, createdAt, updatedAt,
  sync_status, last_synced_at, is_deleted
) VALUES (
  'test-order-1', 'TEST-ORDER-1', '3611a285-9a3c-4080-94f9-e57d5ab7a05b', NULL, 'd1c633de-7adc-4eec-87fc-ce4232bf0858', datetime('now'), 'Completed',
  100, 10, 0, 0,
  0, NULL, NULL,
  110, 110, 0, 0,
  NULL, NULL, datetime('now'), datetime('now'),
  'pending', NULL, 0
);

INSERT INTO OrderLineItem (
  id, orderId, variantId, salesPersonId, quantity, unitPrice,
  lineDiscount, lineDiscountPercent,
  customDiscountAmount, customDiscountPercent,
  lineTotal, notes, createdAt,
  sync_status, last_synced_at, is_deleted
) VALUES (
  'test-line-1', 'test-order-1', '281b4439-52d1-4196-a14e-7af4c279c007', NULL, 1, 100,
  0, 0,
  0, 0,
  100, NULL, datetime('now'),
  'pending', NULL, 0
);

INSERT INTO OrderPayment (
  id, orderId, paymentMethodId, amount, status,
  transactionId, authorizationCode, cardLast4, cardBrand,
  processedAt, createdAt,
  sync_status, last_synced_at, is_deleted
) VALUES (
  'test-payment-1', 'test-order-1', '20ee9e72-f2fe-4bf8-9852-1deb77b90458', 110, 'Completed',
  NULL, NULL, NULL, NULL,
  datetime('now'), datetime('now'),
  'pending', NULL, 0
);

COMMIT;
