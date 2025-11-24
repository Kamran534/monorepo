import React from 'react';
import { Payment, PaymentMethod } from './PaymentPanel.js';
import { LineItem } from './LineItemEditor.js';
import { Customer } from './CustomerSelector.js';

export interface ReceiptData {
  // Store info
  storeName: string;
  storeNameArabic?: string;
  storeUrl?: string;
  posNumber?: string;

  // Invoice details
  invoiceNumber: string;
  dateTime: string;
  cashier?: string;

  // Customer
  customer?: Customer;

  // Order items
  lineItems: LineItem[];

  // Payments
  payments: Payment[];

  // Totals
  grossTotal: number;
  itemDiscount: number;
  netTotal: number;
  tendered: number;
  change: number;

  // Footer
  footerText?: string[];
}

/**
 * ReceiptTemplate Component
 *
 * Generates a thermal printer receipt (80mm) matching the AL IMRAN BOUTIQUE format
 * This component renders the HTML that will be sent to the printer
 */
export function ReceiptTemplate({ data }: { data: ReceiptData }) {
  const {
    storeName,
    storeNameArabic,
    storeUrl,
    posNumber,
    invoiceNumber,
    dateTime,
    cashier,
    customer,
    lineItems,
    payments,
    grossTotal,
    itemDiscount,
    netTotal,
    tendered,
    change,
    footerText = [
      'ALLOW REFUND',
      'EXCHANGE WITH IN 7 DAYS',
      'NO CLAIM IMPORTED & SALE ITEMS',
      'Thanks for visiting us',
    ],
  } = data;

  return (
    <div
      style={{
        width: '80mm',
        fontFamily: "'Courier New', monospace",
        fontSize: '12px',
        lineHeight: '1.4',
        color: '#000',
        padding: '5mm',
      }}
    >
      {/* Store Name in Arabic */}
      {storeNameArabic && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '3mm',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {storeNameArabic}
        </div>
      )}

      {/* Store Name */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '2mm',
        }}
      >
        {storeName}
      </div>

      {/* Store URL */}
      {storeUrl && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '11px',
            marginBottom: '2mm',
          }}
        >
          {storeUrl}
        </div>
      )}

      {/* POS Number */}
      {posNumber && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '11px',
            marginBottom: '4mm',
          }}
        >
          POS NO: {posNumber}
        </div>
      )}

      {/* Invoice Header */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '12px',
          marginBottom: '1mm',
        }}
      >
        Invoice #: {invoiceNumber}
      </div>

      {/* Date and Time */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '11px',
          marginBottom: '3mm',
        }}
      >
        {dateTime}
      </div>

      {/* Cashier */}
      {cashier && (
        <div
          style={{
            fontSize: '11px',
            marginBottom: '1mm',
          }}
        >
          Cashier: {cashier}
        </div>
      )}

      {/* Payment Mode */}
      <div
        style={{
          fontSize: '11px',
          marginBottom: '1mm',
        }}
      >
        Mode of Payment: {payments.length > 0 ? payments[0].paymentMethod?.type || 'Cash' : 'Cash'}
      </div>

      {/* Customer */}
      {customer && (
        <div
          style={{
            fontSize: '11px',
            marginBottom: '3mm',
          }}
        >
          Customer: {`${customer.firstName} ${customer.lastName}`.trim()}
        </div>
      )}

      {/* Separator Line */}
      <div
        style={{
          borderTop: '1px dashed #000',
          margin: '3mm 0',
        }}
      />

      {/* Original Label */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '11px',
          marginBottom: '3mm',
        }}
      >
        ------------ Original ------------
      </div>

      {/* Table Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontWeight: 'bold',
          marginBottom: '2mm',
          paddingBottom: '1mm',
          borderBottom: '1px solid #000',
        }}
      >
        <div style={{ flex: '2' }}>Product</div>
        <div style={{ width: '50px', textAlign: 'center' }}>Price</div>
        <div style={{ width: '30px', textAlign: 'center' }}>Qty</div>
        <div style={{ width: '40px', textAlign: 'center' }}>Disc%</div>
        <div style={{ width: '30px', textAlign: 'center' }}>C Disc</div>
        <div style={{ width: '60px', textAlign: 'right' }}>Net Amt</div>
      </div>

      {/* Line Items */}
      {lineItems.map((item, index) => {
        const discountPercent = item.saleDiscount?.percent || 0;
        const customDiscount = item.customDiscount?.amount || 0;
        
        // Get product name from variant or extended properties
        const productName = (item as any).productName || item.variant?.product?.name || 'Item';
        const variantName = (item as any).variantName || item.variant?.variantName;
        const sku = (item as any).sku || item.variant?.sku;

        return (
          <div key={item.id || index} style={{ marginBottom: '3mm' }}>
            {/* Item Details Row - Product name in first column */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
              }}
            >
              <div style={{ flex: '2', fontWeight: 'bold', wordBreak: 'break-word' }}>
                {productName} {variantName && `- ${variantName}`}
              </div>
              <div style={{ width: '50px', textAlign: 'center' }}>
                {item.unitPrice.toFixed(0)}
              </div>
              <div style={{ width: '30px', textAlign: 'center' }}>
                {item.quantity}
              </div>
              <div style={{ width: '40px', textAlign: 'center' }}>
                {discountPercent > 0 ? `${discountPercent}%` : '0%'}
              </div>
              <div style={{ width: '30px', textAlign: 'center' }}>
                {customDiscount > 0 ? customDiscount.toFixed(0) : '0'}
              </div>
              <div style={{ width: '60px', textAlign: 'right' }}>
                {item.lineTotal.toFixed(2)}
              </div>
            </div>
          </div>
        );
      })}

      {/* Separator Line */}
      <div
        style={{
          borderTop: '1px dashed #000',
          margin: '3mm 0',
        }}
      />

      {/* Totals Section - Match table column widths */}
      <div style={{ fontSize: '11px', marginBottom: '1mm' }}>
        <div
          style={{
            display: 'flex',
            fontSize: '11px',
            marginBottom: '1mm',
          }}
        >
          <div style={{ flex: '2' }}>Total {lineItems.length}</div>
          <div style={{ width: '50px', textAlign: 'center' }}></div>
          <div style={{ width: '30px', textAlign: 'center' }}></div>
          <div style={{ width: '40px', textAlign: 'center' }}></div>
          <div style={{ width: '30px', textAlign: 'center' }}></div>
          <div style={{ width: '60px', textAlign: 'right' }}>
            {grossTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Separator Line */}
      <div
        style={{
          borderTop: '1px dashed #000',
          margin: '3mm 0',
        }}
      />

      {/* Financial Summary */}
      <div
        style={{
          fontSize: '12px',
          fontWeight: 'bold',
          marginTop: '3mm',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '1mm',
          }}
        >
          <div>Gross Total:</div>
          <div style={{ textAlign: 'right', minWidth: '80px' }}>Rs {grossTotal.toFixed(2)}</div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '1mm',
          }}
        >
          <div>Item Discount:</div>
          <div style={{ textAlign: 'right', minWidth: '80px' }}>-Rs {itemDiscount.toFixed(2)}</div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '3mm',
          }}
        >
          <div>Net Total:</div>
          <div style={{ textAlign: 'right', minWidth: '80px' }}>Rs {netTotal.toFixed(2)}</div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '1mm',
          }}
        >
          <div>Tendered: {payments[0]?.paymentMethod?.type || 'Cash'}:</div>
          <div style={{ textAlign: 'right', minWidth: '80px' }}>Rs {tendered.toFixed(2)}</div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div>Change:</div>
          <div style={{ textAlign: 'right', minWidth: '80px' }}>Rs {change.toFixed(2)}</div>
        </div>
      </div>

      {/* Separator Line */}
      <div
        style={{
          borderTop: '1px dashed #000',
          margin: '4mm 0',
        }}
      />

      {/* Footer Text */}
      {footerText.map((line, index) => {
        const isLastLine = index === footerText.length - 1;
        return (
          <div
            key={index}
            style={{
              textAlign: isLastLine ? 'center' : 'left', // Center-align last line (Thanks for visiting us)
              fontSize: '11px',
              marginBottom: '1mm',
              marginTop: isLastLine ? '3mm' : '0',
              paddingTop: isLastLine ? '3mm' : '0',
              paddingBottom: isLastLine ? '3mm' : '0',
              borderTop: isLastLine ? '1px dashed #000' : 'none',
              borderBottom: isLastLine ? '1px dashed #000' : 'none',
              fontWeight: isLastLine ? 'bold' : 'normal',
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Generate receipt HTML string for printing
 */
export function generateReceiptHTML(data: ReceiptData): string {
  const receiptElement = document.createElement('div');
  const root = document.createElement('div');
  receiptElement.appendChild(root);

  // Note: In a real implementation, you would use ReactDOM.renderToString
  // For now, we'll return a simplified HTML template
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            width: 80mm;
            padding: 5mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .separator { border-top: 1px dashed #000; margin: 3mm 0; }
          .flex { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        ${data.storeNameArabic ? `<div class="center bold" style="font-size: 20px; margin-bottom: 3mm; font-family: Arial, sans-serif;">${data.storeNameArabic}</div>` : ''}
        <div class="center bold" style="font-size: 16px; margin-bottom: 2mm;">${data.storeName}</div>
        ${data.storeUrl ? `<div class="center" style="font-size: 11px; margin-bottom: 2mm;">${data.storeUrl}</div>` : ''}
        ${data.posNumber ? `<div class="center" style="font-size: 11px; margin-bottom: 4mm;">POS NO: ${data.posNumber}</div>` : ''}
        <div class="center" style="font-size: 12px; margin-bottom: 1mm;">Invoice #: ${data.invoiceNumber}</div>
        <div class="center" style="font-size: 11px; margin-bottom: 3mm;">${data.dateTime}</div>
        ${data.cashier ? `<div style="font-size: 11px; margin-bottom: 1mm;">Cashier: ${data.cashier}</div>` : ''}
        <div style="font-size: 11px; margin-bottom: 1mm;">Mode of Payment: ${data.payments[0]?.paymentMethod?.type || 'Cash'}</div>
        ${data.customer ? `<div style="font-size: 11px; margin-bottom: 3mm;">Customer: ${`${data.customer.firstName} ${data.customer.lastName}`.trim()}</div>` : ''}
        <div class="separator"></div>
        <div class="center" style="font-size: 11px; margin-bottom: 3mm;">------------ Original ------------</div>
        <div class="flex bold" style="font-size: 11px; margin-bottom: 2mm; padding-bottom: 1mm; border-bottom: 1px solid #000;">
          <div style="flex: 2;">Product</div>
          <div style="width: 50px; text-align: center;">Price</div>
          <div style="width: 30px; text-align: center;">Qty</div>
          <div style="width: 40px; text-align: center;">Disc%</div>
          <div style="width: 30px; text-align: center;">C Disc</div>
          <div style="width: 60px; text-align: right;">Net Amt</div>
        </div>
        ${data.lineItems.map(item => {
          const discountPercent = item.saleDiscount?.percent || 0;
          const customDiscount = item.customDiscount?.amount || 0;
          // Get product name from variant or extended properties
          const productName = (item as any).productName || item.variant?.product?.name || 'Item';
          const variantName = (item as any).variantName || item.variant?.variantName;
          const sku = (item as any).sku || item.variant?.sku;
          return `
            <div style="margin-bottom: 3mm;">
              <div class="flex" style="font-size: 11px;">
                <div style="flex: 2; font-weight: bold; word-break: break-word;">${productName}${variantName ? ` - ${variantName}` : ''}</div>
                <div style="width: 50px; text-align: center;">${item.unitPrice.toFixed(0)}</div>
                <div style="width: 30px; text-align: center;">${item.quantity}</div>
                <div style="width: 40px; text-align: center;">${discountPercent > 0 ? `${discountPercent}%` : '0%'}</div>
                <div style="width: 30px; text-align: center;">${customDiscount > 0 ? customDiscount.toFixed(0) : '0'}</div>
                <div style="width: 60px; text-align: right;">${item.lineTotal.toFixed(2)}</div>
              </div>
            </div>
          `;
        }).join('')}
        <div class="separator"></div>
        <div class="flex" style="font-size: 11px; margin-bottom: 1mm;">
          <div style="flex: 2;">Total ${data.lineItems.length}</div>
          <div style="width: 50px; text-align: center;"></div>
          <div style="width: 30px; text-align: center;"></div>
          <div style="width: 40px; text-align: center;"></div>
          <div style="width: 30px; text-align: center;"></div>
          <div style="width: 60px; text-align: right;">${data.grossTotal.toFixed(2)}</div>
        </div>
        <div class="separator"></div>
        <div class="bold" style="font-size: 12px; margin-top: 3mm;">
          <div class="flex" style="margin-bottom: 1mm;">
            <div>Gross Total:</div>
            <div style="text-align: right; min-width: 80px;">Rs ${data.grossTotal.toFixed(2)}</div>
          </div>
          <div class="flex" style="margin-bottom: 1mm;">
            <div>Item Discount:</div>
            <div style="text-align: right; min-width: 80px;">-Rs ${data.itemDiscount.toFixed(2)}</div>
          </div>
          <div class="flex" style="margin-bottom: 3mm;">
            <div>Net Total:</div>
            <div style="text-align: right; min-width: 80px;">Rs ${data.netTotal.toFixed(2)}</div>
          </div>
          <div class="flex" style="margin-bottom: 1mm;">
            <div>Tendered: ${data.payments[0]?.paymentMethod?.type || 'Cash'}:</div>
            <div style="text-align: right; min-width: 80px;">Rs ${data.tendered.toFixed(2)}</div>
          </div>
          <div class="flex">
            <div>Change:</div>
            <div style="text-align: right; min-width: 80px;">Rs ${data.change.toFixed(2)}</div>
          </div>
        </div>
        <div class="separator"></div>
        ${(data.footerText || [
          'ALLOW REFUND',
          'EXCHANGE WITH IN 7 DAYS',
          'NO CLAIM IMPORTED & SALE ITEMS',
          'Thanks for visiting us',
        ]).map((line, i, arr) => {
          const isLastLine = i === arr.length - 1;
          return `<div style="text-align: ${isLastLine ? 'center' : 'left'}; font-size: 11px; margin-bottom: ${isLastLine ? '1mm' : '1mm'}; margin-top: ${isLastLine ? '3mm' : '0'}; padding-top: ${isLastLine ? '3mm' : '0'}; padding-bottom: ${isLastLine ? '3mm' : '0'}; border-top: ${isLastLine ? '1px dashed #000' : 'none'}; border-bottom: ${isLastLine ? '1px dashed #000' : 'none'}; ${isLastLine ? 'font-weight: bold;' : ''}">${line}</div>`;
        }).join('')}
      </body>
    </html>
  `;
}
