import { ProductDetail as SharedProductDetail } from '@monorepo/shared-ui';
import { getDesktopProductRepository } from '../renderer/repositories/DesktopProductRepository.js';

// Get repository instance
const productRepository = getDesktopProductRepository();

export function ProductDetail() {
  return <SharedProductDetail repository={productRepository} />;
}

export default ProductDetail;
