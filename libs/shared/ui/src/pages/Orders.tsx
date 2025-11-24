import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, ArrowLeft, Receipt, X } from 'lucide-react';
import { useToast, Loading } from '@monorepo/shared-ui';
import type { SalesOrder } from '@monorepo/shared-data-access';
import { OrdersGrid, OrderDetailPanel } from '../components/orders/index.js';
import { ReceiptTemplate } from '../components/sales/ReceiptTemplate.js';

export interface OrdersProps {
  salesOrderRepo?: {
    getOrders?: (options?: { page?: number; limit?: number }) => Promise<{
      success: boolean;
      orders?: SalesOrder[];
      total?: number;
      page?: number;
      totalPages?: number;
      error?: string;
    }>;
  };
}

export function Orders({ salesOrderRepo }: OrdersProps = {}) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      if (salesOrderRepo?.getOrders) {
        const result = await salesOrderRepo.getOrders({ page: 1, limit: 100 });
        if (result.success && result.orders) {
          setOrders(result.orders);
        } else {
          show(result.error || 'Failed to load orders', 'error');
        }
      } else {
        show('Orders repository not available', 'error');
      }
    } catch (error) {
      show(error instanceof Error ? error.message : 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = (order: SalesOrder) => {
    setSelectedOrder(order);
    setShowDetailPanel(true);
  };

  const handleCloseDetail = () => {
    setIsAnimatingOut(true);
    // Wait for slide-out animation to complete
    setTimeout(() => {
      setShowDetailPanel(false);
      setIsAnimatingOut(false);
      setSelectedOrder(null);
    }, 300);
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'Rs 0.00';
    // Format number with commas and 2 decimal places, then add Rs prefix
    const formatted = new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `Rs ${formatted}`;
  };

  const handleShowReceipt = () => {
    if (!selectedOrder) {
      show('Please select an order first', 'info');
      return;
    }
    setShowReceiptModal(true);
  };

  const handleCloseReceipt = () => {
    setShowReceiptModal(false);
  };

  // Prepare receipt data from selected order
  const getReceiptData = () => {
    if (!selectedOrder) return null;

    const orderDate = selectedOrder.completedAt || selectedOrder.orderDate;
    const dateTime = formatDate(orderDate);
    
    // Get cashier name
    const cashierName = selectedOrder.salesPerson?.name || 
                       selectedOrder.salesPerson?.code || 
                       'Cashier';

    // Prepare customer data if available
    const customer = selectedOrder.customer && selectedOrder.customer.id
      ? {
          id: selectedOrder.customer.id,
          firstName: selectedOrder.customer.firstName || '',
          lastName: selectedOrder.customer.lastName || '',
          email: selectedOrder.customer.email,
          phone: selectedOrder.customer.phone,
          customerCode: selectedOrder.customer.customerCode,
        }
      : undefined;

    // Create a simplified receipt with available data
    // Note: We don't have lineItems and payments in the order data,
    // so we'll create a summary receipt
    return {
      storeName: 'TRADE UNLEASHED',
      storeNameArabic: 'التجارة المنطلِقة',
      storeUrl: 'http://www.tradeunleashed.com',
      posNumber: 'TRADE UNLEASHED',
      invoiceNumber: selectedOrder.orderNumber || selectedOrder.id,
      orderNumber: selectedOrder.orderNumber || selectedOrder.id,
      orderId: selectedOrder.id,
      dateTime: dateTime,
      cashier: cashierName,
      customer,
      lineItems: [], // Empty - we don't have line items in the order data
      payments: [], // Empty - we don't have payments in the order data
      grossTotal: selectedOrder.subtotal || 0,
      itemDiscount: selectedOrder.discountAmount || 0,
      netTotal: selectedOrder.totalAmount || 0,
      tendered: selectedOrder.amountPaid || 0,
      change: selectedOrder.changeAmount || 0,
    };
  };

  if (loading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-40"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <Loading
          message="Loading orders..."
          size="lg"
        />
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        height: 'calc(100vh - var(--navbar-height, 80px))',
      }}
    >
      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Orders Grid */}
        <div
          className="flex-1 min-w-0 border-r"
          style={{
            borderColor: 'var(--color-border-light)',
            width: (showDetailPanel && !isAnimatingOut) ? '66.666%' : '100%',
            transition: 'width 0.3s ease-out',
            willChange: 'width',
          }}
        >
          <div
            className="flex flex-col h-full w-full min-h-0"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
            }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 border-b flex-shrink-0"
              style={{
                borderColor: 'var(--color-border-light)',
                backgroundColor: 'var(--color-bg-card)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/')}
                    className="p-1.5 rounded transition-colors flex-shrink-0"
                    style={{
                      color: 'var(--color-text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }}
                    aria-label="Back to home"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2
                    className="text-base font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Orders
                  </h2>
                  <span
                    className="text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {orders.length} {orders.length === 1 ? 'order' : 'orders'} found
                  </span>
                </div>
                <button
                  onClick={handleShowReceipt}
                  disabled={!selectedOrder}
                  className="p-1.5 rounded transition-colors flex-shrink-0"
                  style={{
                    color: selectedOrder ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    opacity: selectedOrder ? 1 : 0.5,
                    cursor: selectedOrder ? 'pointer' : 'not-allowed',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedOrder) {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                      e.currentTarget.style.color = '#ea580c';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedOrder) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                    }
                  }}
                  aria-label="View receipt"
                  title={selectedOrder ? 'View receipt' : 'Select an order to view receipt'}
                >
                  <Receipt className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Orders Grid */}
            <div 
              className="flex-1 min-h-0 overflow-y-auto p-3 orders-scroll-container"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--color-border-light) var(--color-bg-secondary)',
              }}
            >
              <style>{`
                .orders-scroll-container::-webkit-scrollbar {
                  width: 10px;
                  height: 10px;
                }
                .orders-scroll-container::-webkit-scrollbar-track {
                  background: var(--color-bg-secondary);
                  border-radius: 10px;
                }
                .orders-scroll-container::-webkit-scrollbar-thumb {
                  background-color: var(--color-border-light);
                  border-radius: 10px;
                  border: 2px solid var(--color-bg-secondary);
                  transition: background-color 0.2s ease;
                }
                .orders-scroll-container::-webkit-scrollbar-thumb:hover {
                  background-color: var(--color-border-medium);
                }
              `}</style>
              <OrdersGrid
                orders={orders}
                selectedOrderId={selectedOrder?.id || null}
                onOrderClick={handleOrderClick}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
                columns={(showDetailPanel && !isAnimatingOut) ? 3 : 4}
              />
            </div>
          </div>
        </div>

        {/* Right Panel - Order Details */}
        {showDetailPanel && selectedOrder && (
          <div 
            className="flex-shrink-0"
            style={{
              width: isAnimatingOut ? '0%' : '33.334%',
              transition: 'width 0.3s ease-out',
              overflow: 'hidden',
            }}
          >
            <OrderDetailPanel
              order={selectedOrder}
              onClose={handleCloseDetail}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
              isAnimatingOut={isAnimatingOut}
            />
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedOrder && getReceiptData() && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleCloseReceipt}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              width: '100mm',
              paddingLeft: '24px',
              paddingRight: '24px',
            }}
          >
            <style>{`
              .receipt-modal-scroll-container {
                scrollbar-width: none;
                -ms-overflow-style: none;
              }
              .receipt-modal-scroll-container::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div className="flex items-center justify-between mb-4 pt-6">
              <h3
                className="text-lg font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Receipt - {selectedOrder.orderNumber}
              </h3>
              <button
                onClick={handleCloseReceipt}
                className="p-2 rounded transition-colors"
                style={{
                  color: 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div 
              className="receipt-modal-scroll-container" 
              style={{ 
                maxHeight: 'calc(90vh - 120px)', 
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              <ReceiptTemplate data={getReceiptData()!} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;

