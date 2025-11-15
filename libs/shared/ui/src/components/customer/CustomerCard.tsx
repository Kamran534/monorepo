import React from 'react';
import { Edit, Trash2, User, Phone, MapPin, ShoppingCart } from 'lucide-react';
import { ComponentProps } from '../../types.js';

export interface Customer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface CustomerCardProps extends ComponentProps {
  customer: Customer;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  onAddToTransaction?: (customer: Customer) => void;
}

/**
 * CustomerCard Component
 *
 * Individual customer card in the grid layout
 */
export function CustomerCard({
  customer,
  onEdit,
  onDelete,
  onAddToTransaction,
  className = '',
}: CustomerCardProps) {
  return (
    <div
      className={`p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer group relative ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-light)',
      }}
    >
      {/* Action Buttons - Positioned separately */}
      <div 
        className="absolute top-3 right-4 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity z-10 gap-1.5"
      >
        {onAddToTransaction && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToTransaction(customer);
            }}
            className="p-1.5 rounded transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 shadow-sm"
            style={{
              color: 'var(--color-accent-blue)',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent-blue)';
              e.currentTarget.style.color = 'var(--color-text-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
              e.currentTarget.style.color = 'var(--color-accent-blue)';
            }}
            title="Add to transaction"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(customer);
            }}
            className="p-1.5 rounded transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 shadow-sm"
            style={{
              color: 'var(--color-accent-blue)',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent-blue)';
              e.currentTarget.style.color = 'var(--color-text-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
              e.currentTarget.style.color = 'var(--color-accent-blue)';
            }}
            title="Edit customer"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(customer);
            }}
            className="p-1.5 rounded transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 shadow-sm"
            style={{
              color: 'var(--color-error)',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-error)';
              e.currentTarget.style.color = 'var(--color-text-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
              e.currentTarget.style.color = 'var(--color-error)';
            }}
            title="Delete customer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Customer Info */}
      <div className="flex items-center gap-3 mb-3 pr-12">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--color-accent-blue)' }}
        >
          <User
            className="w-4 h-4"
            style={{ color: 'var(--color-text-light)' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className="font-medium text-sm mb-0.5 truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {customer.name}
          </h4>
          <p
            className="text-xs truncate"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {customer.email}
          </p>
        </div>
      </div>

      <div>
        <div className="space-y-1 text-xs mt-2">
          <div className="flex items-center gap-2">
            <Phone
              className="w-3 h-3 flex-shrink-0 opacity-70"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <span
              className="truncate"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {customer.phone}
            </span>
          </div>
          {customer.address && (
            <div className="flex items-start gap-2">
              <MapPin
                className="w-3 h-3 flex-shrink-0 opacity-70 mt-0.5"
                style={{ color: 'var(--color-text-secondary)' }}
              />
              <span
                className="text-xs leading-relaxed line-clamp-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {customer.address}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
