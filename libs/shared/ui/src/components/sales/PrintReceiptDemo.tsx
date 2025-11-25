/**
 * PrintReceiptDemo
 *
 * Demo component to test the print receipt functionality
 * This is for testing purposes only
 */

import React, { useState } from 'react';
import { PrintConfirmationDialog } from './PrintConfirmationDialog.js';
import { usePrintReceipt } from './usePrintReceipt.js';
import { Payment, PaymentMethod } from './PaymentPanel.js';
import { LineItem } from './LineItemEditor.js';

export function PrintReceiptDemo() {
  const [showDialog, setShowDialog] = useState(false);

  const {
    showPrintDialog,
    isPrinting,
    receiptData,
    promptPrintReceipt,
    confirmPrint,
    cancelPrint,
    skipPrint,
  } = usePrintReceipt({
    storeName: 'AL IMRAN BOUTIQUE',
    storeNameArabic: 'العمران',
    storeUrl: 'http://www.alimranboutique.com',
    posNumber: 'ALIMRAN BOUTIQUE',
    onPrintSuccess: () => {
      alert('Receipt printed successfully!');
    },
    onPrintError: (error) => {
      alert('Print failed: ' + error.message);
    },
  });

  // Sample data matching the receipt image
  const samplePaymentMethod: PaymentMethod = {
    id: '1',
    code: 'CASH',
    name: 'Cash',
    type: 'Cash',
    isActive: true,
  };

  const samplePayments: Payment[] = [
    {
      id: '1',
      paymentMethodId: '1',
      paymentMethod: samplePaymentMethod,
      amount: 19000,
    },
  ];

  const sampleLineItems: LineItem[] = [
    {
      id: '1',
      variantId: 'var-1',
      variant: {
        id: 'var-1',
        sku: '30014291',
        variantName: '3608 M',
        product: {
          id: 'prod-1',
          name: 'MARIA B',
        },
      },
      quantity: 1,
      unitPrice: 18900,
      saleDiscount: { percent: 0 },
      customDiscount: { amount: 0 },
      lineSubtotal: 18900,
      lineDiscount: 90,
      lineTotal: 18990,
    } as LineItem,
  ];

  const handleTestPrint = () => {
    promptPrintReceipt({
      invoiceNumber: '22140',
      orderNumber: 'ORD-22140',
      orderId: 'DEMO-22140',
      lineItems: sampleLineItems,
      payments: samplePayments,
      cashier: 'Hamza',
      grossTotal: 18900,
      itemDiscount: 90,
      taxAmount: 0,
      adjustmentAmount: 0,
      netTotal: 18990,
      tendered: 19000,
      change: 10,
    });
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Print Receipt Demo</h1>

        <p className="text-gray-600 mb-6">
          Click the button below to test the print receipt functionality.
          This will show the custom print confirmation dialog.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleTestPrint}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Test Print Receipt
          </button>

          <div className="border-t pt-4">
            <h2 className="font-semibold mb-2">Sample Receipt Data:</h2>
            <div className="bg-gray-50 p-4 rounded text-sm font-mono">
              <div>Invoice: 22140</div>
              <div>Cashier: Hamza</div>
              <div>Item: MARIA B 3608 M (SKU: 30014291)</div>
              <div>Price: Rs 18,900.00</div>
              <div>Discount: Rs 90.00</div>
              <div>Net Total: Rs 18,990.00</div>
              <div>Tendered: Rs 19,000.00</div>
              <div>Change: Rs 10.00</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h2 className="font-semibold mb-2">Dialog Features:</h2>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Enter</kbd> to print</li>
              <li>• Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Esc</kbd> to cancel</li>
              <li>• Click outside dialog to cancel</li>
              <li>• Shows receipt summary before printing</li>
              <li>• Processing indicator during print</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Print Confirmation Dialog */}
      <PrintConfirmationDialog
        isOpen={showPrintDialog}
        onConfirm={confirmPrint}
        onCancel={cancelPrint}
        onSkip={skipPrint}
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
    </div>
  );
}
