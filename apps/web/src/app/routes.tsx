import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { Products } from '../pages/Products';
import { Category } from '../pages/Category';
import { CategoryDetail } from '../pages/CategoryDetail';
import { ProductDetail } from '../pages/ProductDetail';
import { Transactions } from '../pages/Transactions';
import { Login } from '../pages/Login';

/**
 * Application Routes
 * Defines all routes for the web app
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:productId" element={<ProductDetail />} />
      <Route path="/category" element={<Category />} />
      <Route path="/category/:categoryName" element={<CategoryDetail />} />
      <Route path="/transactions" element={<Transactions />} />
      <Route path="/login" element={<Login />} />
      <Route path="/customers" element={null} />
      <Route path="/settings" element={null} />
      <Route path="/help" element={null} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

