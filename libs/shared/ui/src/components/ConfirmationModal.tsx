/**
 * Confirmation Modal Component
 *
 * A reusable confirmation dialog modal for confirming actions
 */

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { ComponentProps } from '../types.js';

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
  className = '',
  style,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

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
          iconColor: '#f59e0b',
          confirmButtonBg: '#f59e0b',
          confirmButtonHover: '#d97706',
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

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        ...style,
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-lg shadow-xl w-full max-w-md mx-4 border"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderColor: 'var(--color-border-light)',
          color: 'var(--color-text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-border-light)' }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle
              className="w-6 h-6"
              style={{ color: variantStyles.iconColor }}
            />
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm md:text-base" style={{ color: 'var(--color-text-secondary)' }}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex items-center justify-end gap-3"
          style={{ borderColor: 'var(--color-border-light)' }}
        >
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </div>
    </div>
  );
}

