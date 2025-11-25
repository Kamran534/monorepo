import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard.js';
import { Products } from '../pages/Products.js';
import { Category } from '../pages/Category.js';
import { ProductDetail } from '../pages/ProductDetail.js';
import { Transactions } from '../pages/Transactions.js';
import { Customers } from '../pages/Customers.js';
import { Sales } from '../pages/Sales.js';
import { Payments } from '../pages/Payments.js';
import { Login } from '../pages/Login.js';
import { ReturnTransaction } from '../pages/ReturnTransaction.js';
import { Orders } from '../pages/Orders.js';
import { OrderDetail } from '../pages/OrderDetail.js';

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
      <Route path="/transactions/return" element={<ReturnTransaction />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/payments" element={<Payments />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/orders/:orderId" element={<OrderDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/customers" element={<Customers />} />
      <Route path="/settings" element={null} />
      <Route path="/help" element={null} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

