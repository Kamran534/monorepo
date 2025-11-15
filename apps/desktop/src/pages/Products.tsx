import { Products as SharedProducts } from '@monorepo/shared-ui';
import { getDesktopProductRepository } from '../renderer/repositories/DesktopProductRepository.js';

// Get repository instance
const productRepository = getDesktopProductRepository();

export function Products() {
  return <SharedProducts repository={productRepository} />;
}

export default Products;
