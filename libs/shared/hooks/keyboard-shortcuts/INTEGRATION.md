# Keyboard Shortcuts Integration Guide

This guide explains how to integrate the keyboard shortcuts hook into your application.

## Quick Start

### 1. Import the Hook

```tsx
import { useKeyboardShortcuts } from '@monorepo/shared-hooks-keyboard-shortcuts';
```

### 2. Basic Usage

```tsx
function MyComponent() {
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'a',
        ctrl: true,
        description: 'View All Keys',
        action: () => console.log('Ctrl+A pressed'),
      },
    ],
  });

  return <div>Your component</div>;
}
```

## Integration Examples

### Web App (apps/web/src/app/app.tsx)

```tsx
import { useKeyboardShortcuts } from '@monorepo/shared-hooks-keyboard-shortcuts';
import { useState } from 'react';

export function App() {
  const [showKeysWindow, setShowKeysWindow] = useState(false);

  const { getShortcuts, formatShortcut } = useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'a',
        ctrl: true,
        description: 'View All Keys Window',
        action: () => setShowKeysWindow(prev => !prev),
      },
      {
        key: 's',
        ctrl: true,
        shift: true,
        description: 'Open Settings',
        action: () => alert('Settings'),
      },
    ],
  });

  return (
    <div>
      {showKeysWindow && (
        <div className="shortcuts-modal">
          {getShortcuts().map((shortcut, index) => (
            <div key={index}>
              <span>{shortcut.description}</span>
              <kbd>{formatShortcut(shortcut)}</kbd>
            </div>
          ))}
        </div>
      )}
      {/* Rest of your app */}
    </div>
  );
}
```

### Desktop App (apps/desktop/src/renderer/main.tsx)

Same integration as web app - the hook works seamlessly in both environments!

## Current Implementation Status

✅ **Web App**: Integrated with Ctrl+A and Ctrl+Shift+S shortcuts
✅ **Desktop App**: Integrated with Ctrl+A and Ctrl+Shift+S shortcuts
⏳ **Mobile App**: Not applicable (no keyboard shortcuts on mobile)

## Testing the Implementation

### Test Shortcuts

1. **Ctrl+A** - Toggles the "View All Keys Window" modal
   - Shows all registered keyboard shortcuts
   - Press again to close

2. **Ctrl+Shift+S** - Opens Settings
   - Currently shows an alert
   - Replace with actual settings dialog in production

### How to Test

1. Start the web app:
   ```bash
   npm run dev
   ```

2. Start the desktop app:
   ```bash
   npm run desktop:dev
   ```

3. Press `Ctrl+A` to see all available shortcuts
4. Press `Ctrl+Shift+S` to trigger the settings action

## Adding New Shortcuts

To add more shortcuts, simply add them to the shortcuts array:

```tsx
const { getShortcuts, formatShortcut } = useKeyboardShortcuts({
  shortcuts: [
    // Existing shortcuts...
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
    // Add more shortcuts as needed
  ],
});
```

## Advanced Usage

### Conditional Shortcuts

Enable/disable shortcuts based on application state:

```tsx
const [isEditing, setIsEditing] = useState(false);

useKeyboardShortcuts({
  shortcuts: editingShortcuts,
  enabled: isEditing, // Only active when editing
});
```

### Multiple Shortcut Groups

You can use multiple instances of the hook for different contexts:

```tsx
// Global shortcuts (always active)
useKeyboardShortcuts({
  shortcuts: globalShortcuts,
});

// Editor shortcuts (only when editor is focused)
useKeyboardShortcuts({
  shortcuts: editorShortcuts,
  enabled: editorFocused,
});
```

## Platform Considerations

### Modifier Keys

- **Ctrl**: Works on Windows and Linux
- **Meta/Cmd**: Works on macOS (use `meta: true`)
- **Alt**: Works on all platforms
- **Shift**: Works on all platforms

### Preventing Default Behavior

By default, all shortcuts prevent the browser's default action. To allow default behavior:

```tsx
{
  key: 'f',
  ctrl: true,
  description: 'Find',
  action: handleFind,
  preventDefault: false, // Allow browser's find dialog if needed
}
```

## Troubleshooting

### Shortcut Not Working

1. Check if the key combination conflicts with browser defaults
2. Verify `preventDefault` is not set to `false`
3. Ensure the component using the hook is mounted
4. Check browser console for errors

### Multiple Actions Triggered

- Only one shortcut is triggered per keypress
- Shortcuts are evaluated in order
- First matching shortcut wins

### Cross-Platform Issues

- Test on Windows, macOS, and Linux
- Consider using both `ctrl` and `meta` for common actions
- Document platform-specific shortcuts clearly

## Best Practices

1. **Keep shortcuts consistent** - Follow platform conventions
2. **Avoid conflicts** - Don't override critical browser shortcuts
3. **Document shortcuts** - Use the "View All Keys" window
4. **Test thoroughly** - Verify on all target platforms
5. **Be accessible** - Provide alternative mouse/touch interactions

## Next Steps

1. Replace `alert()` in settings shortcut with actual settings dialog
2. Add more application-specific shortcuts as needed
3. Consider adding shortcut customization for users
4. Implement shortcut conflict detection
5. Add keyboard shortcut hints in UI (tooltips, help menu)

