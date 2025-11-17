import { Transactions as SharedTransactions } from '@monorepo/shared-ui';
import { getDesktopProductRepository } from '../renderer/repositories/DesktopProductRepository.js';

const productRepository = getDesktopProductRepository();

export function Transactions() {
  return <SharedTransactions productRepository={productRepository} />;
}

export default Transactions;
