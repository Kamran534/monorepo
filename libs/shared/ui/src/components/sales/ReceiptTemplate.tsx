import React from 'react';
import { Payment } from './PaymentPanel.js';
import { LineItem } from './LineItemEditor.js';
import { Customer } from './CustomerSelector.js';
import { ReceiptQrCode, renderReceiptQrCodeSVG } from '../barcode/ReceiptQrCode.js';

const shortenProductName = (name: string, maxWords = 2) => {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return trimmed;
  }
  return words.slice(0, maxWords).join(' ');
};

const normalizeReceiptCodeValue = (value?: string | null) => {
  if (!value) return '';
  return value.replace(/\//g, '-');
};

const getReceiptThemeColors = (theme?: 'light' | 'dark') => {
  const isDark = theme === 'dark';
  return {
    text: isDark ? '#f8fafc' : '#0f172a',
    muted: isDark ? 'rgba(248,250,252,0.7)' : '#4b5563',
    accent: isDark ? '#38bdf8' : '#111827',
    border: isDark ? 'rgba(248,250,252,0.35)' : '#111827',
    background: isDark ? '#0f172a' : '#ffffff',
  };
};

export interface ReceiptData {
  // Store info
  storeName: string;
  storeNameArabic?: string;
  storeUrl?: string;
  posNumber?: string;
  theme?: 'light' | 'dark';

  // Invoice details
  invoiceNumber: string;
  orderNumber?: string;
  orderId?: string;
  dateTime: string;
  orderDateIso?: string;
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
  taxAmount?: number;
  adjustmentAmount?: number;
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
    orderNumber,
    orderId,
    dateTime,
    cashier,
    customer,
    lineItems,
    payments,
    grossTotal,
    itemDiscount,
    taxAmount = 0,
    adjustmentAmount = 0,
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
  const qrValue = normalizeReceiptCodeValue(orderNumber || orderId || invoiceNumber);
  const { text, muted, accent, border, background } = getReceiptThemeColors(data.theme);

  return (
    <div
      style={{
        width: '80mm',
        fontFamily: "'Courier New', monospace",
        fontSize: '12px',
        lineHeight: '1.4',
        color: text,
        backgroundColor: background,
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
        <div style={{ width: '50px', textAlign: 'center' }}>Price</div>
        <div style={{ width: '30px', textAlign: 'center' }}>Qty</div>
        <div style={{ width: '40px', textAlign: 'center' }}>Disc%</div>
        <div style={{ width: '30px', textAlign: 'center' }}>C.Disc</div>
        <div style={{ width: '60px', textAlign: 'right' }}>Net Amt</div>
      </div>

      {/* Line Items */}
      {lineItems.map((item, index) => {
        const initialDiscountPercent = item.saleDiscount?.percent || 0;
        const initialDiscountAmount = item.saleDiscount?.amount || 0;
        const customDiscount = item.customDiscount?.amount || 0;
        const lineSubtotal = Number(item.quantity) * Number(item.unitPrice);
        const lineTotal =
          item.lineTotal ??
          Math.max(0, lineSubtotal - customDiscount - initialDiscountAmount);
        const lineDiscountAmount = Math.max(0, lineSubtotal - lineTotal);
        const lineDiscountPercent =
          lineSubtotal > 0 ? `${((lineDiscountAmount / lineSubtotal) * 100).toFixed(1)}%` : '0%';
        const lineTaxAmount =
          typeof (item as any).lineTax === 'number'
            ? Number((item as any).lineTax)
            : 0;
        const lineTaxPercent =
          lineTotal > 0 ? `${((lineTaxAmount / lineTotal) * 100).toFixed(1)}%` : '0%';
        
        // Get product name from variant or extended properties
        const productName = (item as any).productName || item.variant?.product?.name || 'Item';
        const variantName = (item as any).variantName || item.variant?.variantName;
        const sku = (item as any).sku || item.variant?.sku;
        // Combine product name and variant name for complete product name
        const completeProductName = variantName 
          ? `${productName} ${variantName}`.trim()
          : productName;

        return (
          <div key={item.id || index} style={{ marginBottom: '3mm' }}>
            {/* Product Name Row - Full product name */}
            <div
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                wordBreak: 'break-word',
                marginBottom: '1mm',
              }}
            >
              {completeProductName}
            </div>
            {/* Item Details Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
              }}
            >
              <div style={{ width: '50px', textAlign: 'center' }}>
                {item.unitPrice.toFixed(0)}
              </div>
              <div style={{ width: '30px', textAlign: 'center' }}>
                {item.quantity}
              </div>
              <div style={{ width: '40px', textAlign: 'center' }}>
                {lineDiscountAmount > 0 ? lineDiscountPercent : '0%'}
              </div>
              <div style={{ width: '30px', textAlign: 'center' }}>
                {lineDiscountAmount > 0 ? lineDiscountAmount.toFixed(2) : '0'}
              </div>
              <div style={{ width: '60px', textAlign: 'right' }}>
                {item.lineTotal.toFixed(2)}
              </div>
            </div>
            {(lineDiscountAmount > 0 || lineTaxAmount > 0) && (
              <div style={{ fontSize: '10px', marginTop: '1mm', color: '#4b5563' }}>
                {lineDiscountAmount > 0 && (
                  <div>Discount: Rs {lineDiscountAmount.toFixed(2)} ({lineDiscountPercent})</div>
                )}
                {lineTaxAmount > 0 && (
                  <div>Tax: Rs {lineTaxAmount.toFixed(2)} ({lineTaxPercent})</div>
                )}
              </div>
            )}
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

      {/* Totals Section */}
      <div style={{ fontSize: '11px', marginBottom: '1mm' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            marginBottom: '1mm',
            fontWeight: 'bold',
          }}
        >
          <div>Total {lineItems.length}</div>
          <div style={{ textAlign: 'right', minWidth: '80px' }}>
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

        {adjustmentAmount !== 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '1mm',
            }}
          >
            <div>Adjustment:</div>
            <div style={{ textAlign: 'right', minWidth: '80px' }}>
              Rs {adjustmentAmount.toFixed(2)}
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '1mm',
          }}
        >
          <div>Tax:</div>
          <div style={{ textAlign: 'right', minWidth: '80px' }}>Rs {taxAmount.toFixed(2)}</div>
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
          borderTop: `1px dashed ${border}`,
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
              borderTop: isLastLine ? `1px dashed ${border}` : 'none',
              borderBottom: isLastLine ? `1px dashed ${border}` : 'none',
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
  const qrValue = normalizeReceiptCodeValue(data.orderNumber || data.orderId || data.invoiceNumber);
  const barcodeMarkup = qrValue ? renderReceiptQrCodeSVG(qrValue) : '';
  const receiptElement = document.createElement('div');
  const root = document.createElement('div');
  receiptElement.appendChild(root);
  const { text, muted, border, background } = getReceiptThemeColors(data.theme);

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
            color: ${text};
            background-color: ${background};
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .muted { color: ${muted}; }
          .separator { border-top: 1px dashed ${border}; margin: 3mm 0; }
          .flex { display: flex; justify-content: space-between; color: ${text}; }
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
        <div class="center muted" style="font-size: 11px; margin-bottom: 3mm;">------------ Original ------------</div>
        <div class="flex bold" style="font-size: 11px; margin-bottom: 2mm; padding-bottom: 1mm; border-bottom: 1px solid ${border};">
          <div style="width: 50px; text-align: center;">Price</div>
          <div style="width: 30px; text-align: center;">Qty</div>
          <div style="width: 40px; text-align: center;">Disc%</div>
          <div style="width: 30px; text-align: center;">C.Disc</div>
          <div style="width: 60px; text-align: right;">Net Amt</div>
        </div>
        ${data.lineItems.map(item => {
          const discountPercent = item.saleDiscount?.percent || 0;
          const customDiscount = item.customDiscount?.amount || 0;
          const lineSubtotal = Number(item.quantity) * Number(item.unitPrice);
          const lineTotal = item.lineTotal ?? Math.max(0, lineSubtotal - customDiscount - (item.saleDiscount?.amount || 0));
          const lineDiscountAmount = Math.max(0, lineSubtotal - lineTotal);
          const lineDiscountPercent = lineSubtotal > 0 ? ((lineDiscountAmount / lineSubtotal) * 100).toFixed(1) : '0';
          // Get product name from variant or extended properties
          const productName = (item as any).productName || item.variant?.product?.name || 'Item';
          const variantName = (item as any).variantName || item.variant?.variantName;
          const sku = (item as any).sku || item.variant?.sku;
          // Combine product name and variant name for complete product name
          const completeProductName = variantName 
            ? `${productName} ${variantName}`.trim()
            : productName;
          return `
            <div style="margin-bottom: 3mm;">
              <div style="font-size: 11px; font-weight: bold; word-break: break-word; margin-bottom: 1mm;">${completeProductName}</div>
              <div class="flex" style="font-size: 11px;">
                <div style="width: 50px; text-align: center;">${item.unitPrice.toFixed(0)}</div>
                <div style="width: 30px; text-align: center;">${item.quantity}</div>
                <div style="width: 40px; text-align: center;">${lineDiscountAmount > 0 ? `${lineDiscountPercent}%` : '0%'}</div>
                <div style="width: 30px; text-align: center;">${lineDiscountAmount > 0 ? lineDiscountAmount.toFixed(2) : '0'}</div>
                <div style="width: 60px; text-align: right;">${item.lineTotal.toFixed(2)}</div>
            </div>
           
            </div>
          `;
        }).join('')}
        <div class="separator"></div>
        <div class="flex" style="font-size: 11px; margin-bottom: 1mm; font-weight: bold;">
          <div>Total ${data.lineItems.length}</div>
          <div style="text-align: right; min-width: 80px;">${data.grossTotal.toFixed(2)}</div>
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
          ${data.adjustmentAmount && data.adjustmentAmount !== 0 ? `
          <div class="flex" style="margin-bottom: 1mm;">
            <div>Adjustment:</div>
            <div style="text-align: right; min-width: 80px;">Rs ${data.adjustmentAmount.toFixed(2)}</div>
          </div>` : ''}
          <div class="flex" style="margin-bottom: 1mm;">
            <div>Tax:</div>
            <div style="text-align: right; min-width: 80px;">Rs ${(data.taxAmount ?? 0).toFixed(2)}</div>
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
        ${
          barcodeMarkup
            ? `
        <div style="margin-bottom: 3mm;">
          <div style="text-align: center; font-size: 10px; margin-bottom: 1mm;">Scan to view order</div>
          <div style="width: 120px; margin: 0 auto;">
            ${barcodeMarkup}
          </div>
        </div>
        `
            : ''
        }
        ${(data.footerText || [
          'ALLOW REFUND',
          'EXCHANGE WITH IN 7 DAYS',
          'NO CLAIM IMPORTED & SALE ITEMS',
          'Thanks for visiting us',
        ]).map((line, i, arr) => {
          const isLastLine = i === arr.length - 1;
          return `<div style="text-align: ${isLastLine ? 'center' : 'left'}; font-size: 11px; margin-bottom: ${isLastLine ? '1mm' : '1mm'}; margin-top: ${isLastLine ? '3mm' : '0'}; padding-top: ${isLastLine ? '3mm' : '0'}; padding-bottom: ${isLastLine ? '3mm' : '0'}; border-top: ${isLastLine ? '1px dashed ${border}' : 'none'}; border-bottom: ${isLastLine ? '1px dashed ${border}' : 'none'}; ${isLastLine ? 'font-weight: bold;' : ''}">${line}</div>`;
        }).join('')}
      </body>
    </html>
  `;
}
