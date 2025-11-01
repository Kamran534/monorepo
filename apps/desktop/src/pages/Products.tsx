import React, { useState } from 'react';

export function Products() {
  const [searchQuery, setSearchQuery] = useState('');

  const products = [
    { id: 'B1328', name: 'Brown Leopardprint Sunglasses', price: '$130.00', category: 'Fashion Sunglasses', stock: 24 },
    { id: 'B1333', name: 'Silver Stunner Sunglasses', price: '$150.00', category: 'Fashion Sunglasses', stock: 18 },
    { id: 'B1329', name: 'Black Thick Rimmed Sunglasses', price: '$110.00', category: 'Fashion Sunglasses', stock: 32 },
    { id: 'B1334', name: 'Dark Brown Designer Sunglasses', price: '$130.00', category: 'Fashion Sunglasses', stock: 15 },
    { id: 'B1332', name: 'Black Bold Framed Sunglasses', price: '$140.00', category: 'Fashion Sunglasses', stock: 22 },
    { id: 'B1327', name: 'Black Wireframe Sunglasses', price: '$120.00', category: 'Fashion Sunglasses', stock: 28 },
    { id: 'B1330', name: 'Brown Aviator Sunglasses', price: '$150.00', category: 'Fashion Sunglasses', stock: 19 },
    { id: 'B1331', name: 'Pink Thick Rimmed Sunglasses', price: '$130.00', category: 'Fashion Sunglasses', stock: 26 },
  ];

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-2 text-gray-600">Manage your product inventory</p>
        </div>
        <button className="btn btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="input pl-10"
              />
            </div>
          </div>
          <select className="input sm:w-48">
            <option>All Categories</option>
            <option>Fashion Sunglasses</option>
            <option>Watches</option>
            <option>Handbags</option>
          </select>
          <select className="input sm:w-32">
            <option>All Stock</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th>Product ID</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="table-row">
                  <td className="table-cell font-mono">{product.id}</td>
                  <td className="table-cell font-medium">{product.name}</td>
                  <td className="table-cell text-gray-600">{product.category}</td>
                  <td className="table-cell font-semibold">{product.price}</td>
                  <td className="table-cell">{product.stock} units</td>
                  <td className="table-cell">
                    <span className={`badge ${product.stock > 20 ? 'badge-success' : product.stock > 10 ? 'badge-warning' : 'badge-error'}`}>
                      {product.stock > 20 ? 'In Stock' : product.stock > 10 ? 'Low Stock' : 'Very Low'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="Edit">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded transition-colors" title="Delete">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

