# Printer Hook

Custom React hook for printing bills and reports with support for thermal and A4 printers.

## Features

- 🖨️ **Multiple Printer Types**: Support for thermal printers (58mm, 80mm) and standard A4 printers
- 🎯 **Custom Print Dialog**: Beautiful custom preview dialog instead of browser default
- 📄 **Flexible Content**: Print HTML strings or DOM elements
- ⚙️ **Configurable**: Customize paper size, margins, fonts, and orientation
- 🔄 **Lifecycle Hooks**: Before/after print callbacks and error handling

## Installation

The hook is already part of the monorepo. Import it in your app:

```typescript
import { usePrinter, PrintPreview } from '@monorepo/shared-hooks-printer';
```

## Usage

### Basic Example

```tsx
import { usePrinter } from '@monorepo/shared-hooks-printer';

function MyComponent() {
  const { print, showPreview, executePrint, cancelPrint, isPrinting } = usePrinter({
    defaultPrinterType: 'a4',
    onBeforePrint: () => console.log('Starting print...'),
    onAfterPrint: () => console.log('Print completed!'),
    onPrintError: (error) => console.error('Print failed:', error)
  });

  const handlePrint = () => {
    const content = `
      <div style="text-align: center;">
        <h1>Invoice #12345</h1>
        <p>Date: ${new Date().toLocaleDateString()}</p>
        <hr />
        <p>Total: $99.99</p>
      </div>
    `;
    
    print(content, {
      printerType: 'thermal',
      paperWidth: '80mm',
      fontSize: '14px'
    });
  };

  return (
    <div>
      <button onClick={handlePrint}>Print Bill</button>
    </div>
  );
}
```

### With Custom Preview Dialog

```tsx
import { usePrinter } from '@monorepo/shared-hooks-printer';

function BillComponent() {
  const { print } = usePrinter();

  const printBill = () => {
    // Get content from DOM element
    const billElement = document.getElementById('bill-content');
    
    if (billElement) {
      print(billElement, {
        printerType: 'thermal',
        paperWidth: '80mm'
      });
    }
  };

  return (
    <div>
      <div id="bill-content">
        {/* Your bill content here */}
      </div>
      <button onClick={printBill}>Print</button>
    </div>
  );
}
```

## API Reference

### `usePrinter(options)`

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultPrinterType` | `'thermal' \| 'a4'` | `'a4'` | Default printer type |
| `onBeforePrint` | `() => void` | - | Callback before printing starts |
| `onAfterPrint` | `() => void` | - | Callback after printing completes |
| `onPrintError` | `(error: Error) => void` | - | Callback when print fails |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `print` | `(content, options?) => void` | Initiate print with preview |
| `executePrint` | `() => Promise<void>` | Execute the actual print |
| `cancelPrint` | `() => void` | Cancel current print job |
| `isPrinting` | `boolean` | Whether currently printing |
| `showPreview` | `boolean` | Whether preview dialog is shown |
| `currentPrintJob` | `PrintJobData \| null` | Current print job data |

### Print Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `printerType` | `'thermal' \| 'a4'` | `'a4'` | Type of printer |
| `paperWidth` | `string` | `'80mm'` or `'210mm'` | Paper width |
| `paperHeight` | `string` | Auto or `'297mm'` | Paper height |
| `fontSize` | `string` | `'12px'` | Base font size |
| `margin` | `string` | `'0'` or `'10mm'` | Page margins |
| `orientation` | `'portrait' \| 'landscape'` | `'portrait'` | Page orientation |

## Printer Types

### Thermal Printer

Optimized for receipt printers commonly used at cash counters:
- Default width: 80mm (also supports 58mm)
- Auto height based on content
- Monospace font (Courier New)
- Minimal margins for maximum paper usage

### A4 Printer

Standard office printer:
- Size: 210mm × 297mm (A4)
- Sans-serif font (Arial)
- Standard margins (10mm)
- Supports landscape orientation

## Examples

### Thermal Receipt

```tsx
const receiptContent = `
  <div style="text-align: center;">
    <h2>STORE NAME</h2>
    <p style="font-size: 10px;">123 Main St, City</p>
    <hr />
    <table style="width: 100%; font-size: 12px;">
      <tr><td>Item 1</td><td style="text-align: right;">$10.00</td></tr>
      <tr><td>Item 2</td><td style="text-align: right;">$15.00</td></tr>
      <tr style="border-top: 1px dashed #000;">
        <td><strong>Total</strong></td>
        <td style="text-align: right;"><strong>$25.00</strong></td>
      </tr>
    </table>
    <hr />
    <p style="font-size: 10px;">Thank you!</p>
  </div>
`;

print(receiptContent, {
  printerType: 'thermal',
  paperWidth: '80mm',
  fontSize: '12px'
});
```

### A4 Report

```tsx
const reportContent = `
  <div>
    <h1 style="text-align: center; margin-bottom: 20px;">Monthly Report</h1>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    <p><strong>Period:</strong> January 2024</p>
    <hr />
    <h2>Summary</h2>
    <p>Lorem ipsum dolor sit amet...</p>
    <!-- More content -->
  </div>
`;

print(reportContent, {
  printerType: 'a4',
  orientation: 'portrait',
  fontSize: '14px',
  margin: '20mm'
});
```

## Browser Compatibility

### Desktop App (Electron)
- ✅ **Silent Printing** - Prints directly without showing dialog
- ✅ Windows, macOS, Linux
- Uses Electron's native print API

### Web App (Browser)
- ⚠️ **Browser Dialog Required** - For security, browsers always show print dialog
- ✅ Chrome/Edge, Firefox, Safari
- Custom preview dialog shown before browser dialog

**Note:** True silent printing (no dialog) is only possible in the Electron desktop app. Web browsers require user interaction through the print dialog for security reasons.

## Notes

- The print dialog is custom-styled but uses the native browser print API
- For Electron apps, ensure proper print permissions are configured
- Thermal printers work best with monospace fonts
- Test your layouts with actual printers as preview may differ slightly

## Support

For issues or questions, please refer to the main monorepo documentation.

