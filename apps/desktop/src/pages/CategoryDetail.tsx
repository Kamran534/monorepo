import { useState, useMemo, useEffect } from 'react';
import { useCart, useToast } from '@monorepo/shared-ui';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ProductList,
  ProductTabs,
  ProductActionButtons,
  Product,
  ViewMode,
  SortField,
  SortDirection,
  RatingFilter,
  PriceFilter,
} from '@monorepo/shared-ui';

const VIEW_MODE_STORAGE_KEY = 'category.viewMode';
const ACTION_STATE_STORAGE_KEY = 'category.actionState';

export function CategoryDetail() {
  const { addItem } = useCart();
  const { show } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { categoryName } = useParams<{ categoryName: string }>();
  const navigate = useNavigate();
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  
  // Load view mode from localStorage, default to 'list'
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return (saved === 'list' || saved === 'grid') ? saved : 'list';
  });
  
  // Save view mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);
  const [sortField, setSortField] = useState<SortField>(() => {
    const saved = sessionStorage.getItem(ACTION_STATE_STORAGE_KEY);
    if (saved) {
      try { return (JSON.parse(saved).sortField as SortField) ?? 'none'; } catch { /* noop */ }
    }
    return 'none';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const saved = sessionStorage.getItem(ACTION_STATE_STORAGE_KEY);
    if (saved) {
      try { return (JSON.parse(saved).sortDirection as SortDirection) ?? 'asc'; } catch { /* noop */ }
    }
    return 'asc';
  });
  const [hideDetails, setHideDetails] = useState<boolean>(() => {
    const saved = sessionStorage.getItem(ACTION_STATE_STORAGE_KEY);
    if (saved) {
      try { return Boolean(JSON.parse(saved).hideDetails); } catch { /* noop */ }
    }
    return false;
  });
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>(() => {
    const saved = sessionStorage.getItem(ACTION_STATE_STORAGE_KEY);
    if (saved) {
      try { return (JSON.parse(saved).ratingFilter as RatingFilter) ?? 'all'; } catch { /* noop */ }
    }
    return 'all';
  });
  const [priceFilter, setPriceFilter] = useState<PriceFilter>(() => {
    const saved = sessionStorage.getItem(ACTION_STATE_STORAGE_KEY);
    if (saved) {
      try { return (JSON.parse(saved).priceFilter as PriceFilter) ?? 'all'; } catch { /* noop */ }
    }
    return 'all';
  });

  // Persist action state when any part changes
  useEffect(() => {
    const payload = { sortField, sortDirection, hideDetails, ratingFilter, priceFilter };
    sessionStorage.setItem(ACTION_STATE_STORAGE_KEY, JSON.stringify(payload));
  }, [sortField, sortDirection, hideDetails, ratingFilter, priceFilter]);

  // TODO: Fetch products for this category from API
  // Sample product data matching the image
  const allProducts: Product[] = useMemo(() => [
    { id: '81300', productNumber: '81300', name: 'Brown Leather Travel Bag', price: '$89.99', rating: 3.8, reviewCount: 195, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop' },
    { id: '81328', productNumber: '81328', name: 'Brown Leopardprint Sunglasses', price: '$45.00', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop' },
    { id: '88000', productNumber: '88000', name: 'Jewelry Continuity', price: '$120.00', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop' },
    { id: '81319', productNumber: '81319', name: 'Brown Glove & Scarf Set', price: '$35.99', image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop' },
    { id: '81323', productNumber: '81323', name: 'Grey Cotton Gloves', price: '$28.50', rating: 3.8, reviewCount: 192, image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop' },
    { id: '81302', productNumber: '81302', name: 'Brown Snakeskin Bag', price: '$95.00', rating: 3.8, reviewCount: 192, image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop' },
    { id: '81306', productNumber: '81306', name: 'Orange Leather Bag', price: '$75.00', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop' },
    { id: '81311', productNumber: '81311', name: 'White Leopard Print Bag', price: '$65.00', image: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=400&h=400&fit=crop' },
    { id: '81333', productNumber: '81333', name: 'Silver Stunner Sunglasses', price: '$42.00', rating: 3.7, reviewCount: 192, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
    { id: '82001', productNumber: '82001', name: 'Grey Chronograph Watch', price: '$150.00', rating: 3.9, reviewCount: 189, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop' },
    { id: '81320', productNumber: '81320', name: 'Brown Leather Gloves', price: '$38.00', rating: 3.8, reviewCount: 190, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop' },
    { id: '81304', productNumber: '81304', name: 'Brown Suede Bag', price: '$85.00', rating: 3.8, reviewCount: 187, image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop' },
    { id: '81329', productNumber: '81329', name: 'Black Thick Rimmed Sunglasses', price: '$48.00', rating: 3.8, reviewCount: 193, image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop' },
    { id: '81334', productNumber: '81334', name: 'Dark Brown Designer Sunglasses', price: '$55.00', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop' },
    { id: '81303', productNumber: '81303', name: 'Dark Brown Purse', price: '$45.00', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop' },
    { id: '81313', productNumber: '81313', name: 'Blue Butterfly Class Ring', price: '$220.00', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop' },
    { id: '81316', productNumber: '81316', name: 'Blue Sapphire Ring', price: '$180.00', rating: 3.7, reviewCount: 173, image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop' },
    { id: '81324', productNumber: '81324', name: 'Bronze Pocketwatch', price: '$110.00', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop' },
    { id: '81332', productNumber: '81332', name: 'Black Bold Framed Sunglasses', price: '$52.00', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop' },
    { id: '81301', productNumber: '81301', name: 'Yellow Snakeskin Bag', price: '$78.00', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop' },
    { id: '81305', productNumber: '81305', name: 'Pink Vinyl Bag', price: '$42.00', image: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=400&h=400&fit=crop' },
    { id: '81312', productNumber: '81312', name: 'White Leather Bag', price: '$88.00', rating: 3.8, reviewCount: 193, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop' },
    { id: '81314', productNumber: '81314', name: 'Green Class Ring', price: '$195.00', rating: 3.8, reviewCount: 193, image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop' },
    { id: '81317', productNumber: '81317', name: 'Multicolor Bracelet Set', price: '$125.00', image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop' },
    { id: '81326', productNumber: '81326', name: 'Silver Stopwatch', price: '$135.00', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop' },
    { id: '81321', productNumber: '81321', name: 'Black Cotton Gloves', price: '$32.00', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop' },
  ], []);

  // Helper function to parse price from string (e.g., "$29.99" -> 29.99)
  const parsePrice = (priceStr?: string): number | null => {
    if (!priceStr) return null;
    const cleaned = priceStr.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  // Filter and sort products
  const products = useMemo(() => {
    let filtered = [...allProducts];

    // Apply rating filter
    if (ratingFilter !== 'all') {
      const minRating = parseFloat(ratingFilter.replace('+', ''));
      filtered = filtered.filter(product => {
        if (!product.rating) return false;
        return product.rating >= minRating;
      });
    }

    // Apply price filter
    if (priceFilter !== 'all') {
      filtered = filtered.filter(product => {
        const price = parsePrice(product.price);
        if (price === null) return false;
        
        switch (priceFilter) {
          case 'under50':
            return price < 50;
          case '50-100':
            return price >= 50 && price < 100;
          case '100-200':
            return price >= 100 && price < 200;
          case 'over200':
            return price >= 200;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    if (sortField !== 'none') {
      filtered = filtered.sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'productNumber':
            comparison = a.productNumber.localeCompare(b.productNumber);
            break;
          case 'rating': {
            const aRating = a.rating ?? 0;
            const bRating = b.rating ?? 0;
            comparison = aRating - bRating;
            break;
          }
          default:
            return 0;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [allProducts, sortField, sortDirection, ratingFilter, priceFilter]);

  const handleProductClick = (product: Product) => {
    setSelectedProductId(product.id);
    navigate(`/products/${product.id}`);
  };

  const handleTabChange = (tab: 'products' | 'categories') => {
    if (tab === 'categories') {
      // Navigate back to category page
      navigate('/category');
    }
    // If 'products' tab is clicked, stay on current page (no action needed)
  };

  const handleSortOption = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Breadcrumb and Tabs Section - Sticky */}
      <div className="flex-shrink-0 sticky top-0 z-10" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <ProductTabs activeTab="products" onTabChange={handleTabChange} />
            {/* Action Buttons */}
            <ProductActionButtons
              ratingFilter={ratingFilter}
              priceFilter={priceFilter}
              onRatingFilterChange={setRatingFilter}
              onPriceFilterChange={setPriceFilter}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortOption={handleSortOption}
              hideDetails={hideDetails}
              onHideDetailsChange={setHideDetails}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </div>
      </div>

      {/* Product List Section */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ProductList
          products={products}
          selectedProductId={selectedProductId}
          onProductClick={handleProductClick}
          hideDetails={hideDetails}
          viewMode={viewMode}
          onAddProduct={(product) => {
            const numericPrice = parseFloat((product.price || '0').replace(/[^0-9.]/g, '')) || 0;
            addItem({ name: product.name, price: numericPrice, quantity: 1 });
            show('Added to cart', 'success');
          }}
          className="h-full"
        />
      </div>
    </div>
  );
}
