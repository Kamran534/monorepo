/**
 * Shared UI Components
 * Reusable components for Web, Desktop, and Mobile apps
 */

export { Sidebar } from './Sidebar.js';
export type { SidebarProps, SidebarItem } from './Sidebar.js';

export { Navbar } from './Navbar.js';
export type { NavbarProps, NavbarAction } from './Navbar.js';

export { Layout } from './Layout.js';
export type { LayoutProps } from './Layout.js';

// Transaction components
export * from './transactions/index.js';

// Home page components
export { ImageSlider, StartSection, ProductSection, InventorySection, ShiftDrawerSection, AccountSettingsSection } from './home/index.js';
export type { ImageSliderProps, SlideItem, StartSectionProps, NavigationTile, ProductSectionProps, ProductCategory, InventorySectionProps, InventoryTile, ShiftDrawerSectionProps, ShiftDrawerTile, AccountSettingsSectionProps, AccountSettingsTile } from './home/index.js';
