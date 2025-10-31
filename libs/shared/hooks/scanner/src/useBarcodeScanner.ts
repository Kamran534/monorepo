import { useEffect, useRef, useCallback } from 'react';

export interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
  minLength?: number;
  maxLength?: number;
  endCharacters?: string[];
  scanTimeout?: number;
  preventDefault?: boolean;
}

/**
 * Custom hook for barcode scanner detection
 * Works with all types of barcode scanners that operate as keyboard wedge/HID devices
 * Supports: Code 39, Code 128, EAN-8, EAN-13, UPC-A, UPC-E, QR codes, and more
 */
export function useBarcodeScanner({
  onScan,
  onError,
  minLength = 3,
  maxLength = 100,
  endCharacters = ['\n', '\r', 'Enter'],
  scanTimeout = 100,
  preventDefault = true
}: BarcodeScannerOptions) {
  const bufferRef = useRef<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeypressTimeRef = useRef<number>(0);

  const resetBuffer = useCallback(() => {
    bufferRef.current = [];
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const processBarcode = useCallback((code: string) => {
    if (code.length < minLength) {
      onError?.(`Barcode too short: ${code.length} characters (minimum: ${minLength})`);
      return;
    }

    if (code.length > maxLength) {
      onError?.(`Barcode too long: ${code.length} characters (maximum: ${maxLength})`);
      return;
    }

    onScan(code);
  }, [onScan, onError, minLength, maxLength]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeSinceLastKeypress = currentTime - lastKeypressTimeRef.current;
      lastKeypressTimeRef.current = currentTime;

      // If too much time has passed, reset the buffer (manual typing detection)
      if (timeSinceLastKeypress > scanTimeout * 2 && bufferRef.current.length > 0) {
        resetBuffer();
      }

      // Check if this is an end character
      if (endCharacters.includes(event.key)) {
        if (preventDefault) {
          event.preventDefault();
        }

        const scannedCode = bufferRef.current.join('');
        if (scannedCode.length > 0) {
          processBarcode(scannedCode);
        }
        resetBuffer();
        return;
      }

      // Ignore special keys (Shift, Ctrl, Alt, etc.)
      if (event.key.length > 1 && event.key !== 'Enter') {
        return;
      }

      // Add character to buffer
      bufferRef.current.push(event.key);

      if (preventDefault && bufferRef.current.length > 0) {
        event.preventDefault();
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout to auto-process if no end character is received
      timeoutRef.current = setTimeout(() => {
        const scannedCode = bufferRef.current.join('');
        if (scannedCode.length >= minLength) {
          processBarcode(scannedCode);
        }
        resetBuffer();
      }, scanTimeout);
    };

    // Attach event listener to window
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onScan, onError, minLength, maxLength, endCharacters, scanTimeout, preventDefault, processBarcode, resetBuffer]);

  return { resetBuffer };
}

