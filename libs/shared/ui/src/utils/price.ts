export function parsePriceValue(price?: string | number | null): number | null {
  if (typeof price === 'number') {
    return Number.isNaN(price) ? null : price;
  }

  if (typeof price === 'string') {
    const cleaned = parseFloat(price.replace(/[^0-9.-]/g, ''));
    return Number.isNaN(cleaned) ? null : cleaned;
  }

  return null;
}

