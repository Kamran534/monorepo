import { useState, useCallback } from 'react';
import { usePrinter } from '@monorepo/shared-hooks-printer';
import { ReceiptData, generateReceiptHTML } from './ReceiptTemplate.js';
import { LineItem } from './LineItemEditor.js';
import { Payment } from './PaymentPanel.js';
import { Customer } from './CustomerSelector.js';

export interface UsePrintReceiptOptions {
  storeName?: string;
  storeNameArabic?: string;
  storeUrl?: string;
  posNumber?: string;
  onPrintSuccess?: () => void;
  onPrintError?: (error: Error) => void;
}

export interface PrintReceiptInput {
  invoiceNumber: string;
  lineItems: LineItem[];
  payments: Payment[];
  customer?: Customer;
  cashier?: string;
  grossTotal: number;
  itemDiscount: number;
  netTotal: number;
  tendered: number;
  change: number;
  footerText?: string[];
}

/**
 * Custom hook for printing receipts with confirmation dialog
 * Integrates the printer hook with the print confirmation dialog
 */
export function usePrintReceipt({
  storeName = 'AL IMRAN BOUTIQUE',
  storeNameArabic = 'العمران',
  storeUrl = 'http://www.alimranboutique.com',
  posNumber = 'ALIMRAN BOUTIQUE',
  onPrintSuccess,
  onPrintError,
}: UsePrintReceiptOptions = {}) {
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [currentReceiptData, setCurrentReceiptData] = useState<ReceiptData | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const printer = usePrinter({
    defaultPrinterType: 'thermal',
    silent: true,
    onBeforePrint: () => {
      setIsPrinting(true);
    },
    onAfterPrint: () => {
      setIsPrinting(false);
      setShowPrintDialog(false);
      setCurrentReceiptData(null);
      onPrintSuccess?.();
    },
    onPrintError: (error) => {
      setIsPrinting(false);
      onPrintError?.(error);
      // Keep dialog open on error so user can retry
    },
  });

  /**
   * Show print confirmation dialog with receipt data
   */
  const promptPrintReceipt = useCallback((input: PrintReceiptInput) => {
    const dateTime = new Date().toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const receiptData: ReceiptData = {
      storeName,
      storeNameArabic,
      storeUrl,
      posNumber,
      invoiceNumber: input.invoiceNumber,
      dateTime,
      cashier: input.cashier,
      customer: input.customer,
      lineItems: input.lineItems,
      payments: input.payments,
      grossTotal: input.grossTotal,
      itemDiscount: input.itemDiscount,
      netTotal: input.netTotal,
      tendered: input.tendered,
      change: input.change,
      footerText: input.footerText,
    };

    setCurrentReceiptData(receiptData);
    setShowPrintDialog(true);
  }, [storeName, storeNameArabic, storeUrl, posNumber]);

  /**
   * Confirm and execute print
   */
  const confirmPrint = useCallback(async () => {
    if (!currentReceiptData) {
      console.error('No receipt data available');
      return;
    }

    try {
      setIsPrinting(true);
      
      // Generate receipt HTML
      const receiptHTML = generateReceiptHTML(currentReceiptData);
      
      if (!receiptHTML || receiptHTML.trim().length === 0) {
        throw new Error('Failed to generate receipt HTML');
      }

      // Check if we're in Electron
      const isElectron = navigator.userAgent.toLowerCase().includes('electron');
      
      if (isElectron && (window as any).electronAPI?.print) {
        // Direct print for Electron - bypass preview
        try {
          console.log('[usePrintReceipt] Attempting to print via Electron API...');
          const result = await (window as any).electronAPI.print({
            silent: true,
            printBackground: true,
            deviceName: '', // Use default printer
            htmlContent: receiptHTML,
          });
          
          console.log('[usePrintReceipt] Print result:', result);
          
          // Success
          setIsPrinting(false);
          setShowPrintDialog(false);
          setCurrentReceiptData(null);
          onPrintSuccess?.();
          return;
        } catch (err: any) {
          setIsPrinting(false);
          console.error('[usePrintReceipt] Electron print error:', err);
          
          // Check if error indicates printer is missing
          const errorMessage = err?.message || String(err || '').toLowerCase();
          const failureReason = err?.failureReason || '';
          const isPrinterMissing = 
            errorMessage.includes('printer') && 
            (errorMessage.includes('not found') || 
             errorMessage.includes('not available') || 
             errorMessage.includes('missing') ||
             errorMessage.includes('no printer') ||
             errorMessage.includes('device not found')) ||
            failureReason.toLowerCase().includes('printer') ||
            failureReason.toLowerCase().includes('device');
          
          if (isPrinterMissing) {
            // Show printer missing error
            const printerError = new Error('Printer Missing');
            onPrintError?.(printerError);
            // Also show alert for immediate feedback
            alert('Printer Missing\n\nPlease connect a printer to your device and try again.');
          } else {
            throw err; // Re-throw to be caught by outer catch
          }
          return;
        }
      }

      // For web browser, use the printer hook
      // Set up print job first
      printer.print(receiptHTML, {
        printerType: 'thermal',
        paperWidth: '80mm',
        fontSize: '12px',
        margin: '0',
      });

      // Wait for state to update (React state is async)
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Execute print
      await printer.executePrint();
      
      // Note: Success is handled by onAfterPrint callback in printer hook
    } catch (error: any) {
      setIsPrinting(false);
      console.error('Print failed:', error);
      
      // Check if error indicates printer is missing
      const errorMessage = error?.message || String(error || '').toLowerCase();
      const isPrinterMissing = 
        errorMessage.includes('printer') && 
        (errorMessage.includes('not found') || 
         errorMessage.includes('not available') || 
         errorMessage.includes('missing') ||
         errorMessage.includes('no printer') ||
         errorMessage.includes('device not found'));
      
      if (isPrinterMissing) {
        // Show printer missing error
        const printerError = new Error('Printer Missing');
        onPrintError?.(printerError);
        // Also show alert for immediate feedback
        alert('Printer Missing\n\nPlease connect a printer to your device and try again.');
      } else {
        onPrintError?.(error instanceof Error ? error : new Error('Print failed'));
      }
    }
  }, [currentReceiptData, printer, onPrintSuccess, onPrintError]);

  /**
   * Cancel print dialog
   */
  const cancelPrint = useCallback(() => {
    setShowPrintDialog(false);
    setCurrentReceiptData(null);
    setIsPrinting(false);
  }, []);

  /**
   * Skip printing (close dialog without printing)
   */
  const skipPrint = useCallback(() => {
    setShowPrintDialog(false);
    setCurrentReceiptData(null);
    setIsPrinting(false);
  }, []);

  /**
   * Print directly without showing dialog (for silent printing)
   */
  const printDirectly = useCallback(async (input: PrintReceiptInput) => {
    const dateTime = new Date().toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const receiptData: ReceiptData = {
      storeName,
      storeNameArabic,
      storeUrl,
      posNumber,
      invoiceNumber: input.invoiceNumber,
      dateTime,
      cashier: input.cashier,
      customer: input.customer,
      lineItems: input.lineItems,
      payments: input.payments,
      grossTotal: input.grossTotal,
      itemDiscount: input.itemDiscount,
      netTotal: input.netTotal,
      tendered: input.tendered,
      change: input.change,
      footerText: input.footerText,
    };

    try {
      setIsPrinting(true);
      const receiptHTML = generateReceiptHTML(receiptData);

      printer.print(receiptHTML, {
        printerType: 'thermal',
        paperWidth: '80mm',
        fontSize: '12px',
        margin: '0',
      });

      await printer.executePrint();
    } catch (error) {
      setIsPrinting(false);
      console.error('Direct print failed:', error);
      onPrintError?.(error instanceof Error ? error : new Error('Print failed'));
    }
  }, [storeName, storeNameArabic, storeUrl, posNumber, printer, onPrintError]);

  return {
    // Dialog state
    showPrintDialog,
    isPrinting,
    receiptData: currentReceiptData,

    // Actions
    promptPrintReceipt,
    confirmPrint,
    cancelPrint,
    skipPrint,
    printDirectly,
  };
}
