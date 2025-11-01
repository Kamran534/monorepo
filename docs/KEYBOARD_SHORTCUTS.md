# Keyboard Shortcuts System

This document describes the keyboard shortcuts system implemented across the web and desktop applications.

## Overview

The keyboard shortcuts system is built using a custom React hook (`useKeyboardShortcuts`) located in `libs/shared/hooks/keyboard-shortcuts`. This hook provides a consistent way to manage keyboard shortcuts across both web and desktop applications.

## Features

- ✨ Easy-to-use React hook for keyboard shortcuts
- 🎹 Support for modifier keys (Ctrl, Shift, Alt, Meta/Cmd)
- 🌐 Cross-platform compatible (Web & Electron Desktop)
- ⚡ Lightweight and performant
- 🔍 Built-in shortcut viewer (Ctrl+A)
- 📝 TypeScript support with full type safety

## Current Implementation

### Registered Shortcuts

| Shortcut | Description | Action |
|----------|-------------|--------|
| `Ctrl+A` | View All Keys Window | Opens a modal showing all registered keyboard shortcuts |
| `Ctrl+Shift+S` | Open Settings | Opens the settings dialog (placeholder) |

### Where It's Implemented

- ✅ **Web App** (`apps/web/src/app/app.tsx`)
- ✅ **Desktop App** (`apps/desktop/src/renderer/main.tsx`)
- ❌ **Mobile App** (Not applicable - no keyboard shortcuts on mobile)

## Usage

### Basic Example

```tsx
import { useKeyboardShortcuts } from '@monorepo/shared-hooks-keyboard-shortcuts';

function MyComponent() {
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'a',
        ctrl: true,
        description: 'Select All',
        action: () => console.log('Select all triggered'),
      },
    ],
  });

  return <div>Your component</div>;
}
```

### With Shortcut Viewer

```tsx
import { useKeyboardShortcuts } from '@monorepo/shared-hooks-keyboard-shortcuts';
import { useState } from 'react';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);

  const { getShortcuts, formatShortcut } = useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'k',
        ctrl: true,
        description: 'Show Shortcuts',
        action: () => setShowModal(true),
      },
    ],
  });

  return (
    <div>
      {showModal && (
        <div className="modal">
          <h2>Keyboard Shortcuts</h2>
          {getShortcuts().map((shortcut, index) => (
            <div key={index}>
              <span>{shortcut.description}</span>
              <kbd>{formatShortcut(shortcut)}</kbd>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## API Reference

### `useKeyboardShortcuts(options)`

#### Options

```typescript
interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean; // Default: true
}
```

#### Shortcut Configuration

```typescript
interface KeyboardShortcut {
  key: string;           // The key to trigger (e.g., 'a', 's', 'Enter')
  ctrl?: boolean;        // Require Ctrl key (Default: false)
  shift?: boolean;       // Require Shift key (Default: false)
  alt?: boolean;         // Require Alt key (Default: false)
  meta?: boolean;        // Require Meta/Cmd key (Default: false)
  action: () => void;    // Function to execute when triggered
  description: string;   // Human-readable description
  preventDefault?: boolean; // Prevent default browser behavior (Default: true)
}
```

#### Return Value

```typescript
{
  getShortcuts: () => KeyboardShortcut[];
  formatShortcut: (shortcut: KeyboardShortcut) => string;
}
```

## Testing

### Manual Testing

1. **Start the Web App:**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:4200`

2. **Start the Desktop App:**
   ```bash
   npm run desktop:dev
   ```

3. **Test Shortcuts:**
   - Press `Ctrl+A` to open the shortcuts viewer
   - Press `Ctrl+Shift+S` to trigger the settings action
   - Verify the modal displays correctly
   - Verify console logs show the correct messages

### Expected Behavior

1. **Ctrl+A:**
   - Opens a modal overlay with dark background
   - Shows all registered shortcuts
   - Can be closed by clicking outside, the X button, or pressing Ctrl+A again

2. **Ctrl+Shift+S:**
   - Logs message to console
   - Shows an alert (placeholder for actual settings dialog)

## Adding New Shortcuts

### Step 1: Define Your Shortcuts

```tsx
const shortcuts = [
  {
    key: 'n',
    ctrl: true,
    description: 'New Document',
    action: handleNewDocument,
  },
  {
    key: 'o',
    ctrl: true,
    description: 'Open File',
    action: handleOpenFile,
  },
  {
    key: 's',
    ctrl: true,
    description: 'Save',
    action: handleSave,
  },
];
```

### Step 2: Use the Hook

```tsx
useKeyboardShortcuts({ shortcuts });
```

### Step 3: Document Your Shortcuts

Update this file and any user-facing documentation with the new shortcuts.

## Best Practices

### 1. Avoid Browser Conflicts

