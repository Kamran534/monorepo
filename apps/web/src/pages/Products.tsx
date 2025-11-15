import { Products as SharedProducts } from '@monorepo/shared-ui';
import { WebProductRepository } from '../services/repositories';

// Singleton repository instance
const productRepository = new WebProductRepository();

export function Products() {
  return <SharedProducts repository={productRepository} />;
}

export default Products;
