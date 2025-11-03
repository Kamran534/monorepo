import React, { forwardRef } from 'react';

export type InvoiceLineItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total?: number; // if omitted, computed as quantity * unitPrice
};

export type InvoiceBrand = {
  storeName: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  website?: string;
};

export type InvoiceCustomer = {
  name?: string;
  phone?: string;
  email?: string;
};

export interface InvoiceProps {
  brand: InvoiceBrand;
  invoiceNo: string;
  date: string; // formatted
  cashier?: string;
  customer?: InvoiceCustomer;
  items: InvoiceLineItem[];
  subTotal: number;
  tax?: number;
  discount?: number;
  grandTotal: number;
  paymentMethod?: string;
  notes?: string;
  className?: string;
  paperWidth?: '80mm' | 'A4';
  receivedAmount?: number;
  changeDue?: number;
}

const currency = (n: number) => `$${n.toFixed(2)}`;

/**
 * Invoice component - print-friendly receipt
 * - Uses theme variables so it matches light/dark automatically
 * - Optimized for 80mm receipt printers but responsive for A4 as well
 */
export const Invoice = forwardRef<HTMLDivElement, InvoiceProps>(function Invoice(
  {
    brand,
    invoiceNo,
    date,
    cashier,
    customer,
    items,
    subTotal,
    tax = 0,
    discount = 0,
    grandTotal,
    paymentMethod,
    notes,
    className = '',
    paperWidth = '80mm',
    receivedAmount,
    changeDue,
  },
  ref
) {
  const pageMargin = paperWidth === '80mm' ? '6mm' : '12mm';
  return (
    <div
      ref={ref}
      className={`w-full ${paperWidth === '80mm' ? 'max-w-[380px]' : 'max-w-[720px]'} mx-auto ${className}`}
      style={{
        backgroundColor: '#ffffff',
        color: '#111111',
        border: '1px solid #e5e7eb',
        boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
        colorAdjust: 'exact' as unknown as undefined,
      }}
    >
      {/* Header - thermal receipt style */}
      <div className="p-5 border-b" style={{ borderColor: '#e5e7eb' }}>
        <div className="text-center">
          <div className="text-2xl font-extrabold tracking-wider uppercase">{brand.storeName || 'PAYFLOW'}</div>
          {brand.address && <div className="text-[11px] mt-1 opacity-80">{brand.address}</div>}
          {(brand.phone || brand.website) && (
            <div className="text-[11px] opacity-80">{brand.phone}{brand.phone && brand.website ? ' • ' : ''}{brand.website}</div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] mt-4">
          <div>
            <div>Bill No: <span className="font-medium">{invoiceNo}</span></div>
            <div>Date: <span className="font-medium">{date}</span></div>
          </div>
          <div className="text-right">
            {cashier && <div>Cashier: <span className="font-medium">{cashier}</span></div>}
          </div>
        </div>
      </div>

      {/* Customer */}
      {customer && (customer.name || customer.phone || customer.email) && (
        <div className="p-4 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="text-sm font-medium mb-1">Bill To</div>
          <div className="text-xs opacity-90">
            {customer.name && <div>{customer.name}</div>}
            {customer.phone && <div>{customer.phone}</div>}
            {customer.email && <div>{customer.email}</div>}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="p-5">
        <div className="w-full border-t border-dashed mb-2" style={{ borderColor: '#9ca3af' }} />
        <table className="w-full text-[12px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="text-left font-semibold py-2">Qty</th>
              <th className="text-left font-semibold py-2">Description</th>
              <th className="text-right font-semibold py-2">Unit Price</th>
              <th className="text-right font-semibold py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const lineTotal = it.total ?? it.quantity * it.unitPrice;
              return (
                <tr key={it.id}>
                  <td className="py-1 align-top">{it.quantity}</td>
                  <td className="py-1 pr-2"><div>{it.name}</div></td>
                  <td className="py-1 text-right">{currency(it.unitPrice)}</td>
                  <td className="py-1 text-right">{currency(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="w-full border-t border-dashed mt-2" style={{ borderColor: '#9ca3af' }} />
      </div>

      {/* Totals */}
      <div className="px-5 pb-5">
        <div className="flex justify-between text-[12px] py-1">
          <span>Subtotal</span>
          <span>{currency(subTotal)}</span>
        </div>
        <div className="flex justify-between text-[12px] py-1">
          <span>Discount</span>
          <span>-{currency(discount)}</span>
        </div>
        <div className="flex justify-between text-[12px] py-1">
          <span>Tax</span>
          <span>{currency(tax)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-1" style={{ borderColor: '#e5e7eb' }}>
          <span>Total</span>
          <span>{currency(grandTotal)}</span>
        </div>
        {typeof receivedAmount === 'number' && (
          <div className="flex justify-between text-[12px] py-1">
            <span>Total Amount</span>
            <span className="font-semibold">{currency(receivedAmount)}</span>
          </div>
        )}
        {typeof changeDue === 'number' && (
          <div className="flex justify-between text-[12px] py-1">
            <span>Change Due</span>
            <span className="font-semibold">{currency(changeDue)}</span>
          </div>
        )}
        {paymentMethod && (
          <div className="text-[11px] opacity-80 mt-1">Paid via {paymentMethod}</div>
        )}
      </div>

      {/* Footer */}
      {notes && (
        <div className="px-5 pb-4 text-[11px] opacity-80">{notes}</div>
      )}

      {/* Thank you footer */}
      <div className="text-center text-[11px] opacity-80 pb-6">Thank you for your business! Please come again!</div>

      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            .print\\:show { display: block !important; }
            .print\\:p-0 { padding: 0 !important; }
            body { -webkit-print-color-adjust: exact; }
          }
          @page {
            size: auto;
            margin: ${pageMargin};
          }
        `}
      </style>
    </div>
  );
});

export default Invoice;


