import React, { useState, useMemo, useCallback } from 'react';
import { Search, Square, Printer, HelpCircle } from 'lucide-react';
import { ReturnableProductsTable } from '../components/transactions/ReturnableProductsTable.js';
import { ReturnDetailsPanel } from '../components/transactions/ReturnDetailsPanel.js';
import type { ReturnableProduct } from '../components/transactions/ReturnableProductsTable.js';

export interface ReturnTransactionProps {
  originalOrderId?: string;
  onBack?: () => void;
}

/**
 * ReturnTransaction Page
 * 
 * Page for processing return transactions. Shows returnable products
 * on the left and selected product details on the right.
 */
export function ReturnTransaction({ originalOrderId, onBack }: ReturnTransactionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  const [returningQuantities, setReturningQuantities] = useState<Record<string, number>>({});

  // Mock data - In a real app, this would come from the original order
  const baseReturnableProducts: ReturnableProduct[] = useMemo(() => {
    // Example data matching the image
    return [
      {
        id: '1',
        productNumber: 'P-PB-0100010',
        productName: 'P-PB-0100010',
        sold: 1,
        uom: 'PCS',
        previous: 0,
        available: 1.0,
        returning: 1.0,
        unitPrice: 20.0,
        total: 20.0,
        variant: 'RED, ME',
        sku: '3264',
        barcode: 'PPB0100010059ME',
        imageUrl: undefined, // Can be set to actual image URL
      },
      // Add more products as needed
    ];
  }, [originalOrderId]);

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
          />
        </div>
      </div>
    </div>
  );
}

export default ReturnTransaction;

