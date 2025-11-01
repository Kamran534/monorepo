import { useCallback, useState } from 'react';

export type PrinterType = 'thermal' | 'a4';

export interface PrintOptions {
  printerType?: PrinterType;
  paperWidth?: string; // e.g., '80mm' for thermal, '210mm' for A4
  paperHeight?: string;
  fontSize?: string;
  margin?: string;
  orientation?: 'portrait' | 'landscape';
}

export interface UsePrinterOptions {
  defaultPrinterType?: PrinterType;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
  onPrintError?: (error: Error) => void;
  silent?: boolean; // For Electron: print without dialog
}

export interface PrintJobData {
  content: string | HTMLElement;
  options?: PrintOptions;
}

/**
 * Custom hook for printing bills and reports
 * Supports thermal printers (58mm, 80mm) and standard A4 printers
 * Provides a custom print dialog instead of browser default
 */
export function usePrinter({
  defaultPrinterType = 'a4',
  onBeforePrint,
  onAfterPrint,
  onPrintError,
  silent = true // Default to silent printing (works in Electron)
}: UsePrinterOptions = {}) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPrintJob, setCurrentPrintJob] = useState<PrintJobData | null>(null);

  /**
   * Prepare print job and show custom preview dialog
   */
  const print = useCallback((content: string | HTMLElement, options?: PrintOptions) => {
    const printJob: PrintJobData = {
      content,
      options: {
        printerType: defaultPrinterType,
        ...options
      }
    };
    
    setCurrentPrintJob(printJob);
    setShowPreview(true);
  }, [defaultPrinterType]);

  /**
   * Execute the actual print operation
   */
  const executePrint = useCallback(async () => {
    if (!currentPrintJob) return;

    try {
      setIsPrinting(true);
      onBeforePrint?.();

      const { content, options } = currentPrintJob;
      const printerType = options?.printerType || 'a4';

      // Create a hidden iframe for printing
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.top = '-10000px';
      printFrame.style.left = '-10000px';
      document.body.appendChild(printFrame);

      const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (!printDocument) {
        throw new Error('Unable to create print document');
      }

      // Generate print styles based on printer type
      const printStyles = generatePrintStyles(printerType, options);

      // Build the print HTML
      const contentHtml = typeof content === 'string' 
        ? content 
        : content.innerHTML;

      printDocument.open();
      printDocument.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Print</title>
            <style>
              ${printStyles}
            </style>
          </head>
          <body>
            ${contentHtml}
          </body>
        </html>
      `);
      printDocument.close();

      // Wait for content to load
      await new Promise<void>((resolve) => {
        if (printFrame.contentWindow) {
          printFrame.contentWindow.onload = () => resolve();
          // Fallback timeout
          setTimeout(resolve, 100);
        } else {
          resolve();
        }
      });

      // Trigger print
      // Check if running in Electron
      const isElectron = navigator.userAgent.toLowerCase().includes('electron');
      
      if (isElectron && silent && (window as any).electronAPI?.print) {
        // Use Electron's silent print API
        try {
          // Get the full HTML from the iframe
          const fullHtml = printDocument.documentElement.outerHTML;
          
          await (window as any).electronAPI.print({
            silent: true,
            printBackground: true,
            deviceName: '', // Use default printer
            htmlContent: fullHtml,
          });
          
          // Clean up immediately for Electron
          document.body.removeChild(printFrame);
          setIsPrinting(false);
          setShowPreview(false);
          setCurrentPrintJob(null);
          onAfterPrint?.();
          return; // Exit early, no need for browser print
        } catch (err) {
          console.error('Electron print failed, falling back to browser print:', err);
          // Fall through to browser print
        }
      }
      
      // Use browser print (will show dialog)
      printFrame.contentWindow?.print();

      // Cleanup after a delay
      setTimeout(() => {
        document.body.removeChild(printFrame);
        setIsPrinting(false);
        setShowPreview(false);
        setCurrentPrintJob(null);
        onAfterPrint?.();
      }, 500);

    } catch (error) {
      setIsPrinting(false);
      const printError = error instanceof Error ? error : new Error('Print failed');
      onPrintError?.(printError);
      console.error('Print error:', printError);
    }
  }, [currentPrintJob, onBeforePrint, onAfterPrint, onPrintError]);

  /**
   * Cancel the print job
   */
  const cancelPrint = useCallback(() => {
    setShowPreview(false);
    setCurrentPrintJob(null);
    setIsPrinting(false);
  }, []);

  return {
    print,
    executePrint,
    cancelPrint,
    isPrinting,
    showPreview,
    currentPrintJob
  };
}

/**
 * Generate CSS styles based on printer type
 */
function generatePrintStyles(printerType: PrinterType, options?: PrintOptions): string {
  const {
    paperWidth,
    paperHeight,
    fontSize = '12px',
    margin = '0',
    orientation = 'portrait'
  } = options || {};

  if (printerType === 'thermal') {
    // Thermal printer styles (typically 58mm or 80mm width)
    const width = paperWidth || '80mm';
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      @page {
        size: ${width} auto;
        margin: ${margin};
      }
      body {
        font-family: 'Courier New', monospace;
        font-size: ${fontSize};
        line-height: 1.4;
        color: #000;
        background: #fff;
        width: ${width};
        padding: 5mm;
      }
      @media print {
        body {
          width: ${width};
        }
        .no-print {
          display: none !important;
        }
      }
    `;
  } else {
    // A4 printer styles
    const width = paperWidth || '210mm';
    const height = paperHeight || '297mm';
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      @page {
        size: ${width} ${height} ${orientation};
        margin: ${margin || '10mm'};
      }
      body {
        font-family: Arial, sans-serif;
        font-size: ${fontSize};
        line-height: 1.6;
        color: #000;
        background: #fff;
        padding: 10mm;
      }
      @media print {
        .no-print {
          display: none !important;
        }
      }
    `;
  }
}

