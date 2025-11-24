import React, { useState } from 'react';
import { CompactPaymentPanel, CompactPaymentPanelProps } from './CompactPaymentPanel.js';
import { PrintConfirmationDialog } from './PrintConfirmationDialog.js';
import { usePrintReceipt, PrintReceiptInput } from './usePrintReceipt.js';
import { Customer } from './CustomerSelector.js';

export interface PaymentWithPrintDialogProps extends CompactPaymentPanelProps {
  // Print configuration
  storeName?: string;
  storeNameArabic?: string;
  storeUrl?: string;
  posNumber?: string;

  // Receipt data
  invoiceNumber?: string;
  customer?: Customer;
  cashier?: string;

  // Callbacks
  onPaymentComplete?: () => void;
  onPrintSuccess?: () => void;
  onPrintError?: (error: Error) => void;
}

/**
 * PaymentWithPrintDialog Component
 *
 * Wraps CompactPaymentPanel with automatic print confirmation dialog
 * When payment is completed (amountDue <= 0), shows print dialog
 */
export function PaymentWithPrintDialog({
  // Payment panel props
  payments,
  paymentMethods,
  totalAmount,
  amountPaid,
  amountDue,
  onAddPayment,
  onRemovePayment,
  disabled,
  className,
  mode,

  // Print config
  storeName = 'Trade Unleashed',
  storeNameArabic = 'التجارة المنطلِقة',
  storeUrl = 'http://www.tradeUnleashed.com',
  posNumber = 'TRADE UNLEASHED',

  // Receipt data
  invoiceNumber,
  customer,
  cashier,

  // Callbacks
  onPaymentComplete,
  onPrintSuccess,
  onPrintError,
}: PaymentWithPrintDialogProps) {
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Initialize print receipt hook
  const {
    showPrintDialog,
    isPrinting,
    receiptData,
    promptPrintReceipt,
    confirmPrint,
    cancelPrint,
    skipPrint,
  } = usePrintReceipt({
    storeName,
    storeNameArabic,
    storeUrl,
    posNumber,
    onPrintSuccess: () => {
      console.log('Receipt printed successfully');
      onPrintSuccess?.();
      setPaymentCompleted(false);
    },
    onPrintError: (error) => {
      console.error('Print error:', error);
      onPrintError?.(error);
    },
  });

  // Handle payment addition
  const handleAddPayment: typeof onAddPayment = (payment) => {
    onAddPayment(payment);

    // Check if payment will be complete after adding this payment
    const newAmountPaid = amountPaid + payment.amount;
    const newAmountDue = totalAmount - newAmountPaid;

    if (newAmountDue <= 0 && !paymentCompleted) {
      // Payment is now complete - show print dialog after a short delay
      setTimeout(() => {
        setPaymentCompleted(true);
        onPaymentComplete?.();

        // Note: You'll need to get lineItems from parent component
        // This is a simplified version - see integration guide for full implementation
        if (invoiceNumber) {
          // Calculate for receipt - simplified version
          const grossTotal = totalAmount;
          const itemDiscount = 0; // Should come from order
          const netTotal = totalAmount;
          const tendered = newAmountPaid;
          const change = Math.abs(Math.min(0, newAmountDue));

          promptPrintReceipt({
            invoiceNumber,
            orderNumber: invoiceNumber,
            orderId: invoiceNumber,
            lineItems: [], // Should be passed from parent
            payments: [...payments, { ...payment, id: Date.now().toString() }],
            customer,
            cashier,
            grossTotal,
            itemDiscount,
            netTotal,
            tendered,
            change,
          });
        }
      }, 300);
    }
  };

  // Handle skip print - also triggers payment complete callback
  const handleSkipPrint = () => {
    skipPrint();
    setPaymentCompleted(false);
  };

  // Handle cancel print - also triggers payment complete callback
  const handleCancelPrint = () => {
    cancelPrint();
    setPaymentCompleted(false);
  };

  return (
    <>
      {/* Payment Panel */}
      <CompactPaymentPanel
        payments={payments}
        paymentMethods={paymentMethods}
        totalAmount={totalAmount}
        amountPaid={amountPaid}
        amountDue={amountDue}
        onAddPayment={handleAddPayment}
        onRemovePayment={onRemovePayment}
        disabled={disabled}
        className={className}
        mode={mode}
      />

      {/* Print Confirmation Dialog */}
      <PrintConfirmationDialog
        isOpen={showPrintDialog}
        onConfirm={confirmPrint}
        onCancel={handleCancelPrint}
        onSkip={handleSkipPrint}
        receiptData={
          receiptData
            ? {
                storeName: receiptData.storeName,
                invoiceNumber: receiptData.invoiceNumber,
                totalAmount: receiptData.netTotal,
                amountPaid: receiptData.tendered,
                change: receiptData.change,
              }
            : undefined
        }
        isProcessing={isPrinting}
      />
    </>
  );
}
