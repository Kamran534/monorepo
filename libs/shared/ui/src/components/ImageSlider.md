# ImageSlider Component

A professional, feature-rich image carousel/slider component for showcasing collection banners, hero images, and promotional content.

## Features

✨ **Auto-play** - Automatic slide progression with configurable intervals
🎮 **Navigation Controls** - Previous/Next arrow buttons
🎯 **Indicators** - Dot navigation for direct slide access
⌨️ **Keyboard Navigation** - Arrow keys for navigation, spacebar for play/pause
📱 **Touch/Swipe Support** - Swipe gestures on touch devices
⏸️ **Pause on Hover** - Automatically pauses when user hovers
🎨 **Theme-Aware** - Respects light/dark mode settings
📐 **Responsive** - Adapts to all screen sizes
🖼️ **WebP Support** - Optimized image loading with WebP fallback
✨ **Smooth Animations** - Elegant transitions and overlays
♿ **Accessible** - ARIA labels and keyboard support

## Installation

The component is already included in `@monorepo/shared-ui`.

```typescript
import { ImageSlider } from '@monorepo/shared-ui';
import type { ImageSliderProps, SlideItem } from '@monorepo/shared-ui';
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `slides` | `SlideItem[]` | **required** | Array of slide objects |
| `autoPlay` | `boolean` | `true` | Enable auto-play |
| `autoPlayInterval` | `number` | `5000` | Interval between slides (ms) |
| `showControls` | `boolean` | `true` | Show prev/next arrows |
| `showIndicators` | `boolean` | `true` | Show dot indicators |
| `pauseOnHover` | `boolean` | `true` | Pause on mouse hover |
| `height` | `string` | `'600px'` | Slider height |
| `onSlideChange` | `(index: number) => void` | - | Callback when slide changes |
| `onSlideClick` | `(slide: SlideItem, index: number) => void` | - | Callback when slide is clicked |
| `className` | `string` | `''` | Additional CSS classes |

### SlideItem Interface

```typescript
interface SlideItem {
  path: string;        // Image path (required)
  webp?: string;       // WebP version path (optional)
  alt: string;         // Alt text for accessibility
  title: string;       // Slide title (displayed as overlay)
  subtitle: string;    // Slide subtitle (displayed as overlay)
}
```

## Basic Usage

### With Collection Images

```tsx
import { ImageSlider } from '@monorepo/shared-ui';
import { allCollections } from '@monorepo/shared-assets';

function HomePage() {
  return (
    <div>
      <ImageSlider 
        slides={allCollections}
        height="700px"
      />
    </div>
  );
}
```

### Custom Slide Data

```tsx
import { ImageSlider } from '@monorepo/shared-ui';
import type { SlideItem } from '@monorepo/shared-ui';

const customSlides: SlideItem[] = [
  {
    path: '/images/slide1.png',
    webp: '/images/slide1.webp',
    alt: 'Summer Sale',
    title: 'SUMMER SALE',
    subtitle: 'Up to 50% off on selected items',
  },
  {
    path: '/images/slide2.png',
    alt: 'New Arrivals',
    title: 'NEW ARRIVALS',
    subtitle: 'Check out our latest collection',
  },
];

function HeroSection() {
  return (
    <ImageSlider 
      slides={customSlides}
      autoPlayInterval={4000}
      height="500px"
    />
  );
}
```

## Advanced Usage

### With Click Handlers

```tsx
import { ImageSlider } from '@monorepo/shared-ui';
import { allCollections } from '@monorepo/shared-assets';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();

  const handleSlideClick = (slide, index) => {
    console.log('Clicked slide:', slide.title, 'at index:', index);
    // Navigate to collection page
    navigate(`/collections/${index}`);
  };

  const handleSlideChange = (index) => {
    console.log('Now showing slide:', index);
    // Track analytics
  };

  return (
    <ImageSlider 
      slides={allCollections}
      onSlideClick={handleSlideClick}
      onSlideChange={handleSlideChange}
      height="80vh"
    />
  );
}
```

### Custom Configuration

```tsx
import { ImageSlider } from '@monorepo/shared-ui';
import { allCollections } from '@monorepo/shared-assets';

function PromoBanner() {
  return (
    <ImageSlider 
      slides={allCollections}
      autoPlay={true}
      autoPlayInterval={3000}      // 3 seconds per slide
      showControls={true}          // Show navigation arrows
      showIndicators={true}        // Show dot indicators
      pauseOnHover={true}          // Pause when hovering
      height="600px"               // Custom height
      className="shadow-2xl"       // Additional styling
    />
  );
}
```

### Minimal Configuration

```tsx
import { ImageSlider } from '@monorepo/shared-ui';
import { allCollections } from '@monorepo/shared-assets';

function SimpleSlider() {
  return (
    <ImageSlider 
      slides={allCollections}
      autoPlay={false}        // No auto-play
      showControls={false}    // No arrows
      showIndicators={false}  // No indicators
      height="400px"
    />
  );
}
```

## Keyboard Controls

When the slider is active:
- **Left Arrow** - Previous slide
- **Right Arrow** - Next slide
- **Spacebar** - Play/Pause toggle

## Touch Gestures

On touch devices:
- **Swipe Left** - Next slide
- **Swipe Right** - Previous slide

## Responsive Behavior

The slider adapts to different screen sizes:

- **Mobile** (< 768px):
  - Smaller text sizes
  - Adjusted button sizes
  - Touch-optimized controls

- **Tablet** (768px - 1024px):
  - Medium text sizes
  - Standard button sizes

- **Desktop** (> 1024px):
  - Full text sizes
  - Larger controls
  - Hover effects

## Styling Customization

### Custom Height

```tsx
<ImageSlider slides={slides} height="100vh" /> // Full viewport
<ImageSlider slides={slides} height="500px" /> // Fixed height
<ImageSlider slides={slides} height="50%" />   // Percentage
```

### Additional CSS Classes

```tsx
<ImageSlider 
  slides={slides}
  className="rounded-lg shadow-xl my-8"
/>
```

### Theme Integration

The slider automatically adapts to your app's theme (light/dark mode) using CSS variables:
- `--color-bg-secondary`
- `--color-text-primary`
- `--color-text-secondary`

## Performance Optimization

The slider includes several performance optimizations:

1. **Lazy Loading** - Only the first slide loads eagerly, others load lazily
2. **WebP Support** - Uses WebP format when available for smaller file sizes
3. **Debounced Transitions** - Prevents rapid slide changes during animation
4. **GPU Acceleration** - Uses CSS transforms for smooth animations
5. **Touch Event Optimization** - Efficient touch/swipe handling

## Accessibility

The component follows WCAG guidelines:

- Semantic HTML structure
- ARIA labels for all interactive elements
- Keyboard navigation support
- Alt text for all images
- Focus indicators
- Reduced motion respect (can be extended)

## Browser Compatibility

- ✅ Chrome/Edge (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Examples

See usage examples in:
- `apps/web/src/pages/Dashboard.tsx`
- `apps/desktop/src/pages/Dashboard.tsx`

## Related Components

- **Layout** - Overall app structure
- **Navbar** - Navigation bar
- **Sidebar** - Side navigation

## Troubleshooting

### Slides not appearing
- Check that the `slides` array is not empty
- Verify image paths are correct
- Ensure images are accessible from the public directory

### Auto-play not working
- Make sure `autoPlay={true}` is set
- Check that `slides.length > 1`
- Verify no JavaScript errors in console

### Controls not showing
- Ensure `showControls={true}` is set
- Check that there's more than one slide
- Try hovering over the slider (controls appear on hover)

## License

Part of the shared UI library. See main LICENSE file.


