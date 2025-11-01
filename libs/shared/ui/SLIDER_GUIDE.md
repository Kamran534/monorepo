# ImageSlider Quick Start Guide

## 🎯 What You Just Built

A professional image slider/carousel component that:
- ✅ Displays collection banner images with overlays
- ✅ Auto-plays with configurable intervals
- ✅ Has navigation controls (arrows, dots, keyboard, touch)
- ✅ Pauses on hover
- ✅ Smooth animations and transitions
- ✅ Fully responsive and theme-aware
- ✅ Works in both Web and Desktop apps

## 📦 What Was Created

### 1. ImageSlider Component
**Location**: `libs/shared/ui/src/components/ImageSlider.tsx`

A feature-rich slider with:
- Auto-play functionality
- Previous/Next navigation arrows
- Dot indicators for direct slide access
- Keyboard navigation (arrow keys, spacebar)
- Touch/swipe support
- Pause on hover
- Click handlers for slides
- Smooth fade transitions
- Text overlay with title and subtitle
- Responsive design

### 2. Slide-in Animation
**Location**: `libs/shared/ui/src/styles/globals.css`

Added `@keyframes slideInFromBottom` for overlay text animations.

### 3. Example Implementations
**Locations**:
- `apps/web/src/pages/Dashboard.tsx` - Web app example
- `apps/desktop/src/pages/Dashboard.tsx` - Desktop app example

Both dashboards now showcase:
- Hero slider with all 4 collection images
- Dashboard stats cards below the slider
- Click and change event handlers

## 🚀 How to Use

### Basic Usage

```tsx
import { ImageSlider } from '@monorepo/shared-ui';
import { allCollections } from '@monorepo/shared-assets';

function HomePage() {
  return (
    <ImageSlider 
      slides={allCollections}
      height="600px"
    />
  );
}
```

### With Event Handlers

```tsx
import { ImageSlider, type SlideItem } from '@monorepo/shared-ui';
import { allCollections } from '@monorepo/shared-assets';

function HomePage() {
  const handleSlideClick = (slide: SlideItem, index: number) => {
    console.log(`Clicked: ${slide.title}`);
    // Navigate or show details
  };

  const handleSlideChange = (index: number) => {
    console.log(`Now showing slide ${index + 1}`);
    // Track analytics
  };

  return (
    <ImageSlider 
      slides={allCollections}
      onSlideClick={handleSlideClick}
      onSlideChange={handleSlideChange}
      height="700px"
    />
  );
}
```

### Custom Configuration

```tsx
<ImageSlider 
  slides={allCollections}
  autoPlay={true}              // Enable auto-play
  autoPlayInterval={4000}      // 4 seconds per slide
  showControls={true}          // Show arrows
  showIndicators={true}        // Show dots
  pauseOnHover={true}          // Pause on hover
  height="80vh"                // Full height
/>
```

## 🎮 User Controls

### Mouse/Desktop
- **Hover**: Reveals navigation controls and pauses auto-play
- **Arrow Buttons**: Click to navigate prev/next
- **Dot Indicators**: Click to jump to specific slide
- **Play/Pause Button**: Toggle auto-play (top-right)

### Keyboard
- **Left Arrow**: Previous slide
- **Right Arrow**: Next slide
- **Spacebar**: Play/Pause toggle

### Touch/Mobile
- **Swipe Left**: Next slide
- **Swipe Right**: Previous slide
- **Tap**: Click handler (if provided)

## 📱 Responsive Behavior

| Screen Size | Text Size | Button Size | Layout |
|-------------|-----------|-------------|--------|
| Mobile (< 768px) | Small | Compact | Single column |
| Tablet (768-1024px) | Medium | Standard | Adaptive |
| Desktop (> 1024px) | Large | Full | Optimized |

## 🎨 Features

### Auto-Play
- Automatically cycles through slides
- Configurable interval (default: 5000ms)
- Pauses on hover (optional)
- Manual play/pause control

### Navigation
- **Arrow Buttons**: Prev/Next navigation
- **Indicators**: Dot-style slide indicators
- **Keyboard**: Arrow keys for navigation
- **Touch**: Swipe gestures

### Visual Effects
- Smooth fade transitions (500ms)
- Gradient overlay on images
- Text slide-in animations
- Hover effects on controls

### Performance
- Lazy loading for non-first slides
- WebP image support
- GPU-accelerated animations
- Debounced transitions

## 📊 Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `slides` | `SlideItem[]` | **required** | Array of slides |
| `autoPlay` | `boolean` | `true` | Enable auto-play |
| `autoPlayInterval` | `number` | `5000` | MS between slides |
| `showControls` | `boolean` | `true` | Show arrows |
| `showIndicators` | `boolean` | `true` | Show dots |
| `pauseOnHover` | `boolean` | `true` | Pause on hover |
| `height` | `string` | `'600px'` | Slider height |
| `onSlideChange` | `(index) => void` | - | Change callback |
| `onSlideClick` | `(slide, index) => void` | - | Click callback |

## 🎯 Next Steps

### 1. Test the Slider
```bash
# Run web app
npm run web

# Run desktop app
npm run desktop
```

### 2. Customize Styling
Add custom CSS classes:
```tsx
<ImageSlider 
  slides={allCollections}
  className="rounded-xl shadow-2xl my-8"
  height="700px"
/>
```

### 3. Integrate with Routing
Navigate to collection pages on click:
```tsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

const handleClick = (slide: SlideItem, index: number) => {
  navigate(`/collections/${index}`);
};

<ImageSlider 
  slides={allCollections}
  onSlideClick={handleClick}
/>
```

### 4. Add Analytics
Track slide views:
```tsx
const handleSlideChange = (index: number) => {
  // Analytics tracking
  gtag('event', 'slider_view', {
    slide_index: index,
    slide_title: allCollections[index].title
  });
};
```

### 5. Create More Slide Collections
Add custom slides:
```tsx
import type { SlideItem } from '@monorepo/shared-ui';

const promoSlides: SlideItem[] = [
  {
    path: '/images/promo1.png',
    webp: '/images/promo1.webp',
    alt: 'Special Offer',
    title: 'FLASH SALE',
    subtitle: '50% off everything - Today only!',
  },
  // ... more slides
];

<ImageSlider slides={promoSlides} />
```

## 📚 Documentation

- **Full Documentation**: `libs/shared/ui/src/components/ImageSlider.md`
- **Component Source**: `libs/shared/ui/src/components/ImageSlider.tsx`
- **Example Usage**: `apps/web/src/pages/Dashboard.tsx`

## 🎉 You're All Set!

Your image slider is ready to use across both web and desktop apps. The component is:
- ✅ Fully functional
- ✅ Theme-aware (light/dark mode)
- ✅ Responsive
- ✅ Accessible
- ✅ Performance-optimized
- ✅ Production-ready

Enjoy your new professional slider! 🚀


