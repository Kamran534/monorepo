/**
 * Shared Image Assets
 * Central location for all image paths used across web, desktop, and mobile apps
 */

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && 
  typeof navigator !== 'undefined' &&
  (((window as any).electronAPI !== undefined) || 
  ((window as any).electron !== undefined) ||
  navigator.userAgent.toLowerCase().includes('electron'));

// Base path for collections images - use relative paths for Electron
const COLLECTIONS_BASE = isElectron ? './assets/images/collections' : '/assets/images/collections';

// Base path for category images - use relative paths for Electron
const CATEGORIES_BASE = isElectron ? './assets/images/categories' : '/assets/images/categories';

/**
 * Collection Banner Images
 * Hero/promotional images for product collections
 */
export const CollectionImages = {
  jackets: {
    path: `${COLLECTIONS_BASE}/jackets-collection.png`,
    alt: 'Jackets Collection - Layer up the world anew with our refined eyewear',
    title: 'JACKETS COLLECTION',
    subtitle: 'Layer up the world anew with our & refined eyerwaar.',
  },
  winter: {
    path: `${COLLECTIONS_BASE}/winter-collection.png`,
    alt: 'Winter Collection - Embrace the cold in style with our luxurious new arrivals',
    title: 'WINTER COLLECTION',
    subtitle: 'Embrace the cold in style with our luxuriouss new arrivals',
  },
  summer: {
    path: `${COLLECTIONS_BASE}/summer-escape.png`,
    alt: 'Summer Escape - Discover our newest collection of airy dresses & separates',
    title: 'SUMMER ESCAPE',
    subtitle: 'Discover our newest collection of airy dresses & separates',
  },
  glasses: {
    path: `${COLLECTIONS_BASE}/glasses-collection.png`,
    alt: 'Glasses Collection - See the world anew with our exclusive eyewear',
    title: 'GLASSES COLLECTION',
    subtitle: 'See the the world anew wit with our exclusive eyerwear.',
  },
} as const;

/**
 * All collection images as an array
 * Useful for carousels and galleries
 */
export const allCollections = Object.values(CollectionImages);

/**
 * Collection image type
 */
export type CollectionImage = typeof CollectionImages[keyof typeof CollectionImages];

/**
 * Helper function to get image path with WebP fallback support
 * @param collection - The collection image object
 * @param preferWebP - Whether to prefer WebP format (default: true)
 * @returns Image path
 */
export function getCollectionImagePath(
  collection: CollectionImage,
  preferWebP = true
): string {
  return preferWebP && collection.webp ? collection.webp : collection.path;
}

/**
 * Helper function to get srcset for responsive images
 * @param collection - The collection image object
 * @returns srcset string
 */
export function getCollectionImageSrcSet(collection: CollectionImage): string {
  return `${collection.path} 1x, ${collection.webp} 1x`;
}

/**
 * Product Category Images
 * Images for main product categories
 */
export const CategoryImages = {
  womens: {
    path: `${CATEGORIES_BASE}/womens.png`,
    alt: 'Women\'s Fashion - Elegant and sophisticated style',
    name: 'WOMENS',
  },
  mens: {
    path: `${CATEGORIES_BASE}/men.png`,
    alt: 'Men\'s Fashion - Sharp and modern looks',
    name: 'MENS',
  },
  accessories: {
    path: `${CATEGORIES_BASE}/accessories.png`,
    alt: 'Fashion Accessories - Complete your look',
    name: 'ACCESSORIES',
  },
} as const;

/**
 * All category images as an array
 * Useful for product category displays
 */
export const allCategories = Object.values(CategoryImages);

/**
 * Category image type
 */
export type CategoryImage = typeof CategoryImages[keyof typeof CategoryImages];
