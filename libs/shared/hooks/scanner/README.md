# Barcode Scanner Hook

A React hook and component for detecting barcode scanner input from keyboard wedge/HID devices.

## Features

- ✅ Works with all barcode scanner types (Code 39, Code 128, EAN-13, UPC-A, QR codes, etc.)
- ✅ Detects rapid keyboard input from scanner devices
- ✅ Distinguishes between scanner input and manual typing
- ✅ Configurable validation (min/max length)
- ✅ TypeScript support
- ✅ Compact and full UI modes

## Installation

This library is part of the monorepo's shared hooks. Import it in your app:

```typescript
import { useBarcodeScanner, BarcodeScanner } from '@monorepo/shared-hooks-scanner';
```

## Usage

### Using the Hook

```typescript
import { useBarcodeScanner } from '@monorepo/shared-hooks-scanner';

function MyComponent() {
  useBarcodeScanner({
    onScan: (barcode) => {
      console.log('Scanned:', barcode);
    },
    onError: (error) => {
      console.error('Error:', error);
    },
    minLength: 3,
    maxLength: 200,
    scanTimeout: 100,
    preventDefault: true
  });

  return <div>Ready to scan...</div>;
}
```

### Using the Component

```typescript
import { BarcodeScanner } from '@monorepo/shared-hooks-scanner';

function MyApp() {
  return (
    <div>
      {/* Compact mode for embedding */}
      <BarcodeScanner compact={true} />
      
      {/* Full mode for dedicated page */}
      <BarcodeScanner compact={false} />
    </div>
  );
}
```

## Configuration

### BarcodeScannerOptions

- `onScan: (barcode: string) => void` - Callback when barcode is successfully scanned
- `onError?: (error: string) => void` - Callback when validation error occurs
- `minLength?: number` - Minimum barcode length (default: 3)
- `maxLength?: number` - Maximum barcode length (default: 100)
- `endCharacters?: string[]` - Characters that end scanning (default: ['\n', '\r', 'Enter'])
- `scanTimeout?: number` - Timeout in ms to detect scanner vs keyboard (default: 100)
- `preventDefault?: boolean` - Prevent default keyboard actions (default: true)

## How It Works

The hook listens for rapid keyboard input that indicates a barcode scanner (HID device):

1. Buffers incoming keystrokes
2. Measures time between keystrokes (scanners are faster than humans)
3. Detects end characters (Enter/newline)
4. Validates and processes the barcode
5. Resets for next scan

## Supported Barcode Types

- EAN-13, EAN-8
- UPC-A, UPC-E
- Code 39, Code 128
- QR Codes
- Data Matrix
- And more...

