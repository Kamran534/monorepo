# Printer Hook - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Import the Hook

```typescript
import { usePrinter } from '@monorepo/shared-hooks-printer';
```

### Step 2: Add to Your Component

```typescript
function MyComponent() {
  const { print, showPreview, executePrint, cancelPrint, isPrinting, currentPrintJob } = usePrinter();
  
  const handlePrint = () => {
    const billHtml = `
      <div style="text-align: center;">
        <h2>Invoice #001</h2>
        <p>Total: $99.99</p>
      </div>
    `;
    
    print(billHtml, { printerType: 'thermal' });
  };

  return (
    <>
      <button onClick={handlePrint}>Print</button>
      
      {showPreview && currentPrintJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div dangerouslySetInnerHTML={{ 
              __html: typeof currentPrintJob.content === 'string' 
                ? currentPrintJob.content 
                : currentPrintJob.content.innerHTML 
            }} />
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

### Step 3: Test It!

Run your app and click the print button. You'll see:
1. Custom preview dialog appears
2. Your content is displayed
3. Click "Print" to send to printer
4. Or "Cancel" to close

## 📖 Common Use Cases

### Print a Thermal Receipt

```typescript
const printReceipt = () => {
  const receipt = `
    <div style="font-family: 'Courier New', monospace; text-align: center;">
      <h2>MY STORE</h2>
      <hr style="border-top: 1px dashed #000;" />
      <p>Total: $20.00</p>
      <p>Thank you!</p>
    </div>
  `;
  
  print(receipt, {
    printerType: 'thermal',
    paperWidth: '80mm',
    fontSize: '12px'
  });
};
```

### Print an A4 Report

```typescript
const printReport = () => {
  const report = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h1>Sales Report</h1>
      <p>Total Sales: $12,450.00</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background-color: #333; color: white;">
          <th style="padding: 8px;">Product</th>
          <th style="padding: 8px;">Revenue</th>
        </tr>
        <tr>
          <td style="padding: 8px;">Coffee</td>
          <td style="padding: 8px;">$624.00</td>
        </tr>
      </table>
    </div>
  `;
  
  print(report, {
    printerType: 'a4',
    orientation: 'portrait',
    margin: '20mm'
  });
};
```

### Print from DOM Element

```typescript
const printElement = () => {
  const element = document.getElementById('invoice');
  if (element) {
    print(element, { printerType: 'a4' });
  }
};
```

## 🎯 Quick Reference

### Hook Options

```typescript
usePrinter({
  defaultPrinterType: 'a4',
  onBeforePrint: () => console.log('Starting...'),
  onAfterPrint: () => console.log('Done!'),
  onPrintError: (error) => alert(error.message)
})
```

### Print Options

```typescript
print(content, {
  printerType: 'thermal' | 'a4',
  paperWidth: '80mm' | '210mm',
  paperHeight: 'auto' | '297mm',
  fontSize: '12px' | '14px',
  margin: '5mm' | '20mm',
  orientation: 'portrait' | 'landscape'
})
```

### Returned Values

| Property | Type | Description |
|----------|------|-------------|
| `print` | `function` | Start a print job with preview |
| `executePrint` | `function` | Execute the actual print |
| `cancelPrint` | `function` | Cancel current print job |
| `isPrinting` | `boolean` | Is currently printing |
| `showPreview` | `boolean` | Is preview dialog shown |
| `currentPrintJob` | `object \| null` | Current job data |

## 📍 Where to Find Examples

Both apps have working examples at the bottom:

### Web App
```
apps/web/src/app/app.tsx
```
Look for `PrinterTestSection` component

### Desktop App
```
apps/desktop/src/renderer/main.tsx
```
Look for `PrinterTestSection` component

## 🎨 Styling Tips

### Must Use Inline Styles!

❌ **Don't do this:**
```html
<div className="text-center font-bold">
  This won't work in print!
</div>
```

✅ **Do this:**
```html
<div style="text-align: center; font-weight: bold;">
  This will work!
</div>
```

### Thermal Printer Styles

```html
<div style="font-family: 'Courier New', monospace; text-align: center;">
  <h2 style="margin: 10px 0;">Store Name</h2>
  <hr style="border: none; border-top: 1px dashed #000;" />
  <table style="width: 100%; font-size: 12px;">
    <tr>
      <td>Item</td>
      <td style="text-align: right;">$10.00</td>
    </tr>
  </table>
</div>
```

### A4 Printer Styles

```html
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h1 style="color: #333;">Report Title</h1>
  <table style="width: 100%; border-collapse: collapse;">
    <thead style="background-color: #333; color: white;">
      <tr>
        <th style="padding: 8px;">Column</th>
      </tr>
    </thead>
  </table>
</div>
```

## 🐛 Troubleshooting

### Preview not showing?

Make sure you render the dialog when `showPreview` is true:

```tsx
{showPreview && currentPrintJob && (
  <YourDialogComponent />
)}
```

### Styles not applying?

Use inline styles, not CSS classes:

```tsx
// ❌ Won't work
<div className="text-center">

// ✅ Will work
<div style="text-align: center;">
```

### Content cut off?

Adjust margins or paper width:

```typescript
print(content, {
  paperWidth: '80mm',  // Match your printer
  margin: '3mm'        // Reduce margins
})
```

## 🎓 Learn More

- 📖 [README.md](./README.md) - Full documentation
- 🔧 [INTEGRATION.md](./INTEGRATION.md) - Detailed integration guide
- 📊 [SUMMARY.md](./SUMMARY.md) - Implementation details

## 💡 Pro Tips

1. **Test on actual printer** - Preview may differ slightly from print
2. **Keep thermal content narrow** - Use 80mm or 58mm width
3. **Use monospace fonts** for thermal receipts
4. **Use sans-serif fonts** for A4 documents
5. **Add loading states** - Show feedback during printing
6. **Handle errors** - Use `onPrintError` callback
7. **Preview before printing** - Let users review content
8. **Save successful layouts** - Reuse working templates

## ✨ You're Ready!

That's it! You now have a powerful printing system that:
- ✅ Works on thermal and A4 printers
- ✅ Shows custom preview dialogs
- ✅ Handles errors gracefully
- ✅ Works in web and desktop apps

Happy Printing! 🖨️

