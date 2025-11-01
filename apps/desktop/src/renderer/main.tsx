import { createRoot } from 'react-dom/client';
import './styles.css';
import { NxWelcome } from './nx-welcome.tsx';
import { BarcodeScanner } from '@monorepo/shared-hooks-scanner';
import { useEffect, useState } from 'react';
import { getDatabase, DatabaseError } from '@monorepo/db';
import { useKeyboardShortcuts } from '@monorepo/shared-hooks-keyboard-shortcuts';
import { usePrinter } from '@monorepo/shared-hooks-printer';

function App() {
  const [showKeysWindow, setShowKeysWindow] = useState(false);

  // Register keyboard shortcuts
  const { getShortcuts, formatShortcut } = useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'a',
        ctrl: true,
        description: 'View All Keys Window',
        action: () => {
          setShowKeysWindow(prev => !prev);
          console.log('Ctrl+A pressed - Toggle All Keys Window');
        },
      },
      {
        key: 's',
        ctrl: true,
        shift: true,
        description: 'Open Settings',
        action: () => {
          console.log('Ctrl+Shift+S pressed - Open Settings');
          alert('Settings window would open here');
        },
      },
    ],
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Keyboard Shortcuts Window */}
      {showKeysWindow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowKeysWindow(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowKeysWindow(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              {getShortcuts().map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <span className="text-gray-700">{shortcut.description}</span>
                  <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
                    {formatShortcut(shortcut)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1">
        <NxWelcome title="desktop" />
      </div>
      
      {/* Tailwind Verification Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-center">
            <span role="img" aria-label="sparkles">✨</span> Tailwind CSS is Working! (Desktop App)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 hover:bg-white/20 transition-all">
              <div className="text-3xl mb-2">
                <span role="img" aria-label="art palette">🎨</span>
              </div>
              <h3 className="font-semibold mb-1">Colors</h3>
              <p className="text-sm opacity-90">Gradient backgrounds working</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 hover:bg-white/20 transition-all">
              <div className="text-3xl mb-2">
                <span role="img" aria-label="mobile phone">📱</span>
              </div>
              <h3 className="font-semibold mb-1">Responsive</h3>
              <p className="text-sm opacity-90">Grid layout adapts</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 hover:bg-white/20 transition-all">
              <div className="text-3xl mb-2">
                <span role="img" aria-label="lightning">⚡</span>
              </div>
              <h3 className="font-semibold mb-1">Utilities</h3>
              <p className="text-sm opacity-90">All classes active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Section */}
      <BarcodeScanner compact={true} />

      {/* Printer Test Section */}
      <PrinterTestSection />

      {/* SQLite (Electron) status & counter */}
      <DbStatus />
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}

function PrinterTestSection() {
  const { print, showPreview, executePrint, cancelPrint, isPrinting, currentPrintJob } = usePrinter({
    defaultPrinterType: 'a4',
    onBeforePrint: () => console.log('[Desktop] Starting print...'),
    onAfterPrint: () => console.log('[Desktop] Print completed!'),
    onPrintError: (error) => console.error('[Desktop] Print error:', error)
  });

  const [selectedPrinterType, setSelectedPrinterType] = useState<'thermal' | 'a4'>('thermal');

  const sampleBillContent = `
    <div style="text-align: center; font-family: 'Courier New', monospace;">
      <h2 style="margin: 10px 0;">STORE NAME</h2>
      <p style="font-size: 11px; margin: 5px 0;">123 Main Street, City, State</p>
      <p style="font-size: 11px; margin: 5px 0;">Tel: (555) 123-4567</p>
      <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;" />
      <p style="text-align: left; font-size: 12px; margin: 10px 0;">
        <strong>Date:</strong> ${new Date().toLocaleDateString()}<br/>
        <strong>Time:</strong> ${new Date().toLocaleTimeString()}<br/>
        <strong>Bill #:</strong> INV-${Math.floor(Math.random() * 10000)}
      </p>
      <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;" />
      <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th style="text-align: left; padding: 5px 0;">Item</th>
            <th style="text-align: center; padding: 5px 0;">Qty</th>
            <th style="text-align: right; padding: 5px 0;">Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 5px 0;">Coffee</td>
            <td style="text-align: center;">2</td>
            <td style="text-align: right;">$6.00</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">Sandwich</td>
            <td style="text-align: center;">1</td>
            <td style="text-align: right;">$8.50</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">Juice</td>
            <td style="text-align: center;">1</td>
            <td style="text-align: right;">$4.00</td>
          </tr>
        </tbody>
      </table>
      <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;" />
      <table style="width: 100%; font-size: 13px;">
        <tr>
          <td style="text-align: left; padding: 3px 0;">Subtotal:</td>
          <td style="text-align: right; padding: 3px 0;">$18.50</td>
        </tr>
        <tr>
          <td style="text-align: left; padding: 3px 0;">Tax (10%):</td>
          <td style="text-align: right; padding: 3px 0;">$1.85</td>
        </tr>
        <tr style="border-top: 1px solid #000;">
          <td style="text-align: left; padding: 5px 0;"><strong>TOTAL:</strong></td>
          <td style="text-align: right; padding: 5px 0;"><strong>$20.35</strong></td>
        </tr>
      </table>
      <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;" />
      <p style="font-size: 11px; margin: 10px 0;">Payment Method: Cash</p>
      <p style="font-size: 11px; margin: 10px 0;">
        <strong>Thank you for your business!</strong><br/>
        Please come again
      </p>
      <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;" />
      <p style="font-size: 10px; margin: 5px 0;">Powered by PayFlow POS</p>
    </div>
  `;

  const sampleReportContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0 0 10px 0; color: #333;">Sales Report</h1>
        <p style="color: #666; margin: 0;">Monthly Summary - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Report Time:</strong> ${new Date().toLocaleTimeString()}</p>
        <p><strong>Store Location:</strong> Main Branch</p>
      </div>

      <hr style="border: none; border-top: 2px solid #333; margin: 20px 0;" />

      <h2 style="color: #333; font-size: 18px; margin: 20px 0 10px 0;">Summary</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px 0;"><strong>Total Sales:</strong></td>
          <td style="text-align: right; padding: 10px 0;">$12,450.00</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px 0;"><strong>Number of Transactions:</strong></td>
          <td style="text-align: right; padding: 10px 0;">247</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px 0;"><strong>Average Transaction:</strong></td>
          <td style="text-align: right; padding: 10px 0;">$50.40</td>
        </tr>
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px 0;"><strong>Refunds:</strong></td>
          <td style="text-align: right; padding: 10px 0; color: #d00;">-$125.00</td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <td style="padding: 10px 0;"><strong>Net Sales:</strong></td>
          <td style="text-align: right; padding: 10px 0;"><strong>$12,325.00</strong></td>
        </tr>
      </table>

      <h2 style="color: #333; font-size: 18px; margin: 20px 0 10px 0;">Top Products</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #333; color: white;">
            <th style="text-align: left; padding: 8px;">Product</th>
            <th style="text-align: center; padding: 8px;">Sold</th>
            <th style="text-align: right; padding: 8px;">Revenue</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px;">Coffee (Large)</td>
            <td style="text-align: center; padding: 8px;">156</td>
            <td style="text-align: right; padding: 8px;">$624.00</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px;">Sandwich Combo</td>
            <td style="text-align: center; padding: 8px;">98</td>
            <td style="text-align: right; padding: 8px;">$882.00</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px;">Fresh Juice</td>
            <td style="text-align: center; padding: 8px;">84</td>
            <td style="text-align: right; padding: 8px;">$420.00</td>
          </tr>
        </tbody>
      </table>

      <hr style="border: none; border-top: 2px solid #333; margin: 30px 0 20px 0;" />
      
      <div style="text-align: center; color: #666; font-size: 12px;">
        <p>This report is confidential and intended for internal use only.</p>
        <p style="margin-top: 10px;">Generated by PayFlow POS System</p>
      </div>
    </div>
  `;

  const handlePrintBill = () => {
    print(sampleBillContent, {
      printerType: selectedPrinterType,
      paperWidth: selectedPrinterType === 'thermal' ? '80mm' : '210mm',
      fontSize: selectedPrinterType === 'thermal' ? '12px' : '14px',
      margin: selectedPrinterType === 'thermal' ? '5mm' : '20mm'
    });
  };

  const handlePrintReport = () => {
    print(sampleReportContent, {
      printerType: 'a4',
      paperWidth: '210mm',
      paperHeight: '297mm',
      fontSize: '14px',
      margin: '20mm',
      orientation: 'portrait'
    });
  };

  return (
    <>
      {/* Custom Print Preview Dialog */}
      {showPreview && currentPrintJob && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Print Preview</h2>
                <p className="text-sm text-gray-500">
                  Printer Type: <span className="font-medium">
                    {currentPrintJob.options?.printerType === 'thermal' ? 'Thermal Printer (80mm)' : 'A4 Printer'}
                  </span>
                </p>
              </div>
              <button
                onClick={cancelPrint}
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
                className="bg-white shadow-md mx-auto p-6"
                style={{
                  width: currentPrintJob.options?.printerType === 'thermal' ? '80mm' : '210mm',
                  minHeight: currentPrintJob.options?.printerType === 'thermal' ? 'auto' : '297mm',
                  fontSize: currentPrintJob.options?.fontSize || '14px'
                }}
                dangerouslySetInnerHTML={{ 
                  __html: typeof currentPrintJob.content === 'string' 
                    ? currentPrintJob.content 
                    : currentPrintJob.content.innerHTML 
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={cancelPrint}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isPrinting}
              >
                Cancel
              </button>
              <button
                onClick={executePrint}
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
      )}

      {/* Printer Test UI */}
      <div className="border-t p-6 bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-800">Printer Test Section (Desktop App)</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Test printing functionality with sample bills and reports. Uses custom print preview dialog.
          </p>

          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            {/* Printer Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Printer Type for Bill:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="printerType"
                    value="thermal"
                    checked={selectedPrinterType === 'thermal'}
                    onChange={(e) => setSelectedPrinterType(e.target.value as 'thermal' | 'a4')}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">Thermal Printer (80mm)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="printerType"
                    value="a4"
                    checked={selectedPrinterType === 'a4'}
                    onChange={(e) => setSelectedPrinterType(e.target.value as 'thermal' | 'a4')}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">A4 Printer (210mm)</span>
                </label>
              </div>
            </div>

            {/* Print Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handlePrintBill}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Print Sample Bill
              </button>

              <button
                onClick={handlePrintReport}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Print Sample Report (A4)
              </button>
            </div>

            {/* Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">Desktop App Features:</p>
                  <ul className="list-disc list-inside space-y-1 text-green-700">
                    <li><strong>Silent Printing</strong> - Prints directly without dialog!</li>
                    <li>Custom print preview dialog (Electron-powered)</li>
                    <li>Support for thermal printers (58mm, 80mm) and A4 printers</li>
                    <li>Optimized layouts for different printer types</li>
                    <li>Real-time preview before printing</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DbStatus() {
  const db = getDatabase();
  const [connected, setConnected] = useState(false);
  const [count, setCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeDatabase = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await db.connect();
        
        if (!isMounted) return;
        
        const counter = await db.getCounter();
        setConnected(true);
        setCount(counter);
      } catch (err) {
        if (!isMounted) return;
        
        const errorMessage = err instanceof DatabaseError 
          ? err.message 
          : err instanceof Error 
          ? err.message 
          : 'Failed to connect to database';
        
        setError(errorMessage);
        setConnected(false);
        console.error('[DbStatus] Connection error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeDatabase();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleIncrement = async () => {
    if (isLoading || !connected) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const newCount = await db.increment();
      setCount(newCount);
    } catch (err) {
      const errorMessage = err instanceof DatabaseError 
        ? err.message 
        : err instanceof Error 
        ? err.message 
        : 'Failed to increment counter';
      
      setError(errorMessage);
      console.error('[DbStatus] Increment error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecrement = async () => {
    if (isLoading || !connected) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const newCount = await db.decrement();
      setCount(newCount);
    } catch (err) {
      const errorMessage = err instanceof DatabaseError 
        ? err.message 
        : err instanceof Error 
        ? err.message 
        : 'Failed to decrement counter';
      
      setError(errorMessage);
      console.error('[DbStatus] Decrement error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t p-4 mt-6 bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm text-gray-600">Database</div>
            <div className="font-semibold">
              {isLoading && !connected ? 'Connecting…' : 
               error ? 'Connection failed' : 
               connected ? 'SQLite connected successfully' : 
               'Not connected'}
            </div>
            {error && (
              <div className="text-sm text-red-600 mt-1" role="alert">
                {error}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors" 
              onClick={handleDecrement}
              disabled={isLoading || !connected}
              aria-label="Decrement counter"
            >
              -
            </button>
            <div className="min-w-10 text-center font-mono">{count}</div>
            <button 
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors" 
              onClick={handleIncrement}
              disabled={isLoading || !connected}
              aria-label="Increment counter"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
