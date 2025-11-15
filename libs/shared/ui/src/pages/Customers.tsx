import React, { useState, useEffect } from 'react';
import type { Customer } from '../components/customer/CustomerCard.js';
import { CustomerForm, CustomerList } from '../components/customer/index.js';
import { useTransactionCustomer } from '../hooks/useTransactionCustomer.js';
import { useToast } from '../hooks/useToast.js';
import {
  useAppDispatch,
  useAppSelector,
  fetchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  clearCustomerError,
  selectCustomers,
  selectCustomersLoading,
  selectCustomersCreating,
  selectCustomersUpdating,
  selectCustomersDeleting,
  selectCustomersError,
} from '@monorepo/shared-store';

/**
 * Customers Page Component
 *
 * Shared customer management page used in both web and desktop apps
 * Repository should be configured at app initialization using setCustomerRepository()
 */
export function Customers() {
  const { show } = useToast();
  const dispatch = useAppDispatch();
  const { customer: currentTransactionCustomer, setCustomer: setTransactionCustomer } = useTransactionCustomer();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Get data from Redux store
  const customers = useAppSelector(selectCustomers);
  const loading = useAppSelector(selectCustomersLoading);
  const creating = useAppSelector(selectCustomersCreating);
  const updating = useAppSelector(selectCustomersUpdating);
  const deleting = useAppSelector(selectCustomersDeleting);
  const error = useAppSelector(selectCustomersError);

  // Track previous error to avoid showing stale errors
  const prevErrorRef = React.useRef<string | null>(null);
  const hasShownInitialErrorRef = React.useRef(false);

  // Fetch customers on mount and when navigating back to page
  useEffect(() => {
    const fetchData = async () => {
      try {
        hasShownInitialErrorRef.current = false;
        await dispatch(
          fetchCustomers({
            options: {
              useServer: true,
            },
            forceRefresh: false,
          })
        ).unwrap();
      } catch (err: any) {
        // ConditionError is expected when cache is valid - ignore it
        if (err?.name === 'ConditionError' || err?.message?.includes('condition callback')) {
          console.log('[Customers] Fetch skipped due to valid cache');
          return;
        }
        console.error('[Customers] Failed to fetch customers:', err);
        // Only show error if we don't have cached customers and haven't shown error yet
        if (customers.length === 0 && !hasShownInitialErrorRef.current) {
          hasShownInitialErrorRef.current = true;
          show('Failed to load customers', 'error');
        }
      }
    };

    fetchData();
  }, [dispatch, show]); // Removed customers from deps to avoid re-fetching

  // Show error toast only for new errors (not stale ones) and clear after showing
  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      prevErrorRef.current = error;
      show(error, 'error');
      // Clear the error after showing it to prevent re-showing on navigation
      setTimeout(() => {
        dispatch(clearCustomerError());
      }, 100);
    } else if (!error) {
      // Clear previous error reference when error is cleared
      prevErrorRef.current = null;
    }
  }, [error, show, dispatch]);

  // Handle customer save
  const handleCustomerSave = async (customerData: Omit<Customer, 'id'>) => {
    try {
      if (editingCustomer) {
        // Update existing customer
        const result = await dispatch(
          updateCustomer({
            id: editingCustomer.id!,
            data: customerData,
            options: { useServer: true },
          })
        ).unwrap();

        if (result.success && result.customer) {
          // Add to transaction (updating existing customer in transaction)
          setTransactionCustomer(result.customer);
          show(`Customer "${customerData.name}" updated successfully!`, 'success');
          setEditingCustomer(null);
        }
      } else {
        // Create new customer
        const result = await dispatch(
          createCustomer({
            data: customerData,
            options: { useServer: true },
          })
        ).unwrap();

        if (result.success && result.customer) {
          // Add to transaction
          setTransactionCustomer(result.customer);
          show(`Customer "${customerData.name}" added successfully!`, 'success');
        }
      }
    } catch (err) {
      console.error('[Customers] Failed to save customer:', err);
      show('Failed to save customer', 'error');
    }
  };

  const handleAddToTransaction = (customer: Customer) => {
    // Check if a customer is already selected in transaction
    if (currentTransactionCustomer) {
      if (currentTransactionCustomer.id === customer.id) {
        show('This customer is already selected in the transaction.', 'info');
      } else {
        show('A customer is already selected in the transaction. Please remove the existing customer first.', 'error');
      }
      return;
    }

    setTransactionCustomer(customer);
    show(`Customer "${customer.name}" added to transaction!`, 'success');
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!customer.id) {
      show('Cannot delete customer: missing ID', 'error');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${customer.name}?`)) {
      try {
        await dispatch(
          deleteCustomer({
            id: customer.id,
            options: { useServer: true },
          })
        ).unwrap();
        show(`Customer "${customer.name}" deleted successfully!`, 'success');
      } catch (err) {
        console.error('[Customers] Failed to delete customer:', err);
        show('Failed to delete customer', 'error');
      }
    }
  };

  const handleFormCancel = () => {
    setEditingCustomer(null);
  };

  return (
    <div 
      className="w-full p-8 overflow-hidden" 
      style={{ 
        backgroundColor: 'var(--color-bg-primary)',
        minHeight: '87vh',
      }}
    >
      <div className="flex gap-8">
        {/* Left Side - Customer Form (50% width) */}
        <div 
          className="w-1/2 flex flex-col min-w-0"
          style={{ 
            position: 'sticky',
            top: '1rem',
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 2rem)',
          }}
        >
          <CustomerForm
            customer={editingCustomer}
            onSave={handleCustomerSave}
            onCancel={handleFormCancel}
            creating={creating}
            updating={updating}
          />
        </div>

        {/* Right Side - Customer List (50% width) */}
        <div 
          className="w-1/2 flex flex-col min-w-0"
          style={{ 
            maxHeight: '80vh',
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 mb-4" style={{ borderColor: 'var(--color-accent-blue)' }}></div>
                <p style={{ color: 'var(--color-text-secondary)' }}>Loading customers...</p>
              </div>
            </div>
          ) : (
            <CustomerList
              customers={customers}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onEditCustomer={handleEditCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onAddToTransaction={handleAddToTransaction}
            />
          )}
        </div>
      </div>
    </div>
  );
}

