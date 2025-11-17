export interface BarcodeLookupResult {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  availableQuantity: number;
  barcode?: string;
}

type LookupResponse =
  | {
      success: true;
      product: BarcodeLookupResult;
    }
  | {
      success: false;
      error?: string;
    };

export async function lookupProductByBarcode(barcode: string): Promise<BarcodeLookupResult | null> {
  const normalized = barcode?.trim();
  if (!normalized || typeof window === 'undefined') {
    return null;
  }

  try {
    const lookup = window.electronAPI?.product?.lookupByBarcode;
    if (!lookup) {
      console.warn('[BarcodeLookup:desktop] lookupByBarcode API is not available.');
      return null;
    }

    const response = (await lookup(normalized)) as LookupResponse | null;

    if (!response || response.success !== true) {
      if (response && 'error' in response && response.error) {
        console.warn('[BarcodeLookup:desktop] Lookup failed:', response.error);
      }
      return null;
    }

    return response.product;
  } catch (error) {
    console.error('[BarcodeLookup:desktop] Error while looking up barcode', normalized, error);
    return null;
  }
}

