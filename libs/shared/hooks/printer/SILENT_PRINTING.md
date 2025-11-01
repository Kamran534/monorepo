# Silent Printing Guide

This guide explains how to print **without showing the browser/system print dialog**.

## 🎯 Summary

- ✅ **Desktop App (Electron)**: Prints silently, no dialog shown!
- ⚠️ **Web App (Browser)**: Browser dialog always appears (security requirement)

## Desktop App - Silent Printing

### How It Works

The Electron desktop app uses Electron's native print API to print directly to the printer without showing any system dialog.

**Flow:**
1. User clicks "Print" button
2. Custom preview dialog appears
3. User clicks "Print" in preview
4. Content is sent directly to printer (no system dialog!)
5. Done!

### Configuration

Silent printing is **enabled by default** in the desktop app. To use it:

```typescript
import { usePrinter } from '@monorepo/shared-hooks-printer';

function MyComponent() {
  const { print } = usePrinter({
    silent: true, // Default is true - enables silent printing
  });

  const handlePrint = () => {
    print(content, { printerType: 'thermal' });
  };

  // That's it! Will print silently in desktop app
}
```

### Technical Details

**What was implemented:**

1. **Preload Script** (`apps/desktop/src/preload/preload.ts`)
   - Exposed `electronAPI.print()` to renderer process
   - Securely bridges renderer and main process

2. **Main Process** (`apps/desktop/src/main/main.ts`)
   - Added `print-content` IPC handler
   - Creates hidden BrowserWindow with print content
   - Calls `webContents.print()` with `silent: true`
   - Automatically closes window after printing

3. **Printer Hook** (`libs/shared/hooks/printer/src/usePrinter.ts`)
   - Detects Electron environment
   - Sends HTML content via IPC to main process
   - Falls back to browser print if Electron API unavailable

### Electron Print Options

When using silent printing, these options are available:

```typescript
print(content, {
  printerType: 'thermal' | 'a4',
  paperWidth: '80mm' | '210mm',
  // ... other print options
});

// Electron-specific options (handled automatically):
// - silent: true          // No dialog shown
// - printBackground: true // Includes background colors/images
// - deviceName: ''        // Uses default printer
```

### Selecting a Specific Printer

To print to a specific printer (not the default):

```typescript
const { print } = usePrinter({
  silent: true,
  defaultPrinterName: 'Thermal Receipt Printer', // Printer name
});
```

> **Note:** Printer names are system-specific. You'll need to query available printers first.

## Web App - Browser Printing

### Limitation

Web browsers **cannot print silently** for security reasons. The browser's print dialog will always appear.

**Flow:**
1. User clicks "Print" button
2. Custom preview dialog appears
3. User clicks "Print" in preview
4. **Browser system dialog appears** (user must click "Print" again)
5. Content is printed

### Why?

Browsers prevent silent printing to:
- Prevent malicious websites from printing without permission
- Ensure users control printer access
- Protect against printer resource abuse

This is a **browser security restriction** and cannot be bypassed in regular web apps.

### Alternatives for Web

If you need silent printing in a web environment:

#### Option 1: Use the Desktop App
The Electron desktop app supports true silent printing. Recommend users install the desktop version for POS/kiosk scenarios.

#### Option 2: Browser Extensions
Create a browser extension with `printing` permission. Extensions can print silently but require:
- Users to install the extension
- Extension approval from browser stores
- Separate development and maintenance

#### Option 3: Dedicated Print Service
For thermal printers, use a local print service:
- Run a local web server/service
- Service communicates directly with printer via ESC/POS commands
- Web app sends print jobs to the local service
- Common for receipt printers in POS systems

Example services:
- ESCPOS-Server
- Node.js printer libraries
- Custom Electron service running in background

#### Option 4: Kiosk Mode
Run browser in kiosk mode with print permissions:
- Chrome: `--kiosk --kiosk-printing`
- Only works for dedicated kiosk machines
- Not suitable for general users

## Comparison

| Feature | Desktop App | Web App |
|---------|-------------|---------|
| Silent Printing | ✅ Yes | ❌ No |
| Custom Preview | ✅ Yes | ✅ Yes |
| Thermal Printers | ✅ Yes | ✅ Yes (with dialog) |
| A4 Printers | ✅ Yes | ✅ Yes (with dialog) |
| User Setup | Install app | Just visit URL |
| Best For | POS, Kiosks | General access |

