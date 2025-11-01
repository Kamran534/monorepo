import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { Products } from '../pages/Products';
import { Transactions } from '../pages/Transactions';

/**
 * Application Routes
 * Defines all routes for the web app
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/products" element={<Products />} />
      <Route path="/transactions" element={<Transactions />} />
      <Route path="/customers" element={null} />
      <Route path="/settings" element={null} />
      <Route path="/help" element={null} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

