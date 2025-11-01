# Shared UI Library

This library contains shared UI elements, global styles, color palettes, and design tokens extracted from the Store Commerce design system.

## Features

- ✅ **Global CSS Variables** - Complete color palette extracted from Store Commerce images
- ✅ **Responsive Design** - Comprehensive breakpoints for all screen sizes (320px to 1920px+)
- ✅ **React Components** - Professional Sidebar, Navbar, and Layout components
- ✅ **Component Classes** - Pre-built CSS classes for buttons, inputs, cards, tables, badges
- ✅ **Lucide Icons** - Beautiful, consistent icon library (lucide-react)
- ✅ **TypeScript Constants** - Type-safe design tokens and variables
- ✅ **Tailwind Integration** - Full color palette integrated into Tailwind config
- ✅ **Root Layout Classes** - Pre-built layout classes for common patterns
- ✅ **Responsive Utilities** - Helper classes for responsive design

## Installation

The UI library is already part of the monorepo. Import it in your apps:

```typescript
// Import TypeScript constants
import { COLORS, SPACING, BREAKPOINTS } from '@monorepo/shared-ui';

// Import React components
import { Layout, Sidebar, Navbar } from '@monorepo/shared-ui';
import type { SidebarItem, NavbarAction } from '@monorepo/shared-ui';
```

## React Components

See [COMPONENTS.md](./COMPONENTS.md) for detailed documentation on using the React components:
- **Sidebar** - Responsive navigation sidebar
- **Navbar** - Header with search, notifications, and user menu
- **Layout** - Complete app layout wrapper

## Color Palette

### Primary Colors
- **Blue Scale (Primary)**: `#3b82f6` (main accent)
- **Blue Scale (Secondary)**: `#0284c7` (alternative accent)
- **Accent Blue**: `#0078d4` (Store Commerce style)

### Background Colors
- **Primary**: `#ffffff` (white - main content)
- **Secondary**: `#f8f8f8` (light grey - sidebar)
- **Header**: `#1a202c` (dark navy - header bar)
- **Dark**: `#202020` (very dark - navigation)
- **Tiles**: `#6c757d` (muted grey/brown - interactive tiles)

### Semantic Colors
- **Success**: `#22c55e` (green)
- **Error**: `#ef4444` (red)
- **Warning**: `#f59e0b` (orange)
- **Info**: `#3b82f6` (blue)

## Usage

### In CSS

```css
.my-component {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}
```

### In TypeScript/React

```typescript
import { COLORS, SPACING, FONT_SIZES } from '@monorepo/shared-ui';

function MyComponent() {
  return (
    <div style={{
      backgroundColor: COLORS.background.primary,
      color: COLORS.text.primary,
      padding: SPACING.md,
      fontSize: FONT_SIZES.base,
    }}>
      Content
    </div>
  );
}
```

### With Tailwind Classes

```tsx
<div className="bg-primary-500 text-white p-md rounded-lg">
  Button
</div>
```

## Responsive Breakpoints

The library includes comprehensive responsive breakpoints:

- **xs**: 320px (portrait phones)
- **sm**: 480px (landscape phones)
- **md**: 640px (tablets)
- **lg**: 768px (small laptops)
- **xl**: 1024px (laptops)
- **2xl**: 1280px (large desktops)
- **3xl**: 1536px (extra large desktops)
- **4xl**: 1920px (ultra wide displays)

### Responsive Classes

```html
<!-- Responsive grid -->
<div className="grid-responsive">
  <!-- Automatically adjusts columns based on screen size -->
</div>

<!-- Responsive visibility -->
<div className="visible-mobile">Mobile only</div>
<div className="visible-tablet">Tablet and up</div>
<div className="visible-desktop">Desktop only</div>

<!-- Responsive text sizes -->
<h1 className="text-responsive-xl">Responsive heading</h1>
```

## Root Layout Classes

Pre-built layout classes for common patterns:

```html
<div className="app-container">
  <header className="app-header">Header</header>
  <div className="app-layout">
    <aside className="app-sidebar">Sidebar</aside>
    <main className="app-main-content">Main Content</main>
  </div>
</div>
```

## Files Structure

```
libs/shared/ui/
├── package.json
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
├── README.md
└── src/
    ├── index.ts              # Main exports
    ├── variables.ts          # TypeScript constants
    ├── types.ts              # Type definitions
    └── styles/
        ├── globals.css       # CSS variables & responsive styles
        └── components.css    # Shared component base classes
```

## Import Global Styles

Import the global styles and component classes in your app's main CSS file:

```css
/* apps/web/src/styles.css */
@import '../../libs/shared/ui/src/styles/globals.css';
@import '../../libs/shared/ui/src/styles/components.css';
```

```css
/* apps/desktop/src/renderer/styles.css */
@import '../../../libs/shared/ui/src/styles/globals.css';
@import '../../../libs/shared/ui/src/styles/components.css';
```

```css
/* apps/mobile/src/styles.css */
@import '../../libs/shared/ui/src/styles/globals.css';
@import '../../libs/shared/ui/src/styles/components.css';
```

## TypeScript Support

Full TypeScript support with type definitions:

```typescript
import { COLORS, SPACING, FontSize, ColorScale } from '@monorepo/shared-ui';

const color: ColorScale = 500; // Type-safe color scale
const fontSize: FontSize = 'base'; // Type-safe font size
```

## Tailwind Integration

All colors are integrated into Tailwind config, so you can use them directly:

```tsx
<div className="bg-primary-500 text-white">Primary button</div>
<div className="bg-success text-white">Success message</div>
<div className="bg-tile text-white">Interactive tile</div>
```

## Support

For questions or issues, refer to the main monorepo documentation or check the inline comments in the source files.

