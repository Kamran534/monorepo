import { useState, useCallback, useRef } from 'react';
import { usePrinter } from '@monorepo/shared-hooks-printer';
import { ReceiptData, generateReceiptHTML } from './ReceiptTemplate.js';
import { LineItem } from './LineItemEditor.js';
import { Payment } from './PaymentPanel.js';
import { Customer } from './CustomerSelector.js';

// html2pdf.js will be imported dynamically when needed (web only)

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
  orderNumber?: string;
  orderId?: string;
  orderDate?: string;
  lineItems: LineItem[];
  payments: Payment[];
  customer?: Customer;
  cashier?: string;
  grossTotal: number;
  itemDiscount: number;
  taxAmount?: number;
  adjustmentAmount?: number;
  netTotal: number;
  tendered: number;
  change: number;
  footerText?: string[];
  theme?: 'light' | 'dark';
}

/**
 * Custom hook for printing receipts with confirmation dialog
 * Integrates the printer hook with the print confirmation dialog
 */
export function usePrintReceipt({
  storeName = 'Trade Unleashed',
  storeNameArabic = 'التجارة المنطلِقة',
  storeUrl = 'http://www.tradeUnleashed.com',
  posNumber = 'TRADE UNLEASHED',
  onPrintSuccess,
  onPrintError,
}: UsePrintReceiptOptions = {}) {
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [currentReceiptData, setCurrentReceiptData] = useState<ReceiptData | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  // Use ref to store receipt data immediately (for synchronous access)
  const receiptDataRef = useRef<ReceiptData | null>(null);

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
      orderNumber: input.orderNumber ?? input.invoiceNumber,
      orderId: input.orderId ?? input.invoiceNumber,
      dateTime,
      cashier: input.cashier,
      customer: input.customer,
      lineItems: input.lineItems,
      payments: input.payments,
      grossTotal: input.grossTotal,
      itemDiscount: input.itemDiscount,
      taxAmount: input.taxAmount ?? 0,
      adjustmentAmount: input.adjustmentAmount ?? 0,
      netTotal: input.netTotal,
      tendered: input.tendered,
      change: input.change,
      footerText: input.footerText,
      theme: input.theme,
      orderDateIso: input.orderDate,
    };

    // Store in ref immediately for synchronous access
    receiptDataRef.current = receiptData;
    setCurrentReceiptData(receiptData);
    setShowPrintDialog(true);
    
    // Return a promise that resolves when data is set (for immediate printing)
    return Promise.resolve(receiptData);
  }, [storeName, storeNameArabic, storeUrl, posNumber]);

  /**
   * Confirm and execute print
   */
  const confirmPrint = useCallback(async () => {
    // Use ref data if state data is not available yet (handles timing issues)
    const receiptData = currentReceiptData || receiptDataRef.current;
    if (!receiptData) {
      console.error('No receipt data available');
      return;
    }

    try {
      // Close dialog immediately to avoid showing "Preparing receipt..." state
      setShowPrintDialog(false);
      setIsPrinting(true);
      
      // Generate receipt HTML
      const receiptHTML = generateReceiptHTML(receiptData);

      if (!receiptHTML || receiptHTML.trim().length === 0) {
        throw new Error('Failed to generate receipt HTML');
      }

      // Check if we're in Electron
      const isElectron = navigator.userAgent.toLowerCase().includes('electron');
      
      // Auto-save PDF first (for both Electron and web)
      const orderDateIso = receiptData.orderDateIso || new Date().toISOString();

      if (isElectron && (window as any).electronAPI?.savePDF) {
        try {
          // Auto-save PDF without system dialog
          const orderId =
            receiptData.orderNumber ||
            receiptData.orderId ||
            receiptData.invoiceNumber ||
            `order-${Date.now()}`;
          const pdfResult = await (window as any).electronAPI.savePDF({
            htmlContent: receiptHTML,
            orderId: orderId,
            orderDate: orderDateIso,
          });
          if (pdfResult?.success) {
            console.log('[usePrintReceipt] PDF saved successfully to:', pdfResult.path);
          } else {
            console.error('[usePrintReceipt] PDF save failed:', pdfResult?.error);
          }
        } catch (pdfError) {
          // Log but don't fail the print if PDF save fails
          console.error('[usePrintReceipt] Failed to save PDF:', pdfError);
        }
      }
      
      if (isElectron && (window as any).electronAPI?.print) {
        // Direct print for Electron - bypass preview, completely silent
        // Only attempt if printers are available (checked in main process)
        try {
          // console.log('[usePrintReceipt] Attempting to print via Electron API...');
          const result = await (window as any).electronAPI.print({
            silent: true, // Force silent - no dialogs
            printBackground: true,
            deviceName: '', // Use default printer
            htmlContent: receiptHTML,
          });
          
          // console.log('[usePrintReceipt] Print result:', result);
          
          // Success - PDF is saved and print attempted (or skipped if no printer)
          // Always complete successfully - PDF is already saved
          setIsPrinting(false);
          setCurrentReceiptData(null);
          onPrintSuccess?.();
          return;
        } catch (err: any) {
          // Don't show errors - PDF is already saved
          // Just complete the process silently
          console.error('[usePrintReceipt] Electron print error (silent):', err);
          setIsPrinting(false);
          receiptDataRef.current = null;
          setCurrentReceiptData(null);
          onPrintSuccess?.();
          return;
        }
      }
      
      // For web browser - use same flow as desktop: save PDF first, then print
      if (!isElectron) {
        try {
          const orderId =
            receiptData.orderNumber ||
            receiptData.orderId ||
            receiptData.invoiceNumber ||
            `order-${Date.now()}`;
          const date = new Date().toISOString().split('T')[0];
          const filename = `${orderId}.pdf`; // Same filename format as desktop: orderId.pdf

          // Step 1: Save PDF (same as desktop app flow)
          // Use html2pdf.js to generate PDF and auto-download (web equivalent of savePDF)
          try {
            const html2pdfModule = await import('html2pdf.js');
            const html2pdf = html2pdfModule.default || html2pdfModule;

            // Use an iframe to properly render the full HTML document (same as desktop)
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.style.top = '0';
            iframe.style.width = '80mm';
            iframe.style.height = '297mm';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);

            // Write the full HTML to iframe
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) {
              throw new Error('Unable to create iframe document');
            }

            iframeDoc.open();
            iframeDoc.write(receiptHTML);
            iframeDoc.close();

            // Wait for iframe content to fully load (same timing as desktop)
            await new Promise<void>((resolve) => {
              if (iframe.contentWindow) {
                iframe.contentWindow.onload = () => resolve();
                setTimeout(resolve, 500); // Same 500ms delay as desktop
              } else {
                setTimeout(resolve, 500);
              }
            });

            // Get the body element from iframe
            const iframeBody = iframeDoc.body;
            if (!iframeBody) {
              throw new Error('Iframe body not found');
            }

            // Generate PDF with same settings as desktop (80mm thermal printer format)
            const opt = {
              margin: [0, 0, 0, 0] as [number, number, number, number],
              filename: filename,
              image: { 
                type: 'jpeg' as const, 
                quality: 1.0
              },
              html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true,
                backgroundColor: '#ffffff',
                width: 302, // 80mm at 96 DPI
                windowWidth: 302,
                allowTaint: false,
              },
              jsPDF: { 
                unit: 'mm' as const, 
                format: [80, 297] as [number, number], // Same 80mm format as desktop
                orientation: 'portrait' as const,
                compress: true,
              },
            };

            // Save PDF (auto-download) - web equivalent of desktop's savePDF
            await html2pdf()
              .set(opt)
              .from(iframeBody)
              .outputPdf('blob')
              .then((pdfBlob: Blob) => {
                // Auto-download PDF (web equivalent of saving to assets/bills/date/)
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              })
              .finally(() => {
                // Clean up iframe
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
              });

            // Step 2: Attempt to print (same as desktop app flow)
            // Check if printers are available (web equivalent of desktop's printer check)
            try {
              // Use browser's print API (silent if possible)
              // Create a hidden window for printing (similar to desktop's BrowserWindow)
              const printWindow = window.open('', '_blank', 'width=1,height=1');
              if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(receiptHTML);
                printWindow.document.close();
                
                // Wait for content to load (same timing as desktop)
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Attempt to print silently (browser may show dialog, but we try)
                printWindow.print();
                
                // Close window after print attempt
                setTimeout(() => {
                  printWindow.close();
                }, 1000);
              }
            } catch (printError) {
              // Print failed - but PDF is already saved (same behavior as desktop)
              // Just log and continue - PDF is already downloaded
              console.error('[usePrintReceipt] Web print error (silent):', printError);
            }

            // Store bill metadata in IndexedDB (web equivalent of desktop's file system tracking)
            try {
              const dbName = 'PayFlowBills';
              const dbVersion = 1;
              const request = indexedDB.open(dbName, dbVersion);
              
              request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('bills')) {
                  db.createObjectStore('bills', { keyPath: 'orderId' });
                }
              };
              
              request.onsuccess = (event: any) => {
                const db = event.target.result;
                const transaction = db.transaction(['bills'], 'readwrite');
                const store = transaction.objectStore('bills');
                store.put({
                  orderId: orderId,
                  invoiceNumber: receiptData.invoiceNumber,
                  date: date,
                  filename: filename,
                  savedAt: new Date().toISOString(),
                  downloadPath: 'Browser Downloads Folder',
                });
              };
            } catch (dbError) {
              // IndexedDB storage is optional
              console.error('[usePrintReceipt] IndexedDB error (optional):', dbError);
            }

            // Complete the process (same as desktop)
            setIsPrinting(false);
            setCurrentReceiptData(null);
            onPrintSuccess?.();
            return;
          } catch (importError) {
            // If html2pdf.js import fails, just complete silently (same as desktop)
            console.error('[usePrintReceipt] html2pdf.js not available:', importError);
            setIsPrinting(false);
            setCurrentReceiptData(null);
            onPrintSuccess?.();
            return;
          }
        } catch (webError) {
          // Complete anyway (same as desktop - PDF save might have failed, but don't block)
          console.error('[usePrintReceipt] Web PDF/Print error:', webError);
          setIsPrinting(false);
          setCurrentReceiptData(null);
          onPrintSuccess?.();
          return;
        }
      }
      
      // If not Electron, or Electron print API not available, just complete
      // PDF is already saved (for Electron), no need to print
      setIsPrinting(false);
      setShowPrintDialog(false);
      setCurrentReceiptData(null);
      onPrintSuccess?.();
    } catch (error: any) {
      // Don't show any errors or dialogs - PDF is already saved
      // Just complete silently
      console.error('[usePrintReceipt] Error (silent):', error);
      setIsPrinting(false);
      setShowPrintDialog(false);
      setCurrentReceiptData(null);
      onPrintSuccess?.();
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
