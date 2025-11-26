import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Loading, useToast } from '@monorepo/shared-ui';
import type {
  SalesOrder,
  OrderRecallLineItem,
  OrderRecallCustomer,
  OrderPaymentSummary,
} from '@monorepo/shared-data-access';

export interface OrderDetailProps {
  salesOrderRepo?: {
    getOrderByNumber?: (orderNumber: string) => Promise<{
      success: boolean;
      data?: {
        order?: SalesOrder;
        lineItems?: OrderRecallLineItem[];
        customer?: OrderRecallCustomer;
        payments?: OrderPaymentSummary[];
      };
      error?: string;
    }>;
  };
}

const formatCurrency = (value?: number | null) => {
  const numberValue = typeof value === 'number' ? value : 0;
  const formatted = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);
  return `Rs ${formatted}`;
};

const formatDiscountValue = (amount?: number | null, percent?: number | null) => {
  if (percent !== undefined && percent !== null && percent > 0) {
    return `${percent}%`;
  }
  if (amount !== undefined && amount !== null && amount !== 0) {
    return formatCurrency(amount);
  }
  return '—';
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function OrderDetail({ salesOrderRepo }: OrderDetailProps = {}) {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { show } = useToast();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [lineItems, setLineItems] = useState<OrderRecallLineItem[]>([]);
  const [customer, setCustomer] = useState<OrderRecallCustomer | undefined>();
  const [payments, setPayments] = useState<OrderPaymentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setError('Order reference missing.');
      setLoading(false);
      return;
    }
    if (!salesOrderRepo?.getOrderByNumber) {
      setError('Order repository not available.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const decodedOrderId = decodeURIComponent(orderId);
      const result = await salesOrderRepo.getOrderByNumber(decodedOrderId);
      if (result.success && result.data?.order) {
        setOrder(result.data.order);
        setLineItems(result.data.lineItems ?? []);
        setCustomer(result.data.customer);
        setPayments(result.data.payments ?? []);
      } else {
        const message = result.error || `Order ${decodedOrderId} not found.`;
        setError(message);
        show(message, 'error');
      }
    } catch (err) {
      console.error('[OrderDetail] Failed to load order:', err);
      setError('Failed to load order details.');
      show('Failed to load order details.', 'error');
    } finally {
      setLoading(false);
    }
  }, [orderId, salesOrderRepo, show]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const resolvedPayments = useMemo(() => {
    if (payments.length > 0) {
      return payments;
    }

    const orderPayments = ((order as any)?.payments ?? []) as Array<{
      paymentMethodName?: string;
      method?: string;
      paymentMethodId?: string;
      amount?: number;
    }>;

    return orderPayments.map((p, idx) => ({
      id: `fallback-${idx}`,
      orderId: order?.id ?? '',
      paymentMethodId: p.paymentMethodId || p.method || '',
      amount: p.amount ?? 0,
      paymentMethodName: p.paymentMethodName || p.method || p.paymentMethodId,
    }));
  }, [payments, order]);

  // Get all unique payment methods from OrderPayment table (must be before early returns)
  const paymentMethodLabel = useMemo(() => {
    if (resolvedPayments.length === 0) {
      return '—';
    }

    // Get unique payment method names, prioritizing paymentMethodName over paymentMethodId
    const methodNames = resolvedPayments
      .map((p) => {
        // Try to get a readable name first
        if (p.paymentMethodName) {
          return p.paymentMethodName;
        }
        // Fall back to paymentMethodId and normalize common values
        if (p.paymentMethodId) {
          const id = p.paymentMethodId.toLowerCase();
          if (id.includes('cash')) return 'Cash';
          if (id.includes('card')) return 'Card';
          return p.paymentMethodId;
        }
        return null;
      })
      .filter((name): name is string => name !== null && name.trim() !== '');

    // Remove duplicates and join with comma
    const uniqueMethods = [...new Set(methodNames)];
    return uniqueMethods.length > 0 ? uniqueMethods.join(', ') : '—';
  }, [resolvedPayments]);

  const summary = useMemo(() => {
    const totalUnits = lineItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    const subtotal = lineItems.reduce((sum, item) => sum + (item.unitPrice ?? 0) * (item.quantity ?? 0), 0);
    const lineDiscountTotal = lineItems.reduce((sum, item) => sum + (item.lineDiscount ?? 0), 0);
    const customDiscountTotal = lineItems.reduce((sum, item) => sum + (item.customDiscountAmount ?? 0), 0);
    const totalDiscount = lineDiscountTotal + customDiscountTotal;
    return {
      totalUnits,
      subtotal,
      discount: totalDiscount,
      total: order?.totalAmount ?? Math.max(0, subtotal - totalDiscount),
    };
  }, [lineItems, order]);

  const toggleLine = useCallback((lineId: string) => {
    setExpandedLineId((prev) => (prev === lineId ? null : lineId));
  }, []);

  // Compute derived values (must be before early returns to maintain hook order)
  const customerName =
    customer?.name ||
    [customer?.firstName ?? order?.customer?.firstName, customer?.lastName ?? order?.customer?.lastName]
      .filter(Boolean)
      .join(' ') ||
    'Walk-in';

  const salesPersonName =
    order?.salesPerson?.name ||
    [order?.salesPerson?.firstName, order?.salesPerson?.lastName, order?.salesPerson?.code]
      .filter(Boolean)
      .join(' ') ||
    '—';

  if (loading) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <Loading message="Loading order detail..." size="lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-4"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <HelpCircle className="w-12 h-12" style={{ color: 'var(--color-text-secondary)' }} />
        <div>
          <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {error || 'Order not found'}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Please return to the orders list and choose another order.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="px-4 py-2 rounded"
          style={{
            backgroundColor: 'var(--color-accent-blue)',
            color: 'var(--color-text-light)',
          }}
        >
          Back to orders
        </button>
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
      <div className="flex-1 flex min-h-0">
        {/* Left section - order lines */}
        <div className="flex-1 min-w-0 p-4 pt-0 space-y-4 overflow-y-auto">
          <div className="rounded border p-5 space-y-4" style={{ borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-card)' }}>
            {/* <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                Order reference
              </p>
              <p className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {order.orderNumber || order.id}
              </p>
            </div> */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {[
                { label: 'Order customer name', value: customerName },
                { label: 'Sales person', value: salesPersonName },
                { label: 'Date created', value: formatDate(order.completedAt || order.orderDate) },
                { label: 'Method of payment', value: paymentMethodLabel },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                    {item.label}
                  </p>
                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border overflow-hidden" style={{ borderColor: 'var(--color-border-light)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ color: 'var(--color-text-primary)' }}>
                <thead style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Item Name</th>
                    <th className="text-center px-4 py-2 font-semibold">Quantity</th>
                    <th className="text-right px-4 py-2 font-semibold">Unit Price</th>
                    <th className="text-right px-4 py-2 font-semibold">Discount</th>
                    <th className="text-right px-4 py-2 font-semibold">Custom Disc</th>
                    <th className="text-right px-4 py-2 font-semibold">Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center px-4 py-6" style={{ color: 'var(--color-text-secondary)' }}>
                        No line items recorded for this order.
                      </td>
                    </tr>
                  )}
                  {lineItems.map((item) => (
                    <Fragment key={item.id}>
                      <tr
                        className="border-t cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors"
                        style={{ borderColor: 'var(--color-border-light)' }}
                        onClick={() => toggleLine(item.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {expandedLineId === item.id ? (
                              <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                            ) : (
                              <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                            )}
                            <p className="font-medium">{item.productName || item.variantName || 'Item'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right">
                          {formatDiscountValue(item.lineDiscount, item.lineDiscountPercent)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatDiscountValue(item.customDiscountAmount, item.customDiscountPercent)}
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.lineTotal)}</td>
                      </tr>
                      {expandedLineId === item.id && (
                        <tr>
                          <td colSpan={6} className="px-4 pb-4">
                            <div
                              className="rounded border p-4 text-xs space-y-3"
                              style={{ borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-secondary)' }}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-medium">
                                <span style={{ color: 'var(--color-text-primary)' }}>
                                  {item.productName || item.variantName || 'Item'} {item.sku ? `(${item.sku})` : ''}
                                </span>
                                <span style={{ color: 'var(--color-text-secondary)' }}>
                                  Total: {formatCurrency(item.lineTotal)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <DetailItem label="SKU" value={item.sku || '—'} />
                                <DetailItem label="Variant" value={item.variantName || item.productName || '—'} />
                                <DetailItem 
                                  label="Sales rep" 
                                  value={
                                    item.salesPersonName && item.salesPersonName.trim() 
                                      ? item.salesPersonName 
                                      : (salesPersonName && salesPersonName !== '—' ? salesPersonName : '—')
                                  } 
                                />
                                <DetailItem label="Original price" value={formatCurrency(item.unitPrice)} />
                                <DetailItem
                                  label="Line discount"
                                  value={formatDiscountValue(item.lineDiscount, item.lineDiscountPercent)}
                                />
                                <DetailItem
                                  label="Custom discount"
                                  value={formatDiscountValue(item.customDiscountAmount, item.customDiscountPercent)}
                                />
                                <DetailItem label="Line tax" value={formatCurrency(item.lineTax)} />
                                <DetailItem label="Quantity" value={String(item.quantity)} />
                                <DetailItem label="Notes" value={item.notes || '—'} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
                {/* <tfoot style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <tr>
                    <td className="px-4 py-2 font-semibold">Total Units</td>
                    <td colSpan={5} className="px-4 py-2 text-right">{summary.totalUnits}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-semibold">Subtotal</td>
                    <td colSpan={5} className="px-4 py-2 text-right">{formatCurrency(summary.subtotal)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-semibold">Discount</td>
                    <td colSpan={5} className="px-4 py-2 text-right">-{formatCurrency(summary.discount)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-semibold">Total</td>
                    <td colSpan={5} className="px-4 py-2 text-right">{formatCurrency(summary.total)}</td>
                  </tr>
                </tfoot> */}
              </table>
            </div>
          </div>
        </div>

        {/* Right panel - details */}
        <div className="w-80 rounded flex-shrink-0 border-l" style={{ borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-card)' }}>
          <div className="h-full overflow-y-auto p-4 space-y-4">
            <div>
              <h3
                className="text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Customer details
              </h3>
              <div className="rounded border p-3 space-y-2" style={{ borderColor: 'var(--color-border-light)' }}>
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Name</p>
                  <p className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>{customerName}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Phone</p>
                  <p className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>{customer?.phone || order.customer?.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Email</p>
                  <p className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>{customer?.email || order.customer?.email || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>Address</p>
                  <p className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>{customer?.address || '—'}</p>
                </div>
              </div>
            </div>

            <div>
              <h3
                className="text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Order overview
              </h3>
              <div className="rounded border p-3 space-y-2" style={{ borderColor: 'var(--color-border-light)' }}>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Discount</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>-{formatCurrency(order.discountAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Tax</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(order.taxAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Adjustment</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(order.adjustmentAmount)}</span>
                </div>
                <hr style={{ borderColor: 'var(--color-border-light)' }} />
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span style={{ color: 'var(--color-text-primary)' }}>Total</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(order.totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Paid</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(order.amountPaid)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Change</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(order.changeAmount)}</span>
                </div>
                {resolvedPayments.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase mt-3 tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                      Payments
                    </p>
                    {resolvedPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {payment.paymentMethodName || payment.paymentMethodId || 'Payment'}
                        </span>
                        <span style={{ color: 'var(--color-text-primary)' }}>
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Notes
              </h3>
              <div className="rounded border p-3 min-h-[120px]" style={{ borderColor: 'var(--color-border-light)', color: 'var(--color-text-secondary)' }}>
                {order.notes || order.customerNotes || 'No notes recorded for this order.'}
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}

const DetailItem = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="space-y-1">
    <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
      {label}
    </p>
    <p className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
      {value}
    </p>
  </div>
);

export default OrderDetail;



