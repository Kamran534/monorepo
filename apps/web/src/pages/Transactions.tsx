import { Transactions as SharedTransactions } from '@monorepo/shared-ui';
import { WebProductRepository } from '../services/repositories';

const productRepository = new WebProductRepository();

export function Transactions() {
  return <SharedTransactions productRepository={productRepository} />;
}

export default Transactions;