Don't override essential browser shortcuts:
- `Ctrl+T` (New Tab)
- `Ctrl+W` (Close Tab)
- `Ctrl+R` (Reload)
- `Ctrl+F` (Find) - unless you provide better functionality
- `Ctrl+P` (Print) - unless you provide better functionality

### 2. Follow Platform Conventions

- **Windows/Linux:** Use `Ctrl` key
- **macOS:** Use `Meta/Cmd` key (consider supporting both)
- **Common shortcuts:**
  - `Ctrl+S` - Save
  - `Ctrl+Z` - Undo
  - `Ctrl+Y` or `Ctrl+Shift+Z` - Redo
  - `Ctrl+C/V/X` - Copy/Paste/Cut
  - `Ctrl+A` - Select All (we use for shortcuts viewer)

### 3. Provide Discoverability

- Always implement a "View All Shortcuts" feature (`Ctrl+A`)
- Show shortcuts in tooltips
- Include shortcuts in help menu
- Display shortcuts next to menu items

### 4. Enable/Disable as Needed

```tsx
const [isEditing, setIsEditing] = useState(false);

useKeyboardShortcuts({
  shortcuts: editorShortcuts,
  enabled: isEditing, // Only active during editing
});
```

### 5. Group Related Shortcuts

```tsx
// Global shortcuts (always active)
const globalShortcuts = [
  { key: 'a', ctrl: true, description: 'View Shortcuts', action: showShortcuts },
  { key: 's', ctrl: true, shift: true, description: 'Settings', action: openSettings },
];

// Editor shortcuts (context-specific)
const editorShortcuts = [
  { key: 'b', ctrl: true, description: 'Bold', action: makeBold },
  { key: 'i', ctrl: true, description: 'Italic', action: makeItalic },
];
```

## Architecture

### File Structure

```
libs/shared/hooks/keyboard-shortcuts/
├── src/
│   ├── index.ts                    # Exports
│   └── useKeyboardShortcuts.ts     # Main hook implementation
├── INTEGRATION.md                   # Integration guide
├── README.md                        # Hook documentation
├── package.json                     # Package configuration
├── project.json                     # Nx project configuration
├── tsconfig.json                    # TypeScript configuration
└── tsconfig.lib.json               # TypeScript library configuration
```

### How It Works

1. **Event Listener:** The hook attaches a `keydown` event listener to the window
2. **Key Matching:** When a key is pressed, it checks all registered shortcuts
3. **Modifier Check:** Verifies all required modifier keys are pressed
4. **Action Execution:** Runs the action of the first matching shortcut
5. **Cleanup:** Removes the event listener on unmount

## Troubleshooting

### Shortcut Not Working

**Problem:** Shortcut doesn't trigger the action

**Solutions:**
1. Check if the key combination conflicts with browser defaults
2. Verify all modifier keys are specified correctly
3. Ensure the component is mounted
4. Check browser console for JavaScript errors
5. Try `preventDefault: false` if testing

### Multiple Actions Fire

**Problem:** Multiple shortcuts trigger from one keypress

**Cause:** Only one shortcut should fire per keypress (first match wins)

**Solution:** Check for duplicate shortcut definitions

### Modal Not Showing

**Problem:** Ctrl+A doesn't show the shortcuts modal

**Solutions:**
1. Check React state management
2. Verify modal CSS is loaded
3. Check for z-index issues
4. Look for JavaScript errors in console

## Future Enhancements

### Planned Features

- [ ] Customizable shortcuts (user preferences)
- [ ] Shortcut conflict detection
- [ ] Keyboard shortcut hints/tooltips throughout UI
- [ ] Shortcut recording/learning mode
- [ ] Platform-specific shortcut sets
- [ ] Global shortcut manager service
- [ ] Shortcut cheat sheet overlay
- [ ] Vim-style key sequences support

### Ideas for Additional Shortcuts

- `Ctrl+/` - Toggle command palette
- `Ctrl+,` - Open preferences
- `Ctrl+K` - Search/command palette
- `Escape` - Close modals/dialogs
- `F1` - Help/Documentation
- `F11` - Toggle fullscreen (desktop only)
- `Ctrl+1..9` - Switch between tabs/sections

## Support

For questions or issues with the keyboard shortcuts system:

1. Check this documentation
2. Review `libs/shared/hooks/keyboard-shortcuts/README.md`
3. Check `libs/shared/hooks/keyboard-shortcuts/INTEGRATION.md`
4. Look at existing implementations in web and desktop apps
5. Open an issue in the repository

## Related Documentation

- [Keyboard Shortcuts Hook README](../libs/shared/hooks/keyboard-shortcuts/README.md)
- [Integration Guide](../libs/shared/hooks/keyboard-shortcuts/INTEGRATION.md)
- [Web App Documentation](./setup.md)
- [Desktop App Setup](./setup.md)

