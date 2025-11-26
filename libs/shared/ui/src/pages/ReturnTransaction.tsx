import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Square, Printer, HelpCircle } from 'lucide-react';
import { ReturnableProductsTable } from '../components/transactions/ReturnableProductsTable.js';
import { ReturnDetailsPanel } from '../components/transactions/ReturnDetailsPanel.js';
import type { ReturnableProduct } from '../components/transactions/ReturnableProductsTable.js';
import { useCart, useToast } from '@monorepo/shared-ui';

export interface ReturnTransactionProps {
  originalOrderId?: string;
  onBack?: () => void;
}

interface ReturnItemData {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sku?: string;
  variantId?: string;
  // Line-level details
  lineDiscount?: number;
  lineDiscountPercent?: number;
  lineTax?: number;
  color?: string;
  size?: string;
  customDiscountAmount?: number;
  customDiscountPercent?: number;
  salesPersonName?: string;
  salesPersonId?: string;
  originalPrice?: number;
}

interface LocationState {
  returnItems?: ReturnItemData[];
  originalOrderId?: string;
}

/**
 * ReturnTransaction Page
 *
 * Page for processing return transactions. Shows returnable products
 * on the left and selected product details on the right.
 */
export function ReturnTransaction({ originalOrderId, onBack }: ReturnTransactionProps) {
  const { items: cartItems, updateItem } = useCart();
  const { show } = useToast();
  const location = useLocation();
  const navigationState = location.state as LocationState | null;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  const [returningQuantities, setReturningQuantities] = useState<Record<string, number>>({});

  // Get return items from navigation state or use empty array
  const baseReturnableProducts: ReturnableProduct[] = useMemo(() => {
    if (navigationState?.returnItems && navigationState.returnItems.length > 0) {
      // Convert navigation state items to returnable products
      return navigationState.returnItems.map((item, index) => ({
        id: item.id || String(index + 1),
        productNumber: item.sku || item.productId || 'N/A',
        productName: item.productName || 'Unknown Product',
        sold: item.quantity,
        uom: 'PCS',
        previous: 0,
        available: item.quantity,
        returning: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        variant: item.color && item.size ? `${item.color}, ${item.size}` : item.color || item.size,
        sku: item.sku,
        barcode: item.sku,
        imageUrl: undefined,
        // Line-level details
        lineDiscount: item.lineDiscount,
        lineDiscountPercent: item.lineDiscountPercent,
        lineTax: item.lineTax,
        customDiscountAmount: item.customDiscountAmount,
        customDiscountPercent: item.customDiscountPercent,
        color: item.color,
        size: item.size,
        salesPersonName: item.salesPersonName,
        salesPersonId: item.salesPersonId,
        originalPrice: item.originalPrice,
      }));
    }

    // If no items passed, return empty array
    return [];
  }, [navigationState]);

  // Merge returning quantities with base products
  const returnableProducts: ReturnableProduct[] = useMemo(() => {
    return baseReturnableProducts.map((product) => {
      const updatedReturning = returningQuantities[product.id];
      if (updatedReturning !== undefined) {
        return {
          ...product,
          returning: updatedReturning,
          total: product.unitPrice * updatedReturning,
        };
      }
      return product;
    });
  }, [baseReturnableProducts, returningQuantities]);

  // Automatically select the first product when the page opens
  useEffect(() => {
    if (!selectedProductId && baseReturnableProducts.length > 0) {
      const firstProduct = baseReturnableProducts[0];
      setSelectedProductId(firstProduct.id);

      // Initialize returning quantity for the first product if not already set
      setReturningQuantities((prev) => ({
        ...prev,
        [firstProduct.id]: prev[firstProduct.id] ?? firstProduct.returning,
      }));
    }
  }, [selectedProductId, baseReturnableProducts, setReturningQuantities]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return returnableProducts.find((p) => p.id === selectedProductId) || null;
  }, [selectedProductId, returnableProducts]);

  const returningQuantity = useMemo(() => {
    if (!selectedProductId) return 0;
    return returningQuantities[selectedProductId] ?? selectedProduct?.returning ?? 0;
  }, [selectedProductId, returningQuantities, selectedProduct]);

  const handleProductSelect = useCallback((productId: string) => {
    setSelectedProductId(productId);
    // Initialize returning quantity if not set
    if (!returningQuantities[productId]) {
      const product = returnableProducts.find((p) => p.id === productId);
      if (product) {
        setReturningQuantities((prev) => ({
          ...prev,
          [productId]: product.returning,
        }));
      }
    }
  }, [returnableProducts, returningQuantities]);

  const handleReturningQuantityChange = useCallback((quantity: number) => {
    if (!selectedProductId) return;
    const product = baseReturnableProducts.find((p) => p.id === selectedProductId);
    if (product) {
      const clampedQuantity = Math.max(0, Math.min(quantity, product.available));
      setReturningQuantities((prev) => ({
        ...prev,
        [selectedProductId]: clampedQuantity,
      }));
    }
  }, [selectedProductId, baseReturnableProducts]);

  const handleAddToCart = useCallback(() => {
    if (!selectedProduct || returningQuantity <= 0) {
      show('Please select a product and set a returning quantity', 'error');
      return;
    }

    const existingLine =
      cartItems.find(
        (line) =>
          line.id === selectedProduct.id ||
          line.productId === selectedProduct.productNumber ||
          line.productVariantId === selectedProduct.productNumber
      ) ?? cartItems.find((line) => line.id === selectedProduct.productNumber);

    if (!existingLine) {
      show('Unable to locate this item in the transaction. Please recall the order again.', 'error');
      return;
    }

    const currentQty = Number(existingLine.quantity) || 0;
    if (currentQty <= 0) {
      show('This line has no remaining quantity to return.', 'error');
      return;
    }

    const returnQty = Math.min(returningQuantity, currentQty);
    if (returnQty <= 0) {
      show('Return quantity must be greater than zero.', 'error');
      return;
    }

    if (returnQty >= currentQty) {
      updateItem(existingLine.id, {
        isReturn: true,
      });
      show(`Marked ${selectedProduct.productName || 'item'} as fully returned.`, 'success');
    } else {
      updateItem(existingLine.id, {
        quantity: currentQty - returnQty,
        isReturn: false,
      });
      show(
        `Updated ${selectedProduct.productName || 'item'} quantity to ${currentQty - returnQty}.`,
        'success'
      );
    }

    setSelectedProductId(undefined);
    setReturningQuantities((prev) => {
      const updated = { ...prev };
      delete updated[selectedProduct.id];
      return updated;
    });
  }, [cartItems, selectedProduct, returningQuantity, updateItem, show]);

  // Show message if no items available for return
  if (baseReturnableProducts.length === 0) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          height: 'calc(100vh - var(--navbar-height, 80px))',
        }}
      >
        <div className="text-center p-8">
          <HelpCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-text-secondary)' }} />
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            No Items for Return
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Please select an item from a recalled order to return.
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 px-6 py-2 rounded font-medium"
              style={{
                backgroundColor: 'var(--color-accent-blue)',
                color: 'white',
              }}
            >
              Go Back
            </button>
          )}
        </div>
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
        {/* Left Panel - Returnable Products */}
        <div className="flex-1 min-w-0 border-r" style={{ borderColor: 'var(--color-border-light)' }}>
          <ReturnableProductsTable
            products={returnableProducts}
            selectedProductId={selectedProductId}
            onProductSelect={handleProductSelect}
            onReturningQuantityChange={(productId, quantity) => {
              setSelectedProductId(productId);
              handleReturningQuantityChange(quantity);
            }}
            searchQuery={searchQuery}
          />
        </div>

        {/* Right Panel - Details */}
        <div className="w-80 flex-shrink-0">
          <ReturnDetailsPanel
            selectedProduct={selectedProduct}
            returningQuantity={returningQuantity}
            onReturningQuantityChange={handleReturningQuantityChange}
            onAddToCart={handleAddToCart}
          />
        </div>
      </div>
    </div>
  );
}

export default ReturnTransaction;

