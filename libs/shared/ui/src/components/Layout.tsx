import React, { useState, useEffect } from 'react';
import { Sidebar, SidebarProps } from './Sidebar.js';
import { Navbar, NavbarProps } from './Navbar.js';
import { ComponentProps } from '../types.js';

export interface LayoutProps extends ComponentProps {
  sidebarProps: SidebarProps;
  navbarProps: NavbarProps;
  children: React.ReactNode;
  showSidebar?: boolean;
}

/**
 * Shared Layout Component
 * Main layout structure with Sidebar and Navbar
 * Responsive and works for both Web and Desktop apps
 */
export function Layout({
  sidebarProps,
  navbarProps,
  children,
  showSidebar = true,
  className = '',
}: LayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Prevent body scroll when sidebar is expanded
  useEffect(() => {
    if (sidebarExpanded || isClosing) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarExpanded, isClosing]);

  const handleCloseSidebar = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSidebarExpanded(false);
      setIsClosing(false);
    }, 300); // Match animation duration
  };

  const handleToggleSidebar = () => {
    if (sidebarExpanded) {
      handleCloseSidebar();
    } else {
      setSidebarExpanded(true);
    }
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-gray-50 ${className}`}>
      {/* Navbar - Full Width */}
      <div className="relative z-50">
        <Navbar
          {...navbarProps}
          onMenuClick={handleToggleSidebar}
          showMenuButton={showSidebar}
        />
      </div>

      {/* Content Area with Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar - Always visible (collapsed by default) */}
        {showSidebar && (
          <div className="relative z-20">
            <Sidebar {...sidebarProps} isExpanded={false} />
          </div>
        )}

        {/* Expanded Sidebar Overlay */}
        {showSidebar && (sidebarExpanded || isClosing) && (
          <>
            {/* Backdrop with fade effect - stays under navbar */}
            <div
              className={`fixed inset-0 bg-black/30 z-30 ${
                isClosing ? 'animate-fadeOut' : 'animate-fadeIn'
              }`}
              style={{ 
                top: '32px',
                pointerEvents: isClosing ? 'none' : 'auto',
              }}
              onClick={handleCloseSidebar}
            />
            {/* Expanded Sidebar - Slides in/out from left - stays under navbar */}
            <div
              className={`fixed left-0 z-40 shadow-2xl ${
                isClosing ? 'animate-slideOutToLeft' : 'animate-slideInFromLeft'
              }`}
              style={{ 
                top: '32px',
                bottom: 0,
                pointerEvents: isClosing ? 'none' : 'auto',
              }}
            >
              <Sidebar
                {...sidebarProps}
                isExpanded={true}
                onClose={handleCloseSidebar}
                onItemClick={(item) => {
                  sidebarProps.onItemClick?.(item);
                  handleCloseSidebar();
                }}
              />
            </div>
          </>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

