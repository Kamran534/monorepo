/**
 * Confirmation Modal Component
 *
 * A reusable confirmation dialog modal for confirming actions
 */

import React, { useCallback, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { ComponentProps } from '../types.js';
import { SidePanel } from './SidePanel.js';

export interface ConfirmationModalProps extends ComponentProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  showCancelButton?: boolean;
}

/**
 * ConfirmationModal Component
 *
 * A modal dialog for confirming user actions with customizable styling
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false,
  showCancelButton = true,
  className = '',
}: ConfirmationModalProps) {
  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  useEffect(() => {
    if (!isOpen || isLoading) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isLoading, isOpen, onConfirm]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconColor: 'var(--color-error)',
          confirmButtonBg: 'var(--color-error)',
          confirmButtonHover: 'rgba(239, 68, 68, 0.9)',
        };
      case 'warning':
        return {
          iconColor: '#f97316',
          confirmButtonBg: '#f97316',
          confirmButtonHover: '#ea580c',
        };
      case 'info':
        return {
          iconColor: 'var(--color-accent-blue)',
          confirmButtonBg: 'var(--color-accent-blue)',
          confirmButtonHover: 'rgba(59, 130, 246, 0.9)',
        };
      default:
        return {
          iconColor: '#f59e0b',
          confirmButtonBg: '#f59e0b',
          confirmButtonHover: '#d97706',
        };
    }
  };

  const variantStyles = getVariantStyles();

  const headerContent = (
    <div className="flex items-start gap-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          color: variantStyles.iconColor,
        }}
      >
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-100 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {message}
        </p>
      </div>
    </div>
  );

  const footerContent = (
    <div className="flex flex-col gap-3">
      <button
        onClick={onConfirm}
        disabled={isLoading}
        className="w-full px-4 py-3 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: isLoading ? 'var(--color-bg-secondary)' : variantStyles.confirmButtonBg,
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = variantStyles.confirmButtonHover;
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = variantStyles.confirmButtonBg;
          }
        }}
      >
        {isLoading ? 'Processing...' : confirmText}
      </button>
      {showCancelButton && (
        <button
          onClick={handleClose}
          disabled={isLoading}
          className="w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 border"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border-light)',
          }}
        >
          {cancelText}
        </button>
      )}
    </div>
  );

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={handleClose}
      width="320px"
      showBackdrop
      className={className}
      header={headerContent}
      footer={footerContent}
    >
      <div className="flex flex-col gap-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        <p className="leading-relaxed">{message}</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Press Enter to confirm immediately.</li>
          <li>Press Esc or use the Cancel button to keep working.</li>
        </ul>
      </div>
    </SidePanel>
  );
}

