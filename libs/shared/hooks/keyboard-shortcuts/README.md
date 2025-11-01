# Keyboard Shortcuts Hook

A React hook for managing keyboard shortcuts in web and desktop applications.

## Features

- 🎹 Easy keyboard shortcut management
- 🔧 Support for modifier keys (Ctrl, Shift, Alt, Meta/Cmd)
- 🌐 Cross-platform compatible (Web & Electron)
- ⚡ Lightweight and performant
- 🎯 TypeScript support

## Installation

This library is part of the monorepo shared hooks. Import it using:

```typescript
import { useKeyboardShortcuts } from '@monorepo/shared-hooks-keyboard-shortcuts';
```

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
        description: 'View All Keys',
        action: () => console.log('Ctrl+A pressed'),
      },
      {
        key: 's',
        ctrl: true,
        shift: true,
        description: 'Open Settings',
        action: () => console.log('Ctrl+Shift+S pressed'),
      },
    ],
  });

  return <div>Press keyboard shortcuts!</div>;
}
```

### Display Shortcuts List

```tsx
import { useKeyboardShortcuts } from '@monorepo/shared-hooks-keyboard-shortcuts';

function MyComponent() {
  const { getShortcuts, formatShortcut } = useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'a',
        ctrl: true,
        description: 'View All Keys',
        action: () => console.log('Ctrl+A pressed'),
      },
    ],
  });

  return (
    <div>
      <h3>Available Shortcuts:</h3>
      <ul>
        {getShortcuts().map((shortcut, index) => (
          <li key={index}>
            <strong>{formatShortcut(shortcut)}</strong>: {shortcut.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## API

### `useKeyboardShortcuts(options)`

#### Options

- `shortcuts`: Array of keyboard shortcut configurations
- `enabled`: Boolean to enable/disable shortcuts (default: `true`)

#### Shortcut Configuration

```typescript
interface KeyboardShortcut {
  key: string;           // The key to trigger (e.g., 'a', 's', 'Enter')
  ctrl?: boolean;        // Require Ctrl key
  shift?: boolean;       // Require Shift key
  alt?: boolean;         // Require Alt key
  meta?: boolean;        // Require Meta/Cmd key
  action: () => void;    // Function to execute
  description: string;   // Human-readable description
  preventDefault?: boolean; // Prevent default behavior (default: true)
}
```

#### Return Value

```typescript
{
  getShortcuts: () => KeyboardShortcut[];  // Get all registered shortcuts
  formatShortcut: (shortcut: KeyboardShortcut) => string; // Format shortcut for display
}
```

## Examples

### Common Shortcuts

```tsx
const shortcuts = [
  // Save
  {
    key: 's',
    ctrl: true,
    description: 'Save',
    action: handleSave,
  },
  // Undo
  {
    key: 'z',
    ctrl: true,
    description: 'Undo',
    action: handleUndo,
  },
  // Redo
  {
    key: 'z',
    ctrl: true,
    shift: true,
    description: 'Redo',
    action: handleRedo,
  },
  // Find
  {
    key: 'f',
    ctrl: true,
    description: 'Find',
    action: openFindDialog,
  },
];
```

## Notes

- Only one shortcut is triggered per keypress
- Shortcuts are evaluated in the order they're defined
- Default behavior is to prevent default browser actions
- Works in both web browsers and Electron desktop applications

