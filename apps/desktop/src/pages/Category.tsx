import { useNavigate } from 'react-router-dom';
import {
  CategorySection,
  type CategoryCardItem,
} from '@monorepo/shared-ui';

export function Category() {
  const navigate = useNavigate();

  // Handler to navigate to category detail page showing products in that category
  const handleCategoryClick = (categoryName: string) => {
    navigate(`/category/${encodeURIComponent(categoryName)}`);
  };

  // Sample category data - replace with actual data
  const fashionAccessoriesCategories: CategoryCardItem[] = [
    { id: '1', name: 'Fashion Accessories', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Fashion Accessories') },
    { id: '2', name: 'Fashion Sunglasses', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Fashion Sunglasses') },
    { id: '3', name: 'Watches', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Watches') },
    { id: '4', name: 'Gloves & Scarves', image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Gloves & Scarves') },
    { id: '5', name: 'Handbags', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Handbags') },
    { id: '6', name: 'Jewelry', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Jewelry') },
  ];

  const womenswearCategories: CategoryCardItem[] = [
    { id: '7', name: 'Womenswear', image: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Womenswear') },
    { id: '8', name: 'Sweaters', image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Sweaters') },
    { id: '9', name: 'Womens Jeans', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Womens Jeans') },
    { id: '10', name: 'Tops', image: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Tops') },
    { id: '11', name: 'Dresses', image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Dresses') },
    { id: '12', name: 'Womens Shoes', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Womens Shoes') },
    { id: '13', name: 'Coats', image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Coats') },
    { id: '14', name: 'Skirts', image: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Skirts') },
  ];

  const menswearCategories: CategoryCardItem[] = [
    { id: '15', name: 'Menswear', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Menswear') },
    { id: '16', name: 'Casual Shirts', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Casual Shirts') },
    { id: '17', name: 'Pants', image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Pants') },
    { id: '18', name: 'Dress Shirts', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Dress Shirts') },
    { id: '19', name: 'Suits & Sportcoats', image: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Suits & Sportcoats') },
    { id: '20', name: 'Coats & Jackets', image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Coats & Jackets') },
    { id: '21', name: 'Mens Jeans', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Mens Jeans') },
    { id: '22', name: 'Mens Shoes', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop', onClick: () => handleCategoryClick('Mens Shoes') },
  ];

  // const handleBack = () => {
  //   console.log('Back clicked');
  //   // TODO: Navigate back
  // };

  const handleSectionClick = (title: string) => {
    console.log(`Section ${title} clicked`);
    // TODO: Navigate to sub-category
  };

  return (
    <div className="h-full w-full p-8" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Breadcrumb Navigation */}
      {/* <CategoryBreadcrumb
        currentCategory="Fashion Accessories"
        onBack={handleBack}
      /> */}

      {/* Category Sections */}
      <CategorySection
        title="Fashion Accessories"
        categories={fashionAccessoriesCategories}
        onTitleClick={() => handleSectionClick('Fashion Accessories')}
        columns={6}
      />

      <CategorySection
        title="Womenswear"
        categories={womenswearCategories}
        onTitleClick={() => handleSectionClick('Womenswear')}
        columns={6}
      />

      <CategorySection
        title="Menswear"
        categories={menswearCategories}
        onTitleClick={() => handleSectionClick('Menswear')}
        columns={6}
      />
    </div>
  );
}
