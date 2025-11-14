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

// Receipt / Invoice
export { Invoice } from './receipt/Invoice.js';
export type { InvoiceProps, InvoiceLineItem, InvoiceBrand, InvoiceCustomer } from './receipt/Invoice.js';

// Transaction components
export * from './transactions/index.js';

// Home page components
export { ImageSlider, StartSection, ProductSection, InventorySection, ShiftDrawerSection, AccountSettingsSection } from './home/index.js';
export type { ImageSliderProps, SlideItem, StartSectionProps, NavigationTile, ProductSectionProps, ProductCategory, InventorySectionProps, InventoryTile, ShiftDrawerSectionProps, ShiftDrawerTile, AccountSettingsSectionProps, AccountSettingsTile } from './home/index.js';

// Category components
export * from './category/index.js';

// Product components
export * from './products/index.js';

// Loading component
export { Loading } from './Loading.js';
export type { LoadingProps } from './Loading.js';

// SplashScreen component
export { SplashScreen } from './SplashScreen.js';
export type { SplashScreenProps } from './SplashScreen.js';

// SidePanel component
export { SidePanel } from './SidePanel.js';
export type { SidePanelProps } from './SidePanel.js';

// Pagination component
export { Pagination } from './Pagination.js';
export type { PaginationProps } from './Pagination.js';
