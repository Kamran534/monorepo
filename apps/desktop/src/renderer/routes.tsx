import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard.js';
import { Products } from '../pages/Products.js';
import { Category } from '../pages/Category.js';
import { ProductDetail } from '../pages/ProductDetail.js';
import { Transactions } from '../pages/Transactions.js';
import { Login } from '../pages/Login.js';

/**
 * Application Routes
 * Defines all routes for the desktop app
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:productId" element={<ProductDetail />} />
      <Route path="/category" element={<Category />} />
      <Route path="/category/:categoryName" element={<Products />} />
      <Route path="/transactions" element={<Transactions />} />
      <Route path="/login" element={<Login />} />
      <Route path="/customers" element={null} />
      <Route path="/settings" element={null} />
      <Route path="/help" element={null} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

