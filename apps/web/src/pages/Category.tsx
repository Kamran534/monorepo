import { Category as SharedCategory } from '@monorepo/shared-ui';
import { WebCategoryRepository } from '../services/repositories';
import { dataAccessService } from '../services/data-access.service';

// Singleton repository instance
const categoryRepository = new WebCategoryRepository();

export function Category() {
  return (
    <SharedCategory
      repository={categoryRepository}
      getConnectionState={() => dataAccessService.getConnectionState()}
    />
  );
}

export default Category;
