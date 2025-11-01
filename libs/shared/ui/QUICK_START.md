# Shared UI Library - Quick Start Guide

## ✅ What Was Implemented

### 1. **Complete Color Palette**
Colors extracted from Store Commerce images:
- ✅ Primary Blue Scale (50-950)
- ✅ Secondary Blue Scale (50-900)
- ✅ Accent Colors (blue, red, green, orange)
- ✅ Background Colors (header, sidebar, tiles, cards)
- ✅ Text Colors (primary, secondary, on dark)
- ✅ Semantic Colors (success, error, warning, info)
- ✅ Border Colors

### 2. **Comprehensive Responsive Breakpoints**
- ✅ 320px (Extra small phones)
- ✅ 480px (Small phones landscape)
- ✅ 640px (Tablets)
- ✅ 768px (Small laptops)
- ✅ 1024px (Laptops)
- ✅ 1280px (Large desktops)
- ✅ 1536px (Extra large desktops)
- ✅ 1920px (Ultra wide displays)

### 3. **Global CSS Variables**
All colors, spacing, typography, and layout variables available as CSS custom properties.

### 4. **TypeScript Constants**
Type-safe constants exported for use in components.

### 5. **Tailwind Integration**
All colors integrated into Tailwind config for utility class usage.

## 📁 File Structure

```
libs/shared/ui/
├── package.json
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
├── README.md
├── QUICK_START.md
└── src/
    ├── index.ts
    ├── variables.ts
    ├── types.ts
    └── styles/
        ├── globals.css    # CSS variables & responsive styles
        └── components.css # Shared component classes
```

## 🚀 Usage

### In CSS Files

```css
.my-component {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
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
    }}>
      Content
    </div>
  );
}
```

### With Tailwind Classes

```tsx
<div className="bg-primary-500 text-white p-md rounded-lg">
  Primary Button
</div>

<div className="bg-success text-white">
  Success Message
</div>

<div className="bg-tile text-white">
  Interactive Tile
</div>
```

## 📱 Responsive Classes

```html
<!-- Responsive grid (auto-adjusts columns) -->
<div className="grid-responsive">
  <!-- 1 col mobile, 2 col tablet, 3 col desktop, 4 col xl, 5 col 2xl -->
</div>

<!-- Responsive visibility -->
<div className="visible-mobile">Shows only on mobile</div>
<div className="visible-tablet">Shows only on tablet+</div>
<div className="visible-desktop">Shows only on desktop+</div>

<!-- Responsive text sizes -->
<h1 className="text-responsive-xl">Scales automatically</h1>
```

## 🎨 Root Layout Classes

```html
<div className="app-container">
  <header className="app-header">
    Store Commerce
  </header>
  <div className="app-layout">
    <aside className="app-sidebar">
      Navigation
    </aside>
    <main className="app-main-content">
      Main Content
    </main>
  </div>
</div>
```

## ✅ Already Integrated

The global styles are already imported in:
- ✅ `apps/web/src/styles.css`
- ✅ `apps/desktop/src/renderer/styles.css`

## 📚 Documentation

See `README.md` for complete documentation and examples.

