import { useState } from 'react';
import { useBarcodeScanner } from './useBarcodeScanner';

interface ScanHistory {
  id: string;
  barcode: string;
  timestamp: Date;
  type?: string;
}

interface BarcodeScannerProps {
  compact?: boolean;
}

export function BarcodeScanner({ compact = false }: BarcodeScannerProps) {
  const [currentBarcode, setCurrentBarcode] = useState<string>('');
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [error, setError] = useState<string>('');
  const [scanCount, setScanCount] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Detect barcode type based on pattern
  const detectBarcodeType = (barcode: string): string => {
    const length = barcode.length;
    
    if (/^\d{13}$/.test(barcode)) return 'EAN-13';
    if (/^\d{12}$/.test(barcode)) return 'UPC-A';
    if (/^\d{8}$/.test(barcode)) return 'EAN-8';
    if (/^\d{6}$/.test(barcode)) return 'UPC-E';
    if (length >= 1 && length <= 43) return 'Code 39/128';
    if (length > 43) return 'QR Code / Data Matrix';
    
    return 'Unknown';
  };

  const handleScan = (barcode: string) => {
    setIsScanning(true);
    setCurrentBarcode(barcode);
    setError('');
    setScanCount(prev => prev + 1);

    // Add to history
    const newScan: ScanHistory = {
      id: Date.now().toString(),
      barcode,
      timestamp: new Date(),
      type: detectBarcodeType(barcode)
    };

    setScanHistory(prev => [newScan, ...prev].slice(0, compact ? 5 : 20));

    // Reset scanning indicator after animation
    setTimeout(() => setIsScanning(false), 500);
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    setTimeout(() => setError(''), 3000);
  };

  useBarcodeScanner({
    onScan: handleScan,
    onError: handleError,
    minLength: 3,
    maxLength: 200,
    scanTimeout: 100,
    preventDefault: true
  });

  const clearHistory = () => {
    setScanHistory([]);
    setCurrentBarcode('');
    setScanCount(0);
    setError('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Visual feedback
      const button = document.activeElement as HTMLElement;
      if (button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
          button.style.transform = 'scale(1)';
        }, 100);
      }
    });
  };

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-3 text-center flex items-center justify-center gap-2">
            <span>🔍</span> Barcode Scanner
          </h2>
          
          {/* Current Scan Display */}
          <div className={`bg-white/20 backdrop-blur rounded-lg p-3 mb-3 transition-all ${isScanning ? 'ring-2 ring-white' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">{isScanning ? '⚡' : '📦'}</div>
              <div className="flex-1 min-w-0">
                <label className="text-xs uppercase tracking-wide opacity-90 block mb-1">Current Scan:</label>
                <div className="bg-white/10 rounded px-3 py-2 font-mono text-sm break-all">
                  {currentBarcode || 'Waiting for scan...'}
                </div>
              </div>
              {currentBarcode && (
                <button 
                  className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded transition-all"
                  onClick={() => copyToClipboard(currentBarcode)}
                  title="Copy to clipboard"
                >
                  📋
                </button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500 text-white px-3 py-2 rounded-lg mb-3 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Stats and History */}
          <div className="flex gap-3 items-center mb-3">
            <div className="flex gap-2 items-center text-sm">
              <span className="opacity-90">Scans:</span>
              <span className="bg-white/20 px-2 py-1 rounded font-bold">{scanCount}</span>
            </div>
            <div className="flex gap-2 items-center text-sm">
              <span className="opacity-90">History:</span>
              <span className="bg-white/20 px-2 py-1 rounded font-bold">{scanHistory.length}</span>
            </div>
            {scanHistory.length > 0 && (
              <button 
                className="ml-auto bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm transition-all"
                onClick={clearHistory}
              >
                🗑️ Clear
              </button>
            )}
          </div>

          {/* Compact History List */}
          {scanHistory.length > 0 && (
            <div className="space-y-2">
              {scanHistory.slice(0, 3).map((scan, index) => (
                <div key={scan.id} className="bg-white/10 backdrop-blur rounded p-2 flex items-center gap-2 text-sm">
                  <div className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {scanCount - index}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold truncate">{scan.barcode}</div>
                    <div className="text-xs opacity-75">{scan.type}</div>
                  </div>
                  <button 
                    className="bg-white/10 hover:bg-white/20 w-8 h-8 rounded flex items-center justify-center transition-all flex-shrink-0"
                    onClick={() => copyToClipboard(scan.barcode)}
                    title="Copy"
                  >
                    📋
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full version (original component)
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
          🔍 Barcode Scanner
        </h1>
        <p className="text-gray-600">Ready to scan - Point your scanner and scan any barcode</p>
      </div>

      {/* Current Scan Display */}
      <div className={`bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 mb-4 flex items-center gap-4 transition-all ${isScanning ? 'shadow-2xl scale-105' : 'shadow-lg'}`}>
        <div className="text-5xl">{isScanning ? '⚡' : '📦'}</div>
        <div className="flex-1">
          <label className="text-white text-sm uppercase tracking-wide opacity-90 block mb-2">Current Scan:</label>
          <div className="bg-white/20 backdrop-blur border-2 border-white/30 rounded-xl p-4 text-white font-mono text-xl font-bold break-all min-h-[60px] flex items-center">
            {currentBarcode || 'Waiting for scan...'}
          </div>
          {currentBarcode && (
            <button 
              className="mt-3 bg-white/20 border-2 border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all"
              onClick={() => copyToClipboard(currentBarcode)}
            >
              📋 Copy
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500 text-white px-4 py-3 rounded-xl mb-4 shadow-lg">
          ⚠️ {error}
        </div>
      )}

      {/* Stats */}
      <div className="bg-gray-100 rounded-xl p-4 mb-6 flex gap-4 items-center">
        <div className="flex gap-2 items-center">
          <span className="text-gray-600 font-semibold text-sm">Total Scans:</span>
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded-full font-bold text-sm">
            {scanCount}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-gray-600 font-semibold text-sm">History:</span>
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded-full font-bold text-sm">
            {scanHistory.length}
          </span>
        </div>
        {scanHistory.length > 0 && (
          <button 
            className="ml-auto bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all"
            onClick={clearHistory}
          >
            🗑️ Clear All
          </button>
        )}
      </div>

      {/* Scan History */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Scan History</h2>
        {scanHistory.length === 0 ? (
          <div className="text-center py-12 bg-gray-100 rounded-xl">
            <p className="text-gray-600 mb-4">No scans yet. Start scanning barcodes!</p>
            <div className="text-left max-w-md mx-auto">
              <p className="font-semibold mb-2">Supported Types:</p>
              <div className="grid grid-cols-2 gap-2">
                {['EAN-13, EAN-8', 'UPC-A, UPC-E', 'Code 39, Code 128', 'QR Codes', 'Data Matrix', 'And more...'].map((type, i) => (
                  <div key={i} className="bg-white p-2 rounded text-sm">{type}</div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {scanHistory.map((scan, index) => (
              <div key={scan.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-purple-500 hover:shadow-lg transition-all">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  #{scanCount - index}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-bold text-lg break-all">{scan.barcode}</div>
                  <div className="flex gap-3 text-xs text-gray-600 mt-1">
                    <span className="bg-gray-200 px-2 py-1 rounded">{scan.type}</span>
                    <span>{scan.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
                <button 
                  className="bg-gray-100 border-2 border-gray-200 w-10 h-10 rounded-lg hover:bg-purple-500 hover:border-purple-500 hover:text-white transition-all flex items-center justify-center flex-shrink-0"
                  onClick={() => copyToClipboard(scan.barcode)}
                  title="Copy"
                >
                  📋
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

