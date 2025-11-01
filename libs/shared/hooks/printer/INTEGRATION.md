# Printer Hook Integration Guide

This guide will help you integrate the printer functionality into your app.

## Quick Start

The printer hook has already been integrated into both the **web** and **desktop** apps. You can see working examples in the "Printer Test Section" at the bottom of each app.

## Installation

No installation required - the hook is part of the monorepo!

## Basic Usage

### 1. Import the Hook

```typescript
import { usePrinter } from '@monorepo/shared-hooks-printer';
```

### 2. Initialize in Your Component

```typescript
function MyComponent() {
  const { 
    print, 
    showPreview, 
    executePrint, 
    cancelPrint, 
    isPrinting,
    currentPrintJob 
  } = usePrinter({
    defaultPrinterType: 'thermal', // or 'a4'
    onBeforePrint: () => console.log('Starting print...'),
    onAfterPrint: () => console.log('Print completed!'),
    onPrintError: (error) => console.error('Print failed:', error)
  });

  // Your component logic...
}
```

### 3. Create Print Content

You can print either HTML strings or DOM elements:

#### Option A: HTML String

```typescript
const billContent = `
  <div style="text-align: center;">
    <h2>Invoice #12345</h2>
    <p>Date: ${new Date().toLocaleDateString()}</p>
    <hr />
    <p>Total: $99.99</p>
  </div>
`;

print(billContent, {
  printerType: 'thermal',
  paperWidth: '80mm'
});
```

#### Option B: DOM Element

```typescript
const printDiv = () => {
  const element = document.getElementById('invoice');
  if (element) {
    print(element, {
      printerType: 'a4'
    });
  }
};
```

### 4. Implement Custom Print Dialog

```tsx
return (
  <>
    {/* Your print button */}
    <button onClick={handlePrint}>Print Bill</button>

    {/* Custom print dialog */}
    {showPreview && currentPrintJob && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl">
          <h2>Print Preview</h2>
          
          {/* Preview content */}
          <div dangerouslySetInnerHTML={{ 
            __html: typeof currentPrintJob.content === 'string' 
              ? currentPrintJob.content 
              : currentPrintJob.content.innerHTML 
          }} />
          
          {/* Actions */}
          <button onClick={cancelPrint}>Cancel</button>
          <button onClick={executePrint} disabled={isPrinting}>
            {isPrinting ? 'Printing...' : 'Print'}
          </button>
        </div>
      </div>
    )}
  </>
);
```

## Printer Types

### Thermal Printer (Receipt Printer)

Best for cash counters, POS systems, and receipts:

```typescript
print(content, {
  printerType: 'thermal',
  paperWidth: '80mm',  // Common: 58mm or 80mm
  fontSize: '12px',
  margin: '5mm'
});
```

**Features:**
- Monospace font (Courier New)
- Auto-height based on content
- Optimized for narrow paper
- Minimal margins

**Use Cases:**
- Sales receipts
- Order tickets
- Queue numbers
- Short invoices

### A4 Printer (Standard Office Printer)

Best for reports, invoices, and documents:

```typescript
print(content, {
  printerType: 'a4',
  paperWidth: '210mm',
  paperHeight: '297mm',
  fontSize: '14px',
  margin: '20mm',
  orientation: 'portrait' // or 'landscape'
});
```

**Features:**
- Sans-serif font (Arial)
- Standard A4 size
- Normal margins
- Portrait/landscape support

**Use Cases:**
- Detailed invoices
- Sales reports
- Financial statements
- Multi-page documents

## Advanced Options

### Print Options Reference

```typescript
interface PrintOptions {
  printerType?: 'thermal' | 'a4';
  paperWidth?: string;      // e.g., '80mm', '210mm'
  paperHeight?: string;     // e.g., 'auto', '297mm'
  fontSize?: string;        // e.g., '12px', '14px'
  margin?: string;          // e.g., '5mm', '20mm'
  orientation?: 'portrait' | 'landscape';
}
```

### Lifecycle Callbacks

```typescript
usePrinter({
  onBeforePrint: () => {
    // Disable UI, show loading, etc.
    console.log('Preparing to print...');
  },
  onAfterPrint: () => {
    // Re-enable UI, show success message
    console.log('Print job completed!');
  },
  onPrintError: (error) => {
    // Show error message to user
    alert(`Print failed: ${error.message}`);
  }
});
```

## Styling Tips

### For Thermal Printers

```html
<!-- Use monospace fonts -->
<div style="font-family: 'Courier New', monospace;">
  
  <!-- Center align for headers -->
  <h2 style="text-align: center;">STORE NAME</h2>
  
  <!-- Dashed lines for separation -->
  <hr style="border: none; border-top: 1px dashed #000;" />
  
  <!-- Tables for item lists -->
  <table style="width: 100%; font-size: 12px;">
    <tr>
      <td>Item</td>
      <td style="text-align: right;">Price</td>
    </tr>
  </table>
  
</div>
```

### For A4 Printers

```html
<!-- Use standard fonts -->
<div style="font-family: Arial, sans-serif; padding: 20px;">
  
  <!-- Standard headers -->
  <h1 style="color: #333;">Sales Report</h1>
  
  <!-- Professional tables -->
  <table style="width: 100%; border-collapse: collapse;">
    <thead style="background-color: #333; color: white;">
      <tr>
        <th style="padding: 8px;">Product</th>
        <th style="padding: 8px;">Revenue</th>
      </tr>
    </thead>
  </table>
  
</div>
```

## Testing

Both apps include a **Printer Test Section** at the bottom:

### Web App
- Located at `apps/web/src/app/app.tsx`
- Test thermal and A4 printing
- Sample bill and report templates

### Desktop App
- Located at `apps/desktop/src/renderer/main.tsx`
- Test thermal and A4 printing
- Sample bill and report templates

### To Test:

1. Run the web or desktop app
2. Scroll to the bottom
3. Select printer type (Thermal or A4)
4. Click "Print Sample Bill" or "Print Sample Report"
5. Review in custom preview dialog
6. Click "Print" to send to printer

## Browser/Platform Compatibility

### Web App
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- Uses browser's native Print API

### Desktop App
- ✅ Windows
- ✅ macOS
- ✅ Linux
- Uses Electron's print capabilities

## Common Issues

### Print Dialog Not Showing

Make sure you're rendering the custom dialog when `showPreview` is true:

```tsx
{showPreview && currentPrintJob && (
  <div className="fixed inset-0 z-50">
    {/* Your dialog */}
  </div>
)}
```

### Content Not Printing

Check that your content has proper inline styles. External CSS may not apply:

```html
<!-- Good -->
<p style="color: #000; font-size: 14px;">Text</p>

<!-- Bad -->
<p className="text-black text-sm">Text</p>
```

### Thermal Printer Layout Issues

Ensure your content fits within the paper width:

```typescript
print(content, {
  printerType: 'thermal',
  paperWidth: '80mm',  // Match your actual printer width
  margin: '3mm'        // Keep margins small
});
```

## Examples

See working examples in:
- `apps/web/src/app/app.tsx` - PrinterTestSection component
- `apps/desktop/src/renderer/main.tsx` - PrinterTestSection component

Both include:
- ✅ Sample receipt/bill template
- ✅ Sample A4 report template
- ✅ Custom print preview dialog
- ✅ Printer type selection
- ✅ Error handling

## Need Help?

Check the main README or refer to the inline examples in the test sections of both apps.

