import React, { useState, useEffect } from 'react';
import { SalesOrderForm, CreateSalesOrderInput, CreateSalesOrderResult } from '../components/sales/index.js';
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
import type { Customer, SalesPerson, ProductVariant, PaymentMethod } from '../components/sales/index.js';
import type {
  ParkedOrderListItem,
  SalesOrderRepository,
  ParkedOrderRepository,
  PaymentMethodRepository,
} from '@monorepo/shared-data-access';

/**
 * Sales Page Component
 *
 * Shared sales order creation page used in both web and desktop apps
 * Repositories should be configured at app initialization
 */

export interface SalesProps {
  // Repositories - injected by app-specific wrapper
  salesOrderRepo?: SalesOrderRepository;
  parkedOrderRepo?: ParkedOrderRepository;
  paymentMethodRepo?: PaymentMethodRepository;

  // Current user/location - injected by app
  currentUserId?: string;
  currentLocationId?: string;
}

export function Sales({
  salesOrderRepo,
  parkedOrderRepo,
  paymentMethodRepo,
  currentUserId = '1',
  currentLocationId = '1',
}: SalesProps) {
  const { show } = useToast();
  const dispatch = useAppDispatch();

  // Local state for modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductBrowser, setShowProductBrowser] = useState(false);

  // Parked orders state
  const [parkedOrders, setParkedOrders] = useState<ParkedOrderListItem[]>([]);
  const [loadingParkedOrders, setLoadingParkedOrders] = useState(false);
  const [currentParkedOrderId, setCurrentParkedOrderId] = useState<string | null>(null);

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

  // Mock payment methods data (should come from Redux/API in production)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      code: 'CASH',
      name: 'Cash',
      type: 'Cash',
      isActive: true,
      requiresAuthorization: false,
      sortOrder: 1,
    },
    {
      id: '2',
      code: 'CARD',
      name: 'Credit/Debit Card',
      type: 'Card',
      isActive: true,
      requiresAuthorization: true,
      sortOrder: 2,
    },
    {
      id: '3',
      code: 'BANK_TRANSFER',
      name: 'Bank Transfer',
      type: 'BankTransfer',
      isActive: true,
      requiresAuthorization: false,
      sortOrder: 3,
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

      // Fetch payment methods from repository
      if (paymentMethodRepo) {
        try {
          const result = await paymentMethodRepo.getPaymentMethods({ isActive: true, useServer: true });
          if (result.success && result.paymentMethods) {
            setPaymentMethods(result.paymentMethods.map(pm => ({
              id: pm.id,
              code: pm.code,
              name: pm.name,
              type: pm.type,
              isActive: pm.isActive,
              requiresAuthorization: pm.requiresAuthorization,
              sortOrder: pm.sortOrder,
              icon: pm.icon,
            })));
          }
        } catch (err) {
          console.error('[Sales] Failed to fetch payment methods:', err);
          // Keep using mock data if fetch fails
        }
      }
    };

    fetchData();
  }, [dispatch, paymentMethodRepo]);

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
      if (!salesOrderRepo) {
        show('Sales order repository not available', 'error');
        return { success: false, error: 'Sales order repository not available' };
      }

      // Map the form data to the API format
      const orderData = {
        locationId: currentLocationId,
        cashierId: currentUserId,
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
        payments: data.payments.map((payment) => ({
          paymentMethodId: payment.paymentMethodId,
          amount: payment.amount,
          cardLast4: payment.cardLast4,
          cardBrand: payment.cardBrand,
          authorizationCode: payment.authorizationCode,
          transactionId: payment.transactionId,
        })),
        orderLevelDiscount: data.orderLevelDiscount,
        adjustment: data.adjustment,
        couponCode: data.couponCode,
        notes: data.notes,
      };

      const result = await salesOrderRepo.createOrder(orderData);

      if (result.success && result.order) {
        show(
          `Sales order created successfully! Order #: ${result.order.orderNumber}`,
          'success'
        );

        // If this was completing a parked order, remove it from parked orders
        if (currentParkedOrderId && parkedOrderRepo) {
          try {
            await parkedOrderRepo.completeParkedOrder(currentParkedOrderId);
            setCurrentParkedOrderId(null);
            // Refresh parked orders list
            handleSearchParkedOrders('');
            show('Parked order completed successfully!', 'success');
          } catch (err) {
            console.error('[Sales] Failed to complete parked order:', err);
            // Order was created, but parked order cleanup failed - not critical
          }
        }

        // Return the order result for print receipt
        return {
          success: true,
          order: {
            id: result.order.id,
            orderNumber: result.order.orderNumber,
            invoiceNumber: result.order.invoiceNumber || result.order.orderNumber,
          },
        };
      } else {
        show(result.error || 'Failed to create order', 'error');
        return { success: false, error: result.error || 'Failed to create order' };
      }
    } catch (err: any) {
      console.error('[Sales] Failed to create order:', err);
      show(err.message || 'Failed to create order', 'error');
      return { success: false, error: err.message || 'Failed to create order' };
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

  // ============ Parked Order Handlers ============

  const handleParkOrder = async (orderData: CreateSalesOrderInput) => {
    if (!salesOrderRepo || !parkedOrderRepo) {
      show('Parked orders not available - repositories not initialized', 'error');
      return;
    }

    try {
      // First, create the order with status 'Open' (will be changed to 'Parked')
      const orderResult = await salesOrderRepo.createOrder(
        {
          locationId: currentLocationId,
          cashierId: currentUserId,
          customerId: orderData.customerId,
          lineItems: orderData.lineItems.map((item) => ({
            variantId: item.variantId,
            salesPersonId: item.salesPersonId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            saleDiscount: item.saleDiscount,
            customDiscount: item.customDiscount,
            notes: item.notes,
          })),
          payments: orderData.payments.map((payment) => ({
            paymentMethodId: payment.paymentMethodId,
            amount: payment.amount,
            cardLast4: payment.cardLast4,
            cardBrand: payment.cardBrand,
            authorizationCode: payment.authorizationCode,
            transactionId: payment.transactionId,
          })),
          orderLevelDiscount: orderData.orderLevelDiscount,
          adjustment: orderData.adjustment,
          couponCode: orderData.couponCode,
          notes: orderData.notes,
        },
        false // Create locally first, don't try server for park operation
      );

      if (!orderResult.success || !orderResult.order) {
        show(orderResult.error || 'Failed to create order for parking', 'error');
        return;
      }

      // Now park the order
      const parkResult = await parkedOrderRepo.parkOrder({
        orderId: orderResult.order.id,
        parkedBy: currentUserId,
        customerId: orderData.customerId,
        notes: orderData.notes,
      });

      if (parkResult.success && parkResult.parkedOrder) {
        show(`Order parked successfully! Park #: ${parkResult.parkedOrder.parkNumber}`, 'success');
        // Refresh parked orders list
        handleSearchParkedOrders('');
      } else {
        show(parkResult.error || 'Failed to park order', 'error');
      }
    } catch (err: any) {
      console.error('[Sales] Failed to park order:', err);
      show(err.message || 'Failed to park order', 'error');
    }
  };

  const handleSearchParkedOrders = async (searchTerm: string) => {
    if (!parkedOrderRepo) {
      console.warn('[Sales] ParkedOrderRepository not available');
      return;
    }

    setLoadingParkedOrders(true);
    try {
      const result = await parkedOrderRepo.searchParkedOrders({
        searchTerm,
        useServer: true,
      });

      if (result.success) {
        setParkedOrders(result.parkedOrders || []);
      } else {
        console.error('[Sales] Failed to search parked orders:', result.error);
        setParkedOrders([]);
      }
    } catch (err: any) {
      console.error('[Sales] Error searching parked orders:', err);
      setParkedOrders([]);
    } finally {
      setLoadingParkedOrders(false);
    }
  };

  const handleLoadParkedOrder = async (parkedOrderId: string, orderId: string, _order?: ParkedOrderListItem) => {
    if (!parkedOrderRepo) {
      show('Parked orders not available', 'error');
      return;
    }

    try {
      const result = await parkedOrderRepo.loadParkedOrder(parkedOrderId);

      if (result.success && result.data) {
        setCurrentParkedOrderId(parkedOrderId);
        // The SalesOrderForm will handle populating the form via the populateFormFromParkedOrder method
        // We need to pass the data somehow - we'll use a callback or state
        show('Parked order loaded successfully', 'success');

        // TODO: Trigger form population
        // This would need to be implemented in SalesOrderForm to accept external data
        console.log('[Sales] Loaded parked order data:', result.data);
      } else {
        show(result.error || 'Failed to load parked order', 'error');
      }
    } catch (err: any) {
      console.error('[Sales] Error loading parked order:', err);
      show(err.message || 'Failed to load parked order', 'error');
    }
  };

  const handleDeleteParkedOrder = async (parkedOrderId: string) => {
    if (!parkedOrderRepo) {
      show('Parked orders not available', 'error');
      return;
    }

    try {
      const result = await parkedOrderRepo.deleteParkedOrder(parkedOrderId);

      if (result.success) {
        show('Parked order deleted successfully', 'success');
        // Refresh parked orders list
        handleSearchParkedOrders('');
      } else {
        show(result.error || 'Failed to delete parked order', 'error');
      }
    } catch (err: any) {
      console.error('[Sales] Error deleting parked order:', err);
      show(err.message || 'Failed to delete parked order', 'error');
    }
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
        paymentMethods={paymentMethods}
        loading={isLoading}
        creating={creating}
        validatingCoupon={validatingCoupon}
        couponValidation={couponValidation}
        // Parked orders
        parkedOrders={parkedOrders}
        loadingParkedOrders={loadingParkedOrders}
        // Callbacks
        onCreateOrder={handleCreateOrder}
        onCreateCustomer={handleCreateCustomer}
        onValidateCoupon={handleValidateCoupon}
        onClearCoupon={handleClearCoupon}
        onAddProduct={handleAddProduct}
        // Parked order callbacks
        onParkOrder={parkedOrderRepo ? handleParkOrder : undefined}
        onSearchParkedOrders={parkedOrderRepo ? handleSearchParkedOrders : undefined}
        onLoadParkedOrder={parkedOrderRepo ? handleLoadParkedOrder : undefined}
        onDeleteParkedOrder={parkedOrderRepo ? handleDeleteParkedOrder : undefined}
        // Settings
        taxRate={0.1} // 10% tax - TODO: Get from settings
      />
    </div>
  );
}
