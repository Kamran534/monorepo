import { Category as SharedCategory } from '@monorepo/shared-ui';
import { getDesktopCategoryRepository } from '../renderer/repositories/DesktopCategoryRepository.js';

// Get repository instance
const categoryRepository = getDesktopCategoryRepository();

export function Category() {
  return (
    <SharedCategory
      repository={categoryRepository}
      getConnectionState={async () => {
        const connectionState = await window.electronAPI.connection.getState();
        return { dataSource: connectionState.dataSource };
      }}
    />
  );
}

export default Category;
