import React, { useEffect, useRef } from 'react';
import { usePrinter, PrintOptions } from './usePrinter';

export interface PrintPreviewProps {
  children?: React.ReactNode;
  onClose?: () => void;
}

/**
 * Print Preview Component with custom print dialog
 * Shows a preview of content before printing
 * Replaces the default browser print dialog
 */
export function PrintPreview({ children, onClose }: PrintPreviewProps) {
  const { 
    showPreview, 
    currentPrintJob, 
    executePrint, 
    cancelPrint,
    isPrinting 
  } = usePrinter();

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPreview) {
      onClose?.();
    }
  }, [showPreview, onClose]);

  const handlePrint = async () => {
    await executePrint();
  };

  const handleCancel = () => {
    cancelPrint();
    onClose?.();
  };

  if (!showPreview || !currentPrintJob) {
    return null;
  }

  const contentHtml = typeof currentPrintJob.content === 'string'
    ? currentPrintJob.content
    : currentPrintJob.content.innerHTML;

  const printerType = currentPrintJob.options?.printerType || 'a4';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Print Preview</h2>
            <p className="text-sm text-gray-500">
              Printer Type: <span className="font-medium">{printerType === 'thermal' ? 'Thermal Printer' : 'A4 Printer'}</span>
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
            disabled={isPrinting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <div 
            ref={previewRef}
            className="bg-white shadow-md mx-auto p-6"
            style={{
              width: printerType === 'thermal' ? '80mm' : '210mm',
              minHeight: printerType === 'thermal' ? 'auto' : '297mm',
              fontSize: printerType === 'thermal' ? '12px' : '14px'
            }}
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPrinting}
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isPrinting}
          >
            {isPrinting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Printing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

