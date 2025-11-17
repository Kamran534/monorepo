import { ProductDetail as SharedProductDetail } from '@monorepo/shared-ui';
import { WebProductRepository } from '../services/repositories';

// Singleton repository instance
const productRepository = new WebProductRepository();

export function ProductDetail() {
  return <SharedProductDetail repository={productRepository} />;
}

export default ProductDetail;
