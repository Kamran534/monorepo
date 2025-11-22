import React, { useEffect } from 'react';
import { Printer, X, FileText } from 'lucide-react';
import { ComponentProps } from '../../types.js';

export interface PrintConfirmationDialogProps extends ComponentProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onSkip?: () => void;
  receiptData?: {
    storeName?: string;
    invoiceNumber?: string;
    totalAmount?: number;
    amountPaid?: number;
    change?: number;
  };
  isProcessing?: boolean;
  disabled?: boolean;
}

/**
 * PrintConfirmationDialog Component
 *
 * Custom dialog that prompts the user to confirm printing a receipt
 * after completing a payment. Works on both web and desktop platforms.
 */
export function PrintConfirmationDialog({
  isOpen,
  onConfirm,
  onCancel,
  onSkip,
  receiptData,
  isProcessing = false,
  disabled = false,
  className = '',
}: PrintConfirmationDialogProps) {
  // Handle escape key to close dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing && !disabled) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isProcessing, disabled, onCancel]);

  // Handle enter key to confirm
  useEffect(() => {
    if (!isOpen) return;

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isProcessing && !disabled) {
        onConfirm();
      }
    };

    document.addEventListener('keydown', handleEnter);
    return () => document.removeEventListener('keydown', handleEnter);
  }, [isOpen, isProcessing, disabled, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center ${className}`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
    >
      {/* Overlay - Click to cancel */}
      <div
        className="absolute inset-0"
        onClick={!isProcessing && !disabled ? onCancel : undefined}
        style={{ cursor: !isProcessing && !disabled ? 'pointer' : 'default' }}
      />

      {/* Dialog Content - Compact and minimal */}
      <div
        className="relative w-full max-w-sm mx-4 rounded-lg shadow-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--color-bg-card, #ffffff)',
          border: '1px solid var(--color-border-light, #e0e0e0)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Compact */}
        <div
          className="relative px-4 py-3 border-b flex items-center justify-between"
          style={{
            borderColor: 'var(--color-border-light, #e0e0e0)',
            backgroundColor: 'var(--color-bg-secondary, #f8f8f8)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="p-1.5 rounded"
              style={{ backgroundColor: 'rgba(234, 88, 12, 0.1)' }}
            >
              <Printer className="w-4 h-4" style={{ color: '#ea580c' }} />
            </div>
            <div>
              <h2
                className="text-base font-semibold leading-tight"
                style={{ color: 'var(--color-text-primary, #333333)' }}
              >
                Print Receipt
              </h2>
              {receiptData?.invoiceNumber && (
                <p
                  className="text-xs mt-0.5 leading-tight"
                  style={{ color: 'var(--color-text-secondary, #666666)' }}
                >
                  Invoice #{receiptData.invoiceNumber}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isProcessing || disabled}
            className="p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-70"
            style={{
              color: 'var(--color-text-secondary, #666666)',
              backgroundColor: 'transparent',
            }}
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body - Compact spacing */}
        <div className="px-4 py-3 space-y-3">
          {/* Message */}
         

          {/* Receipt Summary - Compact */}
          {receiptData && (
            <div
              className="rounded p-3 space-y-1.5"
              style={{
                backgroundColor: 'var(--color-bg-secondary, #f8f8f8)',
                border: '1px solid var(--color-border-light, #e0e0e0)',
              }}
            >
              <div className="flex items-center gap-1.5 pb-1.5 border-b" style={{ borderColor: 'var(--color-border-light, #e0e0e0)' }}>
                <FileText className="w-3 h-3" style={{ color: 'var(--color-text-secondary, #666666)' }} />
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--color-text-secondary, #666666)' }}
                >
                  Receipt Summary
                </p>
              </div>

              {receiptData.storeName && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--color-text-secondary, #666666)' }}>Store</span>
                  <span
                    className="font-medium"
                    style={{ color: 'var(--color-text-primary, #333333)' }}
                  >
                    {receiptData.storeName}
                  </span>
                </div>
              )}

              {receiptData.totalAmount !== undefined && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--color-text-secondary, #666666)' }}>Total Amount</span>
                  <span
                    className="font-semibold"
                    style={{ color: 'var(--color-text-primary, #333333)' }}
                  >
                    Rs {receiptData.totalAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {receiptData.amountPaid !== undefined && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--color-text-secondary, #666666)' }}>Amount Paid</span>
                  <span
                    className="font-medium"
                    style={{ color: 'var(--color-text-primary, #333333)' }}
                  >
                    Rs {receiptData.amountPaid.toFixed(2)}
                  </span>
                </div>
              )}

              {receiptData.change !== undefined && receiptData.change > 0 && (
                <div className="flex justify-between text-xs pt-1.5 border-t" style={{ borderColor: 'var(--color-border-light, #e0e0e0)' }}>
                  <span
                    className="font-medium"
                    style={{ color: 'var(--color-success, #22c55e)' }}
                  >
                    Change Due
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: 'var(--color-success, #22c55e)' }}
                  >
                    Rs {receiptData.change.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Processing Indicator - Compact */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="animate-spin">
                <svg className="w-4 h-4" style={{ color: 'var(--color-info, #3b82f6)' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p
                className="text-xs font-medium"
                style={{ color: 'var(--color-text-secondary, #666666)' }}
              >
                Preparing receipt...
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions - Compact */}
        <div
          className="px-4 py-3 border-t flex items-center justify-end gap-2"
          style={{
            borderColor: 'var(--color-border-light, #e0e0e0)',
            backgroundColor: 'var(--color-bg-secondary, #f8f8f8)',
          }}
        >
          {/* Cancel Button */}
          <button
            onClick={onCancel}
            disabled={isProcessing || disabled}
            className="px-3 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              color: 'var(--color-text-primary, #333333)',
              backgroundColor: 'var(--color-bg-card, #ffffff)',
              border: '1px solid var(--color-border-light, #e0e0e0)',
            }}
          >
            Cancel
          </button>

          {/* Confirm Print Button */}
          <button
            onClick={onConfirm}
            disabled={isProcessing || disabled}
            className="px-4 py-1.5 rounded text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            style={{
              color: '#ffffff',
              backgroundColor: '#ea580c',
            }}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <span>Printing...</span>
              </>
            ) : (
              <>
                <Printer className="w-3 h-3" />
                <span>Print Receipt</span>
              </>
            )}
          </button>
        </div>

        {/* Keyboard Shortcuts Hint - Compact */}
        <div
          className="px-4 py-1.5 text-xs text-center"
          style={{
            color: 'var(--color-text-tertiary, #999999)',
            backgroundColor: 'var(--color-bg-secondary, #f8f8f8)',
          }}
        >
          Press <kbd className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--color-bg-card, #ffffff)', border: '1px solid var(--color-border-light, #e0e0e0)' }}>Enter</kbd> to print or <kbd className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--color-bg-card, #ffffff)', border: '1px solid var(--color-border-light, #e0e0e0)' }}>Esc</kbd> to cancel
        </div>
      </div>
    </div>
  );
}