## Recommendation

### For POS/Retail Systems
Use the **Desktop App** for:
- Cash register receipts
- Kitchen order tickets
- Queue number printing
- Any scenario needing quick, silent printing

### For General Business Use
Either app works for:
- Occasional invoice printing
- Reports and documents
- Where user interaction is acceptable

### For Cloud/SaaS Applications
Use the **Web App** but:
- Inform users about the print dialog
- Consider offering desktop app for power users
- Provide instructions for printer setup

## Testing Silent Printing

### Desktop App

1. Build and run the desktop app:
```bash
npm run dev:desktop
# or
nx serve desktop
```

2. Scroll to "Printer Test Section (Desktop App)"

3. Select printer type and click "Print Sample Bill"

4. Click "Print" in the preview dialog

5. **Watch**: Print goes directly to printer with NO system dialog! 🎉

### Web App

1. Run the web app:
```bash
npm run dev:web
# or
nx serve web
```

2. Scroll to "Printer Test Section (Web App)"

3. Select printer type and click "Print Sample Bill"

4. Click "Print" in the preview dialog

5. **Browser print dialog will appear** - this is expected behavior

## Troubleshooting

### Desktop App - Print Dialog Still Appears

**Issue:** System print dialog shows in desktop app

**Solutions:**
1. Check that `silent: true` is set in `usePrinter`:
   ```typescript
   const { print } = usePrinter({ silent: true });
   ```

2. Verify Electron API is available:
   ```typescript
   console.log('electronAPI:', window.electronAPI);
   ```

3. Check the console for errors

4. Ensure you're running the built desktop app, not dev tools

### Desktop App - Nothing Happens

**Issue:** Click print but nothing prints

**Solutions:**
1. Check if default printer is set in OS
2. Verify printer is online and has paper
3. Check console for error messages
4. Try selecting a specific printer name

### Web App - Want Silent Printing

**Answer:** Not possible in web browsers due to security. Use the desktop app instead!

## Code Example

### Complete Example with Silent Printing

```typescript
import { usePrinter } from '@monorepo/shared-hooks-printer';
import { useState } from 'react';

function ReceiptPrinter() {
  const { 
    print, 
    showPreview, 
    executePrint, 
    cancelPrint, 
    isPrinting,
    currentPrintJob 
  } = usePrinter({
    silent: true, // Enable silent printing (works in desktop app)
    onBeforePrint: () => console.log('Printing...'),
    onAfterPrint: () => console.log('Print complete!'),
    onPrintError: (error) => alert(`Print failed: ${error.message}`),
  });

  const printReceipt = (orderData: any) => {
    const receipt = `
      <div style="font-family: 'Courier New', monospace; text-align: center;">
        <h2>MY STORE</h2>
        <hr style="border-top: 1px dashed #000;" />
        <p>Order #${orderData.id}</p>
        <p>Total: $${orderData.total}</p>
        <hr style="border-top: 1px dashed #000;" />
        <p>Thank you!</p>
      </div>
    `;

    print(receipt, {
      printerType: 'thermal',
      paperWidth: '80mm',
      fontSize: '12px',
    });
  };

  return (
    <>
      <button onClick={() => printReceipt({ id: 123, total: 29.99 })}>
        Print Receipt
      </button>

      {/* Custom preview dialog */}
      {showPreview && currentPrintJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <h2>Print Preview</h2>
            <div 
              dangerouslySetInnerHTML={{ 
                __html: typeof currentPrintJob.content === 'string'
                  ? currentPrintJob.content
                  : currentPrintJob.content.innerHTML
              }} 
            />
            <button onClick={cancelPrint}>Cancel</button>
            <button onClick={executePrint} disabled={isPrinting}>
              {isPrinting ? 'Printing...' : 'Print'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

## Summary

✅ **Desktop App**: True silent printing - no dialogs, prints directly
⚠️ **Web App**: Browser dialog required - security limitation
💡 **Best Practice**: Use desktop app for POS/kiosk scenarios requiring silent printing

The printer functionality is fully implemented and ready to use in both environments! 🎉

