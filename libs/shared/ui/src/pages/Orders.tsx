import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Printer, FileText } from 'lucide-react';
import { useToast, Loading } from '@monorepo/shared-ui';
import type { SalesOrder } from '@monorepo/shared-data-access';

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

const ITEMS_PER_PAGE = 10;

export function Orders({ salesOrderRepo }: OrdersProps = {}) {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { show } = useToast();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, []);

  // Sync search term with URL params
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    setSearchTerm(urlSearch);
  }, [searchParams]);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    // Normalize search query: replace "/" with "-" for scanner compatibility
    const normalizedQuery = searchTerm.toLowerCase().replace(/\//g, '-');
    return orders.filter((order) => {
      const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.toLowerCase();
      // Normalize order numbers for comparison
      const normalizedOrderNumber = order.orderNumber?.toLowerCase().replace(/\//g, '-') || '';
      const normalizedOrderId = order.id?.toLowerCase().replace(/\//g, '-') || '';
      return (
        normalizedOrderNumber.includes(normalizedQuery) ||
        customerName.includes(normalizedQuery) ||
        normalizedOrderId.includes(normalizedQuery)
      );
    });
  }, [orders, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const handleSelectOrder = useCallback(
    (order: SalesOrder) => {
      setSelectedOrder(order);
    },
    [],
  );

  const handleViewDetails = useCallback(
    (order: SalesOrder) => {
      const reference = encodeURIComponent(order.orderNumber || order.id);
      navigate(`/orders/${reference}`);
    },
    [navigate],
  );

  const handlePrintOrder = useCallback(
    (order: SalesOrder) => {
      show(`Printing order ${order.orderNumber || order.id}`, 'info');
    },
    [show],
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedOrder(null);
  }, []);

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
      <div className="flex-1 flex flex-col min-h-0">
        {/* Detail panel */}
        {selectedOrder && (
          <div className="px-4 mt-4">
            <div
              className="w-full p-4 rounded border"
              style={{
                borderColor: 'var(--color-border-light)',
                backgroundColor: 'var(--color-bg-card)',
              }}
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Order reference
                    </p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {selectedOrder.orderNumber || selectedOrder.id}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewDetails(selectedOrder)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded border text-sm"
                      style={{
                        borderColor: 'var(--color-border-light)',
                        color: 'var(--color-text-primary)',
                        backgroundColor: 'var(--color-bg-secondary)',
                      }}
                    >
                      <FileText className="w-4 h-4" />
                      Detail
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintOrder(selectedOrder)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded text-sm"
                      style={{
                        backgroundColor: 'var(--color-accent-blue)',
                        color: 'var(--color-text-light)',
                      }}
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseDetail}
                      className="p-2 rounded border"
                      style={{
                        borderColor: 'var(--color-border-light)',
                        color: 'var(--color-text-secondary)',
                      }}
                      aria-label="Close detail panel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Customer
                    </p>
                    <p style={{ color: 'var(--color-text-primary)' }}>
                      {selectedOrder.customer?.firstName
                        ? `${selectedOrder.customer.firstName} ${selectedOrder.customer.lastName || ''}`.trim()
                        : 'Walk-in'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Sales person
                    </p>
                    <p style={{ color: 'var(--color-text-primary)' }}>
                      {selectedOrder.salesPerson?.name || selectedOrder.salesPerson?.code || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Date created
                    </p>
                    <p style={{ color: 'var(--color-text-primary)' }}>{formatDate(selectedOrder.completedAt || selectedOrder.orderDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Status
                    </p>
                    <p style={{ color: 'var(--color-text-primary)' }}>{selectedOrder.status || '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-2">
                  <div>
                    <p className="text-xs uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Subtotal
                    </p>
                    <p style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(selectedOrder.subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Discount
                    </p>
                    <p style={{ color: 'var(--color-text-primary)' }}>-{formatCurrency(selectedOrder.discountAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Tax
                    </p>
                    <p style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(selectedOrder.taxAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Total
                    </p>
                    <p style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(selectedOrder.totalAmount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders table */}
        <div 
          className="flex-1 overflow-y-auto px-4 pb-4 mt-4 orders-scroll-container"
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
            .orders-table-wrapper {
              overflow-x: auto;
            }
            .orders-table thead {
              position: sticky;
              top: 0;
              z-index: 15;
              background-color: var(--color-bg-card);
            }
            .orders-table thead th {
              position: sticky;
              top: 0;
              z-index: 20;
              background-color: var(--color-bg-card);
              border-bottom: 1px solid var(--color-border-light);
            }
          `}</style>
          <div className="w-full rounded border overflow-hidden" style={{ borderColor: 'var(--color-border-light)' }}>
            <div className="orders-table-wrapper">
              <table className="orders-table w-full text-sm" style={{ color: 'var(--color-text-primary)' }}>
                <thead>
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Customer</th>
                    <th className="text-left px-4 py-2 font-semibold">Order #</th>
                    <th className="text-left px-4 py-2 font-semibold">Date</th>
                    <th className="text-left px-4 py-2 font-semibold">Total</th>
                    <th className="text-left px-4 py-2 font-semibold">Status</th>
                    <th className="text-left px-4 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => {
                  const isActive = selectedOrder?.id === order.id;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className="cursor-pointer border-t"
                      style={{
                        borderColor: 'var(--color-border-light)',
                        backgroundColor: isActive ? 'var(--color-bg-hover)' : 'transparent',
                      }}
                    >
                      <td className="px-4 py-3">
                        {order.customer?.firstName
                          ? `${order.customer.firstName} ${order.customer.lastName || ''}`.trim()
                          : 'Walk-in'}
                      </td>
                      <td className="px-4 py-3">{order.orderNumber || order.id}</td>
                      <td className="px-4 py-3">{formatDate(order.completedAt || order.orderDate)}</td>
                      <td className="px-4 py-3">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-4 py-3">{order.status || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(order);
                            }}
                            className="text-xs flex items-center gap-1"
                            style={{ color: 'var(--color-accent-blue)' }}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Detail
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintOrder(order);
                            }}
                            className="text-xs flex items-center gap-1"
                            style={{ color: 'var(--color-accent-blue)' }}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {searchTerm.trim() ? `No orders match "${searchTerm}".` : 'No orders found.'}
              </div>
            )}
            {filteredOrders.length > 0 && (
              <div
                className="flex flex-wrap items-center justify-between px-4 py-3 border-t text-sm gap-2"
                style={{ borderColor: 'var(--color-border-light)', color: 'var(--color-text-secondary)' }}
              >
                <span>
                  {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length}
                </span>
                <div className="flex items-center gap-2 text-base">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed"
                    title="First page"
                    style={{
                      borderColor: 'var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                      backgroundColor: 'var(--color-bg-secondary)',
                    }}
                  >
                    «
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Previous page"
                    style={{
                      borderColor: 'var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                      backgroundColor: 'var(--color-bg-secondary)',
                    }}
                  >
                    ‹
                  </button>
                  <span style={{ color: 'var(--color-text-primary)' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Next page"
                    style={{
                      borderColor: 'var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                      backgroundColor: 'var(--color-bg-secondary)',
                    }}
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Last page"
                    style={{
                      borderColor: 'var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                      backgroundColor: 'var(--color-bg-secondary)',
                    }}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

    </div>
  );
}

export default Orders;

