/**
 * Customer Selectors
 *
 * Memoized selectors for efficient data access from Redux store
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { Customer } from '../slices/customerSlice';

// Base selectors
export const selectCustomerState = (state: RootState) => state.customer;

export const selectCustomers = (state: RootState) => state.customer.customers;

export const selectCustomersLoading = (state: RootState) => state.customer.loading;

export const selectCustomersCreating = (state: RootState) => state.customer.creating;

export const selectCustomersUpdating = (state: RootState) => state.customer.updating;

export const selectCustomersDeleting = (state: RootState) => state.customer.deleting;

export const selectCustomersError = (state: RootState) => state.customer.error;

export const selectSelectedCustomer = (state: RootState) => state.customer.selectedCustomer;

export const selectCustomersIsOffline = (state: RootState) => state.customer.isOffline;

export const selectCustomersLastFetched = (state: RootState) => state.customer.lastFetched;

// Memoized selectors
export const selectCustomerById = createSelector(
  [selectCustomers, (_state: RootState, customerId: string) => customerId],
  (customers, customerId) => customers.find(customer => customer.id === customerId) || null
);

export const selectCustomerCount = createSelector(
  [selectCustomers],
  (customers) => customers.length
);

// Check if cache is fresh
export const selectCustomerIsCacheFresh = createSelector(
  [selectCustomersLastFetched, selectCustomerState],
  (lastFetched, customerState) => {
    if (!lastFetched) return false;
    const timeSinceLastFetch = Date.now() - lastFetched;
    return timeSinceLastFetch < customerState.cacheTimeout;
  }
);

// Get cache age in seconds
export const selectCustomerCacheAge = createSelector(
  [selectCustomersLastFetched],
  (lastFetched) => {
    if (!lastFetched) return null;
    return Math.round((Date.now() - lastFetched) / 1000);
  }
);

