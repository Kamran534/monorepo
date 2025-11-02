# CSS Variables Reference

Shared design tokens available as CSS custom properties and Tailwind utilities.

## Colors

### Primary Blue Scale
- `--color-primary-50` to `--color-primary-950`
- Tailwind: `bg-primary-50`, `text-primary-500`, etc.

### Secondary Blue Scale
- `--color-secondary-50` to `--color-secondary-900`
- Tailwind: `bg-secondary-500`, `text-secondary-600`, etc.

### Background Colors
- `--color-bg-primary` - Main content background
- `--color-bg-secondary` - Sidebar/secondary background
- `--color-bg-tertiary` - Tertiary background
- `--color-bg-header` - Header background
- `--color-bg-nav` - Navigation background
- `--color-bg-card` - Card background
- `--color-bg-tile` - Tile background
- `--color-bg-settings-dark` - Settings tile dark
- `--color-bg-settings-medium` - Settings tile medium
- `--color-bg-settings-grey` - Settings tile grey
- `--color-bg-settings-light` - Settings tile light

### Text Colors
- `--color-text-primary` - Main text
- `--color-text-secondary` - Secondary text
- `--color-text-light` - Light text (white)
- `--color-text-link` - Link color

### Semantic Colors
- Success: `--color-success`, `--color-success-light`, `--color-success-dark`, `--color-success-bg`
- Error: `--color-error`, `--color-error-light`, `--color-error-dark`, `--color-error-bg`
- Warning: `--color-warning`, `--color-warning-light`, `--color-warning-dark`, `--color-warning-bg`
- Info: `--color-info`, `--color-info-light`, `--color-info-dark`, `--color-info-bg`

### Tile Colors (Brown/Terracotta)
- `--color-tile-brown-1` to `--color-tile-brown-5`

## Spacing

- `--spacing-xs` (4px)
- `--spacing-sm` (8px)
- `--spacing-md` (16px)
- `--spacing-lg` (24px)
- `--spacing-xl` (32px)
- `--spacing-2xl` (48px)
- `--spacing-3xl` (64px)
- `--spacing-4xl` (96px)

Tailwind: `p-md`, `m-lg`, `gap-xl`, etc.

## Typography

### Font Sizes
- `--font-size-xs` (12px)
- `--font-size-sm` (14px)
- `--font-size-base` (16px)
- `--font-size-lg` (18px)
- `--font-size-xl` (20px)
- `--font-size-2xl` (24px)
- `--font-size-3xl` (30px)
- `--font-size-4xl` (36px)
- `--font-size-5xl` (48px)

Tailwind: `text-xs`, `text-base`, `text-lg`, etc.

## Border Radius

- `--radius-sm` (4px)
- `--radius-md` (8px)
- `--radius-lg` (12px)
- `--radius-xl` (16px)
- `--radius-2xl` (24px)
- `--radius-full` (9999px)

Tailwind: `rounded-md`, `rounded-lg`, `rounded-full`, etc.

## Z-Index

- `--z-dropdown` (1000)
- `--z-sticky` (1020)
- `--z-fixed` (1030)
- `--z-modal-backdrop` (1040)
- `--z-modal` (1050)
- `--z-popover` (1060)
- `--z-tooltip` (1070)

## Usage

### In CSS/Inline Styles
```css
.my-element {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: var(--spacing-md);
}
```

### In React (Inline Styles)
```tsx
<div style={{ backgroundColor: 'var(--color-bg-primary)' }}>
```

### In Tailwind Classes
```tsx
<div className="bg-primary text-text-primary p-md">
```

## Files

- **CSS Variables**: `libs/shared/ui/src/styles/globals.css`
- **TypeScript Constants**: `libs/shared/ui/src/variables.ts`
- **Tailwind Config**: `tailwind.config.js`

