import type { LocalDbClient } from '@monorepo/shared-data-access';
import { dataAccessService } from './data-access.service';

export interface BarcodeLookupResult {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  availableQuantity: number;
  barcode?: string;
}

const WEB_CLIENT_NAME = 'WebIndexedDbClient';
type IndexedRecord = Record<string, unknown>;

export async function lookupProductByBarcode(barcode: string): Promise<BarcodeLookupResult | null> {
  const normalized = barcode?.trim();
  if (!normalized) {
    return null;
  }

  try {
    const localDb = dataAccessService.getLocalDb();
    const clientName = getClientName(localDb);

    if (clientName === WEB_CLIENT_NAME) {
      return await lookupInIndexedDb(localDb, normalized);
    }

    return await lookupInSqlite(localDb, normalized);
  } catch (error) {
    console.error('[BarcodeLookup:web] Failed to lookup barcode', normalized, error);
    return null;
  }
}

function getClientName(client: LocalDbClient): string {
  return (client as unknown as { constructor?: { name?: string } })?.constructor?.name ?? '';
}

async function lookupInSqlite(db: LocalDbClient, barcode: string): Promise<BarcodeLookupResult | null> {
  const baseQuery = `
    SELECT 
      pv.id               AS variantId,
      pv.productId        AS productId,
      pv.barcode          AS variantBarcode,
      pv.variantName      AS variantName,
      pv.retailPrice      AS retailPrice,
      pv.price            AS variantPrice,
      p.name              AS productName,
      COALESCE(MAX(ii.quantityAvailable), MAX(ii.quantityOnHand), 0) AS availableQuantity
    FROM ProductVariant pv
    LEFT JOIN Product p ON p.id = pv.productId
    LEFT JOIN InventoryItem ii ON ii.variantId = pv.id
    WHERE pv.barcode = ?
    GROUP BY pv.id, pv.productId, pv.variantName, pv.retailPrice, pv.price, p.name
    LIMIT 1`;

  let rows = await safeQuery(db, baseQuery, [barcode]);

  if (!rows.length) {
    const fallbackQuery = `
      SELECT 
        pv.id               AS variantId,
        pv.productId        AS productId,
        pv.barcode          AS variantBarcode,
        pv.variantName      AS variantName,
        pv.retailPrice      AS retailPrice,
        pv.price            AS variantPrice,
        p.name              AS productName,
        COALESCE(MAX(ii.quantityAvailable), MAX(ii.quantityOnHand), 0) AS availableQuantity
      FROM Barcode b
      INNER JOIN ProductVariant pv ON pv.id = b.variantId
      LEFT JOIN Product p ON p.id = pv.productId
      LEFT JOIN InventoryItem ii ON ii.variantId = pv.id
      WHERE b.barcodeValue = ?
      GROUP BY pv.id, pv.productId, pv.variantName, pv.retailPrice, pv.price, p.name
      LIMIT 1`;

    rows = await safeQuery(db, fallbackQuery, [barcode]);
  }

  if (!rows.length) {
    return null;
  }

  const row = rows[0] as Record<string, unknown>;
  const price = extractPrice([
    row.retailPrice,
    row.variantPrice,
  ]);

  const availableQuantity = toNumber(row.availableQuantity);

  return {
    productId: String(row.productId ?? ''),
    variantId: String(row.variantId ?? ''),
    name: (row.productName as string) || (row.variantName as string) || 'Scanned item',
    price,
    availableQuantity,
    barcode: (row.variantBarcode as string) || barcode,
  };
}

async function lookupInIndexedDb(db: LocalDbClient, barcode: string): Promise<BarcodeLookupResult | null> {
  const variant = await findVariantRecord(db, barcode);
  if (!variant) {
    return null;
  }

  const variantId = String(
    pickValue<string>(variant, 'id', 'variantId', 'variant_id') ?? ''
  );
  const productId = String(
    pickValue<string>(variant, 'product_id', 'productId') ?? ''
  );

  const [product] = await safeQuery(db, 'products', [{ id: productId }]);
  const [inventory] = await safeQuery(db, 'inventory', [{ variant_id: variantId }]);

  const name =
    pickValue<string>(product, 'name') ??
    pickValue<string>(variant, 'variantName', 'name') ??
    'Scanned item';
  const price = extractPrice([
    pickValue<string | number>(variant, 'retailPrice'),
    pickValue<string | number>(variant, 'price'),
    pickValue<string | number>(variant, 'basePrice'),
    pickValue<string | number>(product, 'basePrice'),
  ]);
  const availableQuantity = toNumber(
    pickValue<string | number>(
      inventory,
      'quantityAvailable',
      'quantity_available',
      'quantityOnHand',
      'quantity_on_hand'
    )
  );

  return {
    productId: productId || variantId,
    variantId,
    name,
    price,
    availableQuantity,
    barcode: pickValue<string>(variant, 'barcode') ?? barcode,
  };
}

async function findVariantRecord(db: LocalDbClient, barcode: string): Promise<IndexedRecord | null> {
  const directMatches = await safeQuery(db, 'product_variants', [{ barcode }]);
  if (directMatches.length) {
    return directMatches[0];
  }

  let variantId: string | undefined;
  const barcodeStores = ['barcode', 'barcodes', 'Barcode'];

  for (const store of barcodeStores) {
    const records = await safeQuery(db, store, [{ barcodeValue: barcode }]);
    if (!records.length) {
      continue;
    }

    const candidate = pickValue<string | number>(
      records[0],
      'variant_id',
      'variantId',
      'variantID'
    );

    if (candidate !== undefined && candidate !== null && candidate !== '') {
      variantId = String(candidate);
      break;
    }
  }

  if (!variantId) {
    return null;
  }

  const variants = await safeQuery(db, 'product_variants', [{ id: variantId }]);
  return variants[0] ?? null;
}

async function safeQuery<T extends IndexedRecord = IndexedRecord>(db: LocalDbClient, sql: string, params?: unknown[]): Promise<T[]> {
  try {
    return await db.query<T>(sql, params);
  } catch (error) {
    console.warn('[BarcodeLookup:web] Query failed', { sqlSnippet: sql.slice(0, 48), error });
    return [];
  }
}

function extractPrice(candidates: Array<unknown>): number {
  for (const candidate of candidates) {
    const price = toNumber(candidate);
    if (!Number.isNaN(price) && price > 0) {
      return price;
    }
  }
  return 0;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function pickValue<T = unknown>(
  record: IndexedRecord | undefined,
  ...keys: string[]
): T | undefined {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    if (key in record) {
      return record[key] as T;
    }
  }

  return undefined;
}

