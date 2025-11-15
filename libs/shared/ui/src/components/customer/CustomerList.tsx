import React, { useMemo } from 'react';
import { Search, User } from 'lucide-react';
import { ComponentProps } from '../../types.js';
import { CustomerCard, Customer } from './CustomerCard.js';

export interface CustomerListProps extends ComponentProps {
  customers: Customer[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onEditCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (customer: Customer) => void;
  onAddToTransaction?: (customer: Customer) => void;
}

/**
 * CustomerList Component
 *
 * Grid layout of customer cards with search functionality
 */
export function CustomerList({
  customers,
  searchQuery,
  onSearchChange,
  onEditCustomer,
  onDeleteCustomer,
  onAddToTransaction,
  className = '',
}: CustomerListProps) {
  // Filter customers based on search query
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.phone.includes(query) ||
      customer.address?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between">
          <h3
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Customers ({filteredCustomers.length})
          </h3>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 opacity-50"
              style={{ color: 'var(--color-text-secondary)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-1 rounded border text-sm w-full max-w-md"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-light)',
              }}
              placeholder="Search customers..."
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center h-full">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <User
                className="w-10 h-10 opacity-60"
                style={{ color: 'var(--color-text-secondary)' }}
              />
            </div>
            <h4
              className="text-base font-medium mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </h4>
            <p
              className="text-sm max-w-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {searchQuery
                ? `No customers match "${searchQuery}". Try a different search term.`
                : 'Start by adding your first customer using the form on the left.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-2">
            {filteredCustomers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onEdit={onEditCustomer}
                onDelete={onDeleteCustomer}
                onAddToTransaction={onAddToTransaction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
