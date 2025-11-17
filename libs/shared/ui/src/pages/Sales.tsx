import React, { useState, useEffect } from 'react';
import { SalesOrderForm, CreateSalesOrderInput } from '../components/sales/index.js';
import { useToast } from '../hooks/useToast.js';
import {
  useAppDispatch,
  useAppSelector,
  // Customer
  fetchCustomers,
  selectCustomers,
  selectCustomersLoading,
  // Sales Order
  createOrder,
  validateCoupon,
  clearCouponValidation,
  clearSalesOrderError,
  selectCouponValidation,
  selectSalesOrderCreating,
  selectSalesOrderValidatingCoupon,
  selectSalesOrderError,
  // Products
  fetchProducts,
  selectProducts,
  selectProductsLoading,
} from '@monorepo/shared-store';
import type { Customer, SalesPerson, ProductVariant } from '../components/sales/index.js';

/**
 * Sales Page Component
 *
 * Shared sales order creation page used in both web and desktop apps
 * Repositories should be configured at app initialization
 */
export function Sales() {
  const { show } = useToast();
  const dispatch = useAppDispatch();

  // Local state for modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductBrowser, setShowProductBrowser] = useState(false);

  // Get data from Redux store
  const customers = useAppSelector(selectCustomers);
  const customersLoading = useAppSelector(selectCustomersLoading);
  const products = useAppSelector(selectProducts);
  const productsLoading = useAppSelector(selectProductsLoading);
  const couponValidation = useAppSelector(selectCouponValidation);
  const creating = useAppSelector(selectSalesOrderCreating);
  const validatingCoupon = useAppSelector(selectSalesOrderValidatingCoupon);
  const error = useAppSelector(selectSalesOrderError);

  // Track previous error to avoid showing stale errors
  const prevErrorRef = React.useRef<string | null>(null);

  // Mock sales persons data (should come from Redux in production)
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      username: 'jdoe',
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      username: 'jsmith',
    },
  ]);

  // Fetch necessary data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch customers
        await dispatch(
          fetchCustomers({
            options: { useServer: true },
            forceRefresh: false,
          })
        ).unwrap();
      } catch (err: any) {
        if (err?.name === 'ConditionError') {
          console.log('[Sales] Fetch skipped due to valid cache');
          return;
        }
        console.error('[Sales] Failed to fetch customers:', err);
        if (customers.length === 0) {
          show('Failed to load customers', 'error');
        }
      }

      try {
        // Fetch products
        await dispatch(
          fetchProducts({
            page: 1,
            limit: 100,
            useServer: true,
          })
        ).unwrap();
      } catch (err: any) {
        console.error('[Sales] Failed to fetch products:', err);
        if (products.length === 0) {
          show('Failed to load products', 'error');
        }
      }
    };

    fetchData();
  }, [dispatch]);

  // Show error toast for new errors
  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      prevErrorRef.current = error;
      show(error, 'error');
      setTimeout(() => {
        dispatch(clearSalesOrderError());
      }, 100);
    } else if (!error) {
      prevErrorRef.current = null;
    }
  }, [error, show, dispatch]);

  // Map customers to the format expected by SalesOrderForm
  const mappedCustomers: Customer[] = customers.map((c) => ({
    id: c.id,
    firstName: c.firstName || '',
    lastName: c.lastName || '',
    email: c.email,
    phone: c.phone,
    customerCode: c.customerCode,
  }));

  // Map products to the format expected by SalesOrderForm
  const mappedProducts: ProductVariant[] = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    variantName: p.name,
    product: {
      id: p.id,
      name: p.name,
    },
  }));

  const handleCreateOrder = async (data: CreateSalesOrderInput) => {
    try {
      // Map the form data to the API format
      const orderData = {
        locationId: '1', // TODO: Get from current user's location
        cashierId: '1', // TODO: Get from current user
        customerId: data.customerId,
        lineItems: data.lineItems.map((item) => ({
          variantId: item.variantId,
          salesPersonId: item.salesPersonId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          saleDiscount: item.saleDiscount,
          customDiscount: item.customDiscount,
          notes: item.notes,
        })),
        orderLevelDiscount: data.orderLevelDiscount,
        adjustment: data.adjustment,
        couponCode: data.couponCode,
        notes: data.notes,
      };

      const result = await dispatch(createOrder(orderData)).unwrap();

      if (result.success && result.order) {
        show('Sales order created successfully!', 'success');
        // TODO: Navigate to order details or clear form
      } else {
        show(result.error || 'Failed to create order', 'error');
      }
    } catch (err: any) {
      console.error('[Sales] Failed to create order:', err);
      show(err.message || 'Failed to create order', 'error');
    }
  };

  const handleValidateCoupon = async (code: string, customerId?: string) => {
    try {
      await dispatch(validateCoupon({ couponCode: code, customerId })).unwrap();
    } catch (err: any) {
      console.error('[Sales] Failed to validate coupon:', err);
      // Error is handled by Redux state
    }
  };

  const handleClearCoupon = () => {
    dispatch(clearCouponValidation());
  };

  const handleCreateCustomer = () => {
    // TODO: Open customer creation modal
    setShowCustomerModal(true);
    show('Customer creation modal - To be implemented', 'info');
  };

  const handleAddProduct = () => {
    // TODO: Open product browser to add items
    setShowProductBrowser(true);
    show('Product browser - To be implemented', 'info');
  };

  const isLoading = customersLoading || productsLoading;

  if (isLoading && customers.length === 0 && products.length === 0) {
    return (
      <div
        className="w-full h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 mb-4"
            style={{ borderColor: 'var(--color-accent-blue)' }}
          />
          <p
            className="text-lg"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Loading sales data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <SalesOrderForm
        customers={mappedCustomers}
        salesPersons={salesPersons}
        products={mappedProducts}
        loading={isLoading}
        creating={creating}
        validatingCoupon={validatingCoupon}
        couponValidation={couponValidation}
        onCreateOrder={handleCreateOrder}
        onCreateCustomer={handleCreateCustomer}
        onValidateCoupon={handleValidateCoupon}
        onClearCoupon={handleClearCoupon}
        onAddProduct={handleAddProduct}
        taxRate={0.1} // 10% tax - TODO: Get from settings
      />
    </div>
  );
}
