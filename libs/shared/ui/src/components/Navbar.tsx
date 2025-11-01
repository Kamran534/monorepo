import React, { useState } from 'react';
import { ComponentProps } from '../types.js';

export interface NavbarAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: string | number;
}

export interface NavbarProps extends ComponentProps {
  title?: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  actions?: NavbarAction[];
  userInfo?: {
    name: string;
    role?: string;
    avatar?: string;
  };
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

/**
 * Shared Navbar Component - Minimal Design
 * Compact navbar with Store Commerce theme
 * Used in both Web and Desktop apps
 */
export function Navbar({
  searchPlaceholder = 'Search',
  onSearch,
  actions = [],
  userInfo,
  onMenuClick,
  showMenuButton = true,
  className = '',
}: Omit<NavbarProps, 'title'>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <header
      className={`w-full ${className}`}
      style={{
        backgroundColor: '#002855',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 50,
      }}
    >
      <div className="flex items-center py-1.5">
        {/* Left: Menu Button - Aligned with Sidebar Width (40px) */}
        <div className="flex items-center justify-center" style={{ width: '40px', flexShrink: 0 }}>
          {showMenuButton && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Center: Search Bar - Absolutely Centered */}
        <div className="flex-1 flex justify-center px-4">
          {onSearch && (
            <div className="w-full max-w-xl">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                  <svg
                    className="w-3.5 h-3.5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 py-1 rounded text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions + User Info */}
        <div className="flex items-center gap-0.5 pr-3 lg:pr-4" style={{ flexShrink: 0 }}>
          {/* Action Buttons */}
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className="relative p-1 hover:bg-white/10 rounded transition-colors"
              aria-label={action.label}
              title={action.label}
            >
              <div className="w-4 h-4 text-white opacity-80 hover:opacity-100">
                {action.icon}
              </div>
              {action.badge && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 text-xs font-bold rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--color-error)',
                    color: 'white',
                    fontSize: '9px',
                  }}
                >
                  {action.badge}
                </span>
              )}
            </button>
          ))}

          {/* User Info */}
          {userInfo && (
            <div className="relative ml-1.5">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 px-1.5 py-0.5 hover:bg-white/10 rounded transition-colors"
              >
                {userInfo.avatar ? (
                  <img
                    src={userInfo.avatar}
                    alt={userInfo.name}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: '#0078d4', fontSize: '11px' }}
                  >
                    {userInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <div className="text-white font-medium" style={{ fontSize: '11px' }}>
                    {userInfo.name}
                  </div>
                  {userInfo.role && (
                    <div className="text-gray-400" style={{ fontSize: '9px' }}>
                      {userInfo.role}
                    </div>
                  )}
                </div>
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  {/* Menu */}
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50"
                    style={{
                      backgroundColor: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border-light)',
                    }}
                  >
                    <div className="py-1">
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors">
                        Profile
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors">
                        Settings
                      </button>
                      <hr style={{ borderColor: 'var(--color-border-light)' }} />
                      <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 transition-colors">
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

