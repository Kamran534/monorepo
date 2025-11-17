import React, { useState, useMemo } from 'react';
import { Search, User, Plus, X } from 'lucide-react';
import { ComponentProps } from '../../types.js';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  customerCode?: string;
}

export interface CustomerSelectorProps extends ComponentProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onCreateNewCustomer: () => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * CustomerSelector Component
 *
 * Allows selecting an existing customer from a searchable dropdown
 * or creating a new customer for the sales order
 */
export function CustomerSelector({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onCreateNewCustomer,
  loading = false,
  disabled = false,
  className = '',
}: CustomerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter customers based on search query
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter(customer => {
      const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
      return (
        fullName.includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.includes(query) ||
        customer.customerCode?.toLowerCase().includes(query)
      );
    });
  }, [customers, searchQuery]);

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearCustomer = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCustomer(null);
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    setSearchQuery('');
    onCreateNewCustomer();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      <label
        className="block text-sm font-medium mb-2"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Customer
      </label>

      {/* Selected Customer Display / Trigger */}
      <div
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        className={`relative border rounded-lg transition-all ${
          disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: isOpen ? 'var(--color-accent-blue)' : 'var(--color-border-light)',
        }}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          {selectedCustomer ? (
            <div className="flex items-center gap-3 flex-1">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--color-accent-blue-light)' }}
              >
                <User
                  className="w-5 h-5"
                  style={{ color: 'var(--color-accent-blue)' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="font-medium text-sm truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </div>
                <div
                  className="text-xs truncate"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {selectedCustomer.email || selectedCustomer.phone || selectedCustomer.customerCode}
                </div>
              </div>
              <button
                onClick={handleClearCustomer}
                className="p-1 rounded hover:bg-opacity-10 transition-colors flex-shrink-0"
                style={{
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'transparent',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <User
                className="w-5 h-5"
                style={{ color: 'var(--color-text-secondary)' }}
              />
              <span
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {loading ? 'Loading customers...' : 'Select a customer (optional)'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && !loading && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            className="absolute z-20 mt-1 w-full rounded-lg shadow-lg border overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border-light)',
              maxHeight: '400px',
            }}
          >
            {/* Search Input */}
            <div
              className="p-3 border-b"
              style={{ borderColor: 'var(--color-border-light)' }}
            >
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--color-text-secondary)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="w-full pl-10 pr-3 py-2 rounded border text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    borderColor: 'var(--color-border-light)',
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Create New Button */}
            <button
              onClick={handleCreateNew}
              className="w-full px-4 py-3 flex items-center gap-3 border-b transition-colors"
              style={{
                borderColor: 'var(--color-border-light)',
                backgroundColor: 'var(--color-bg-primary)',
                color: 'var(--color-accent-blue)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)';
              }}
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium text-sm">Create New Customer</span>
            </button>

            {/* Customer List */}
            <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
              {filteredCustomers.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <User
                    className="w-12 h-12 mx-auto mb-3 opacity-40"
                    style={{ color: 'var(--color-text-secondary)' }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {searchQuery ? 'No customers found' : 'No customers available'}
                  </p>
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full px-4 py-3 flex items-center gap-3 border-b transition-colors text-left"
                    style={{
                      borderColor: 'var(--color-border-light)',
                      backgroundColor:
                        selectedCustomer?.id === customer.id
                          ? 'var(--color-bg-secondary)'
                          : 'var(--color-bg-primary)',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCustomer?.id !== customer.id) {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCustomer?.id !== customer.id) {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)';
                      }
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--color-accent-blue-light)' }}
                    >
                      <User
                        className="w-5 h-5"
                        style={{ color: 'var(--color-accent-blue)' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-medium text-sm truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {customer.firstName} {customer.lastName}
                        {customer.customerCode && (
                          <span
                            className="ml-2 text-xs font-normal"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            ({customer.customerCode})
                          </span>
                        )}
                      </div>
                      {(customer.email || customer.phone) && (
                        <div
                          className="text-xs truncate mt-0.5"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {customer.email || customer.phone}
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
